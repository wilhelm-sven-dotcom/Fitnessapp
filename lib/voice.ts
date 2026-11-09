/**
 * Hands-free Gym-Modus: Sprachausgabe über die Web Speech API. Jeder
 * Browserzugriff ist abgesichert, damit die App ohne Sprachausgabe
 * unverändert läuft (Aufrufer prüfen `isSpeechSupported`). Die frühere
 * Spracheingabe (Satz per Stimme eintragen) hatte keine Oberfläche mehr und
 * ist entfernt.
 */

import { getCueVolume } from "@/lib/beep";

// --- Text-to-speech ---------------------------------------------------------

export function isSpeechSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

/** Speak a short German phrase. `interrupt` cancels anything still queued. */
export function speak(text: string, opts: { interrupt?: boolean } = {}): void {
  if (!isSpeechSupported()) return;
  try {
    const synth = window.speechSynthesis;
    if (opts.interrupt) synth.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "de-DE";
    u.rate = 1;
    // Leiser drehen wirkt auch auf die Ansage; > 1 bleibt bei TTS Maximum (1).
    u.volume = Math.min(1, Math.max(0, getCueVolume()));
    synth.speak(u);
  } catch {
    /* speech unavailable — silent no-op */
  }
}
