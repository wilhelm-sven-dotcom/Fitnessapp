/**
 * Spotify Web API via OAuth Authorization Code + PKCE — no server secret needed
 * (ideal for a PWA public client). All network calls are defensive and never
 * throw; on any error they resolve to null/false so the UI degrades quietly.
 * Playback control (play/pause/skip) needs Spotify Premium + an active device;
 * reading the currently-playing track works on free accounts too.
 */
export const SPOTIFY_AUTHORIZE = "https://accounts.spotify.com/authorize";
export const SPOTIFY_TOKEN = "https://accounts.spotify.com/api/token";
export const SPOTIFY_API = "https://api.spotify.com/v1";
export const SPOTIFY_SCOPES =
  "user-read-currently-playing user-read-playback-state user-modify-playback-state";

export interface SpotifyAuth {
  accessToken: string;
  refreshToken: string;
  /** Unix seconds when the access token expires. */
  expiresAt: number;
  displayName?: string;
}

export interface NowPlaying {
  isPlaying: boolean;
  title: string;
  artist: string;
  artUrl?: string;
}

export type SpotifyAction = "play" | "pause" | "next" | "previous";

function base64url(bytes: ArrayBuffer): string {
  let s = "";
  const arr = new Uint8Array(bytes);
  for (let i = 0; i < arr.length; i++) s += String.fromCharCode(arr[i]);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** PKCE code verifier — a URL-safe random string (43–128 chars). */
export function randomVerifier(): string {
  const arr = new Uint8Array(64);
  crypto.getRandomValues(arr);
  return base64url(arr.buffer).slice(0, 96);
}

/** PKCE code challenge = base64url(SHA-256(verifier)). */
export async function challengeFor(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
  return base64url(digest);
}

export function authorizeUrl(
  clientId: string,
  redirectUri: string,
  challenge: string,
  state: string,
): string {
  const p = new URLSearchParams({
    client_id: clientId,
    response_type: "code",
    redirect_uri: redirectUri,
    code_challenge_method: "S256",
    code_challenge: challenge,
    scope: SPOTIFY_SCOPES,
    state,
  });
  return `${SPOTIFY_AUTHORIZE}?${p.toString()}`;
}

export async function exchangeCode(
  clientId: string,
  code: string,
  verifier: string,
  redirectUri: string,
): Promise<SpotifyAuth | null> {
  try {
    const res = await fetch(SPOTIFY_TOKEN, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
        code_verifier: verifier,
      }),
    });
    if (!res.ok) return null;
    const d = (await res.json()) as {
      access_token?: string;
      refresh_token?: string;
      expires_in?: number;
    };
    if (!d.access_token || !d.refresh_token) return null;
    return {
      accessToken: d.access_token,
      refreshToken: d.refresh_token,
      expiresAt: Math.floor(Date.now() / 1000) + (d.expires_in ?? 3600),
    };
  } catch {
    return null;
  }
}

export async function refreshAuth(
  clientId: string,
  refreshToken: string,
): Promise<SpotifyAuth | null> {
  try {
    const res = await fetch(SPOTIFY_TOKEN, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        grant_type: "refresh_token",
        refresh_token: refreshToken,
      }),
    });
    if (!res.ok) return null;
    const d = (await res.json()) as {
      access_token?: string;
      refresh_token?: string;
      expires_in?: number;
    };
    if (!d.access_token) return null;
    return {
      accessToken: d.access_token,
      // Spotify may omit a fresh refresh token — keep the existing one then.
      refreshToken: d.refresh_token ?? refreshToken,
      expiresAt: Math.floor(Date.now() / 1000) + (d.expires_in ?? 3600),
    };
  } catch {
    return null;
  }
}

export async function currentlyPlaying(token: string): Promise<NowPlaying | null> {
  try {
    const res = await fetch(`${SPOTIFY_API}/me/player/currently-playing`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.status === 204 || res.status === 202) return null; // nothing playing
    if (!res.ok) return null;
    const d = (await res.json()) as {
      is_playing?: boolean;
      item?: {
        name?: string;
        artists?: { name?: string }[];
        album?: { images?: { url?: string }[] };
      };
    };
    const item = d?.item;
    if (!item) return null;
    const imgs = item.album?.images ?? [];
    return {
      isPlaying: !!d.is_playing,
      title: item.name ?? "",
      artist: (item.artists ?? []).map((a) => a.name).filter(Boolean).join(", "),
      artUrl: imgs.length ? imgs[imgs.length - 1]?.url : undefined,
    };
  } catch {
    return null;
  }
}

/** Returns false on failure (e.g. no Premium / no active device — HTTP 403/404). */
export async function control(token: string, action: SpotifyAction): Promise<boolean> {
  try {
    const method = action === "next" || action === "previous" ? "POST" : "PUT";
    const res = await fetch(`${SPOTIFY_API}/me/player/${action}`, {
      method,
      headers: { Authorization: `Bearer ${token}` },
    });
    return res.ok || res.status === 204;
  } catch {
    return false;
  }
}
