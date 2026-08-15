"use client";

import { useCallback, useEffect, useRef } from "react";
import { useSpotifyToken } from "@/components/spotify/useSpotify";
import { playerState, setVolume } from "@/lib/spotify";

const DUCK_FACTOR = 0.4;
const DUCK_FLOOR = 20;
const BACKOFF_MS = 5 * 60 * 1000;

/**
 * Musik-Ducking für Countdown-Momente: `duckFor(ms)` senkt die Spotify-
 * Lautstärke des aktiven Geräts auf 40 % des Ist-Werts (Floor 20) und stellt
 * sie nach Ablauf — oder beim Unmount — wieder her. Folgeaufrufe während
 * einer laufenden Episode verlängern NUR den Restore-Timer: eine Episode
 * kostet 1× GET + 2× PUT. Harte Fehler (kein Premium, kein aktives Gerät,
 * Gerät ohne Volume-Support) → 5-Minuten-Backoff, still — Ducking ist
 * Komfort, kein Feature-Versprechen.
 *
 * Bewusste Trade-offs: ändert der Nutzer die
 * Lautstärke WÄHREND des Ducks, überschreibt der Restore das; schlägt der
 * Restore fehl (Token/Netz weg), bleibt die Musik auf dem geduckten Wert —
 * der Floor von 20 % hält das harmlos.
 */
export function useSpotifyDuck(enabled: boolean): { duckFor: (ms: number) => void } {
  const { connected, validToken } = useSpotifyToken();

  const origRef = useRef<number | null>(null); // gemerkte Original-Lautstärke
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const epochRef = useRef(0); // invalidiert verspätete Antworten alter Episoden
  const busyRef = useRef(false); // Episode im Aufbau (GET/PUT laufen)
  const blockedUntilRef = useRef(0);

  const restore = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
    epochRef.current += 1;
    const orig = origRef.current;
    // Restore-once: nur zurückstellen, was wir selbst geduckt haben.
    origRef.current = null;
    if (orig == null) return;
    void (async () => {
      const token = await validToken();
      if (token) await setVolume(token, orig);
    })();
  }, [validToken]);

  const duckFor = useCallback(
    (ms: number) => {
      if (!enabled || !connected) return;
      if (Date.now() < blockedUntilRef.current) return;
      // Laufende Episode: nur den Restore-Timer verlängern (kein neuer GET/PUT).
      if (origRef.current != null || busyRef.current) {
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(restore, ms);
        return;
      }
      busyRef.current = true;
      const epoch = ++epochRef.current;
      timerRef.current = setTimeout(restore, ms);
      void (async () => {
        try {
          const token = await validToken();
          if (!token || epochRef.current !== epoch) return;
          const st = await playerState(token);
          if (epochRef.current !== epoch) return;
          if (!st || !st.supportsVolume) {
            // Kein aktives Gerät / keine Steuerung möglich → länger still bleiben.
            blockedUntilRef.current = Date.now() + BACKOFF_MS;
            return;
          }
          if (!st.isPlaying || st.volumePercent == null) return; // nichts zu ducken
          const target = Math.max(DUCK_FLOOR, Math.round(st.volumePercent * DUCK_FACTOR));
          if (target >= st.volumePercent) return; // Musik ist schon leise
          const ok = await setVolume(token, target);
          if (!ok) {
            blockedUntilRef.current = Date.now() + BACKOFF_MS; // kein Premium o. ä.
            return;
          }
          if (epochRef.current !== epoch) {
            // Restore lief, bevor der PUT landete — sofort zurückstellen.
            const t = await validToken();
            if (t) await setVolume(t, st.volumePercent);
            return;
          }
          origRef.current = st.volumePercent;
        } finally {
          busyRef.current = false;
        }
      })();
    },
    [enabled, connected, restore, validToken],
  );

  // Unmount: ein laufendes Duck wird garantiert zurückgestellt.
  useEffect(() => restore, [restore]);

  return { duckFor };
}
