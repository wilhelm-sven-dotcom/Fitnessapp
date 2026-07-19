"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTraining } from "@/components/providers/TrainingProvider";
import {
  control,
  currentlyPlaying,
  refreshAuth,
  type NowPlaying,
  type SpotifyAction,
} from "@/lib/spotify";

const POLL_MS = 8000;

/**
 * Reusable Spotify access-token source: refreshes + persists the rotated token
 * on demand and reports whether a connection exists at all. Shared by useSpotify
 * (widget polling) and useSpotifyResume (targeted one-off checks). Inert unless
 * Spotify is configured AND connected — never throws.
 */
export function useSpotifyToken(): {
  connected: boolean;
  validToken: () => Promise<string | null>;
} {
  const { spotify } = useTraining();
  const clientId = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID;
  const connected = spotify.configured && !!spotify.auth;

  // Keep the latest auth + persist callback in refs so consumers' effects need
  // not re-subscribe on every token rotation.
  const authRef = useRef(spotify.auth);
  authRef.current = spotify.auth;
  const connectRef = useRef(spotify.connect);
  connectRef.current = spotify.connect;

  const validToken = useCallback(async (): Promise<string | null> => {
    const auth = authRef.current;
    if (!auth || !clientId) return null;
    if (Date.now() / 1000 < auth.expiresAt - 60) return auth.accessToken;
    const fresh = await refreshAuth(clientId, auth.refreshToken);
    if (!fresh) return null;
    await connectRef.current(fresh); // persist rotated token
    return fresh.accessToken;
  }, [clientId]);

  return { connected, validToken };
}

/**
 * Live Spotify state for the workout widget: polls the currently-playing track
 * (refreshing the access token as needed and persisting the rotated token) and
 * exposes playback controls. Everything is best-effort — a free account or no
 * active device simply yields `controlBlocked`, never a throw. Inert unless
 * Spotify is configured AND connected.
 */
export function useSpotify() {
  const { connected, validToken } = useSpotifyToken();

  const [now, setNow] = useState<NowPlaying | null>(null);
  const [controlBlocked, setControlBlocked] = useState(false);

  useEffect(() => {
    if (!connected) {
      setNow(null);
      return;
    }
    let alive = true;
    const tick = async () => {
      const token = await validToken();
      if (!token || !alive) return;
      const np = await currentlyPlaying(token);
      if (alive) setNow(np);
    };
    void tick();
    const id = window.setInterval(() => void tick(), POLL_MS);
    const onVis = () => {
      if (document.visibilityState === "visible") void tick();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      alive = false;
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [connected, validToken]);

  const run = useCallback(
    async (action: SpotifyAction) => {
      const token = await validToken();
      if (!token) return;
      const okr = await control(token, action);
      setControlBlocked(!okr); // 403/404 → likely no Premium / no active device
      if (okr) {
        // Reflect the new state shortly after the command lands.
        window.setTimeout(() => {
          void (async () => {
            const t = await validToken();
            if (t) setNow(await currentlyPlaying(t));
          })();
        }, 350);
      }
    },
    [validToken],
  );

  return {
    connected,
    now,
    controlBlocked,
    play: () => void run("play"),
    pause: () => void run("pause"),
    next: () => void run("next"),
    prev: () => void run("previous"),
  };
}
