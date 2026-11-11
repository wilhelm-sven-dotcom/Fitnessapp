"use client";

import { useEffect, useRef } from "react";
import { beep, beepEnd } from "@/lib/beep";
import { useCountdown } from "@/lib/use-countdown";
import { speak } from "@/lib/voice";

/**
 * Die hörbare Seite der Satzpause: Tick in den letzten 3 s, Doppelton bei 0,
 * auf Wunsch Ansagen. iOS kennt kein `navigator.vibrate` — Audio ist dort das
 * einzige Ende-Signal. Beeps bewusst ungated (cueVolume regelt die
 * Lautstärke), nur die Stimme hängt an `voice`.
 *
 * Eigene Komponente ohne Ausgabe, damit der Sekundentakt NUR hier (und in der
 * Anzeige) rendert und nicht die ganze Trainingsseite. Die Töne hängen an der
 * Restzeit aus der Uhr: Springt sie nach einer Sperre mehrere Sekunden, gibt
 * es keine nachgeholten Ticks, nur einmal das Ende.
 */
export function RestCues({
  endsAt,
  voice,
  duckFor,
}: {
  endsAt: number;
  voice: boolean;
  /** Musik für `ms` leiser, damit Endton und Ansage durchkommen. */
  duckFor: (ms: number) => void;
}) {
  const left = useCountdown(endsAt);
  const vorher = useRef<number | null>(null);

  useEffect(() => {
    const war = vorher.current;
    vorher.current = left;
    // Erster Stand (Start oder Wiederaufnahme): nichts ansagen.
    if (war == null || war === left) return;
    if (left <= 0) {
      if (war > 0) {
        beepEnd();
        if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(200);
        if (voice) speak("Pause vorbei. Auf geht's.", { interrupt: true });
      }
      return;
    }
    // Nur der normale Sekundenschritt tickt — nach einem Sprung (Sperre,
    // ±15 s) wären die Ticks zu spät oder falsch.
    if (war - left !== 1) return;
    if (left === 5) duckFor(7000);
    if (left <= 3) beep();
    if (voice) {
      if (left === 10) speak("Noch zehn Sekunden");
      else if (left <= 3) speak(["", "eins", "zwei", "drei"][left]);
    }
  }, [left, voice, duckFor]);

  return null;
}
