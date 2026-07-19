"use client";

import { useEffect, useRef, useState } from "react";
import { useSpotifyToken } from "@/components/spotify/useSpotify";
import { control, currentlyPlaying } from "@/lib/spotify";

/**
 * „Intelligentes" Fortsetzen von Spotify rund um ein Anleitungsvideo. Sobald der
 * Nutzer im YouTube-Player entstummt, übernimmt iOS die Audio-Session und
 * pausiert Spotify; beim Schließen wird der iframe zerstört, aber nichts setzt
 * die Musik fort. Dieser Hook merkt sich beim Öffnen, ob Musik lief, und startet
 * sie beim Schließen — nach kurzer Verzögerung (iOS gibt die Session des
 * entladenen iframes erst nach einem Moment frei) — per Spotify-Web-API wieder.
 *
 * Braucht Spotify Premium + ein aktives Gerät. Klappt das nicht (Free-Account /
 * kein Gerät), meldet der Hook `notice === "blocked"` für einen dezenten Hinweis.
 * Erfolg bleibt bewusst still. Ohne Spotify-Verbindung komplett inert; wirft nie.
 *
 * `active` = das (YouTube-)Video ist offen. Der Übergang true→false löst den
 * Resume-Versuch aus.
 */
export function useSpotifyResume(active: boolean): {
  notice: "blocked" | null;
  dismiss: () => void;
} {
  const { connected, validToken } = useSpotifyToken();
  const [notice, setNotice] = useState<"blocked" | null>(null);
  const wasPlayingRef = useRef(false);
  const prevActiveRef = useRef(false);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!connected) {
      prevActiveRef.current = active;
      return;
    }
    const prev = prevActiveRef.current;
    prevActiveRef.current = active;

    // Öffnen: merken, ob gerade Musik läuft (Basis für den Resume-Entscheid).
    if (!prev && active) {
      setNotice(null);
      void (async () => {
        const token = await validToken();
        if (!token) return;
        const np = await currentlyPlaying(token);
        wasPlayingRef.current = !!np?.isPlaying;
      })();
      return;
    }

    // Schließen: lief vorher Musik und jetzt (nach kurzer Freigabe) nicht mehr,
    // dann fortsetzen. Trade-off: hat der Nutzer während des Videos bewusst über
    // das Control Center pausiert, setzen wir ebenfalls fort — nicht vom iOS-
    // Interrupt unterscheidbar; ein erneuter Pause-Tap genügt.
    if (prev && !active && wasPlayingRef.current) {
      wasPlayingRef.current = false;
      if (timerRef.current != null) window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(() => {
        void (async () => {
          const token = await validToken();
          if (!token) return;
          const np = await currentlyPlaying(token);
          if (np?.isPlaying) return; // läuft schon wieder → nichts tun
          const ok = await control(token, "play");
          if (!ok) {
            setNotice("blocked");
            window.setTimeout(() => setNotice(null), 5000);
          }
        })();
      }, 800);
    }
  }, [active, connected, validToken]);

  // Timer beim Unmount räumen.
  useEffect(
    () => () => {
      if (timerRef.current != null) window.clearTimeout(timerRef.current);
    },
    [],
  );

  return { notice, dismiss: () => setNotice(null) };
}
