import {
  STRAVA_API,
  STRAVA_TOKEN_URL,
  normalizeActivity,
  type RawStravaActivity,
} from "@/lib/strava";
import type { CardioSession } from "@/lib/types";

// Needs the Node runtime to read the server-only client secret.
export const runtime = "nodejs";

interface Creds {
  clientId: string;
  clientSecret: string;
}

interface Tokens {
  accessToken: string;
  refreshToken: string;
  /** Unix seconds. */
  expiresAt: number;
  athleteName?: string;
}

interface Body {
  action?: "exchange" | "sync";
  code?: string;
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: number;
}

function creds(): Creds | null {
  const clientId = process.env.NEXT_PUBLIC_STRAVA_CLIENT_ID;
  const clientSecret = process.env.STRAVA_CLIENT_SECRET;
  return clientId && clientSecret ? { clientId, clientSecret } : null;
}

/** Exchange an authorization code for the first token pair (+ athlete name). */
async function exchangeCode(
  code: string,
  c: Creds,
): Promise<{ ok: true; tokens: Tokens } | { ok: false; error: string }> {
  const res = await fetch(STRAVA_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: c.clientId,
      client_secret: c.clientSecret,
      code,
      grant_type: "authorization_code",
    }),
  });
  if (!res.ok)
    return { ok: false, error: `Strava-Login fehlgeschlagen (${res.status}).` };
  const d = (await res.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_at?: number;
    athlete?: { firstname?: string; lastname?: string };
  };
  if (!d.access_token || !d.refresh_token)
    return { ok: false, error: "Unerwartete Antwort von Strava." };
  const athleteName =
    [d.athlete?.firstname, d.athlete?.lastname].filter(Boolean).join(" ") || undefined;
  return {
    ok: true,
    tokens: {
      accessToken: d.access_token,
      refreshToken: d.refresh_token,
      expiresAt: d.expires_at ?? 0,
      athleteName,
    },
  };
}

/** Refresh an expired access token. Strava may rotate the refresh token. */
async function refreshTokens(
  refreshToken: string,
  c: Creds,
): Promise<{ ok: true; tokens: Tokens } | { ok: false; error: string }> {
  const res = await fetch(STRAVA_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: c.clientId,
      client_secret: c.clientSecret,
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });
  if (!res.ok)
    return { ok: false, error: `Strava-Sitzung abgelaufen (${res.status}).` };
  const d = (await res.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_at?: number;
  };
  if (!d.access_token || !d.refresh_token)
    return { ok: false, error: "Unerwartete Antwort von Strava." };
  return {
    ok: true,
    tokens: {
      accessToken: d.access_token,
      refreshToken: d.refresh_token,
      expiresAt: d.expires_at ?? 0,
    },
  };
}

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return Response.json({ ok: false, error: "bad request" }, { status: 400 });
  }

  const c = creds();
  if (!c) return Response.json({ ok: false, error: "Strava ist nicht eingerichtet." });

  try {
    if (body.action === "exchange") {
      if (!body.code) return Response.json({ ok: false, error: "Kein Code." });
      const r = await exchangeCode(body.code, c);
      if (!r.ok) return Response.json({ ok: false, error: r.error });
      return Response.json({ ok: true, tokens: r.tokens });
    }

    if (body.action === "sync") {
      if (!body.refreshToken)
        return Response.json({ ok: false, error: "Nicht verbunden." });

      let accessToken = body.accessToken;
      let refreshed: Tokens | undefined;
      const expired = !accessToken || Date.now() / 1000 > (body.expiresAt ?? 0) - 120;
      if (expired) {
        const r = await refreshTokens(body.refreshToken, c);
        if (!r.ok) return Response.json({ ok: false, reauth: true, error: r.error });
        refreshed = r.tokens;
        accessToken = r.tokens.accessToken;
      }

      const res = await fetch(`${STRAVA_API}/athlete/activities?per_page=30&page=1`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (res.status === 401)
        return Response.json({
          ok: false,
          reauth: true,
          error: "Strava-Zugriff abgelaufen — bitte neu verbinden.",
        });
      if (!res.ok)
        return Response.json({ ok: false, error: `Strava-Fehler (${res.status}).` });

      const data = (await res.json()) as RawStravaActivity[];
      const raw = Array.isArray(data) ? data : [];
      let rides = raw
        .map(normalizeActivity)
        .filter((r): r is CardioSession => r !== null);

      // The summary list carries no `calories` (only kilojoules). Pull real
      // calories from the per-activity detail endpoint for the most recent
      // activities — best-effort and capped, so a sync stays well within
      // Strava's rate limits (100 req / 15 min).
      const recent = raw.filter((a) => a.id != null).slice(0, 12);
      const details = await Promise.allSettled(
        recent.map((a) =>
          fetch(`${STRAVA_API}/activities/${a.id}`, {
            headers: { Authorization: `Bearer ${accessToken}` },
          }).then((r) => (r.ok ? (r.json() as Promise<RawStravaActivity>) : null)),
        ),
      );
      const calById = new Map<string, number>();
      details.forEach((d, i) => {
        const cal = d.status === "fulfilled" && d.value ? d.value.calories : undefined;
        if (typeof cal === "number") calById.set(`strava-${recent[i].id}`, Math.round(cal));
      });
      rides = rides.map((r) => (calById.has(r.id) ? { ...r, calories: calById.get(r.id) } : r));

      return Response.json({ ok: true, rides, tokens: refreshed });
    }

    return Response.json({ ok: false, error: "unknown action" }, { status: 400 });
  } catch (e) {
    return Response.json({
      ok: false,
      error: e instanceof Error ? e.message : "Netzwerkfehler",
    });
  }
}
