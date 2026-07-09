/**
 * Der Zünd-Check: Countermovement-Jump per DeviceMotion. Das iPhone wird an
 * die Brust gehalten, ein Strecksprung — im Beschleunigungssignal ist die
 * Flugphase ein Fenster nahe 0 g (freier Fall). Aus der Flugzeit folgt die
 * Sprunghöhe: h = g·t²/8. Die Höhe gegen den eigenen 7-Tage-Schnitt ist ein
 * physiologischer Tagesform-Marker (Profisport-Standard, dort per
 * Kraftmessplatte) und speist die Readiness-Autoregulation.
 */

export interface JumpSample {
  /** Zeitstempel in ms (performance.now()). */
  t: number;
  /** Betrag der Beschleunigung inkl. Gravitation, m/s². */
  a: number;
}

export interface JumpResult {
  heightCm: number;
  flightMs: number;
}

export interface JumpEntry {
  date: string; // ISO
  heightCm: number;
}

/** Unter dieser Schwelle gilt das Signal als Flugphase (~0 g + Sensorrauschen). */
const FREEFALL_MS2 = 4;
const MIN_FLIGHT_MS = 150; // < 2,8 cm — kein echter Sprung
const MAX_FLIGHT_MS = 800; // > 78 cm — Messartefakt
const G = 9.81;

/** Längstes plausibles Freifall-Fenster finden und in Sprunghöhe übersetzen. */
export function detectJump(samples: JumpSample[]): JumpResult | null {
  if (samples.length < 10) return null;
  let best: { dur: number } | null = null;
  let startIdx = -1;
  for (let i = 0; i < samples.length; i++) {
    const inFree = samples[i].a < FREEFALL_MS2;
    if (inFree && startIdx < 0) startIdx = i;
    const atEnd = i === samples.length - 1;
    if ((!inFree || atEnd) && startIdx >= 0) {
      const endIdx = inFree && atEnd ? i : i - 1;
      const dur = samples[endIdx].t - samples[startIdx].t;
      if (dur >= MIN_FLIGHT_MS && dur <= MAX_FLIGHT_MS && (!best || dur > best.dur)) {
        best = { dur };
      }
      startIdx = -1;
    }
  }
  if (!best) return null;
  const tSec = best.dur / 1000;
  const heightCm = Math.round(((G * tSec * tSec) / 8) * 1000) / 10;
  if (heightCm < 3 || heightCm > 80) return null;
  return { heightCm, flightMs: Math.round(best.dur) };
}

/** Mittel der letzten 7 Tage (mindestens 2 Messungen, sonst null). */
export function jumpBaseline(jumps: JumpEntry[], ref: Date = new Date()): number | null {
  const cutoff = ref.getTime() - 7 * 86400000;
  const recent = jumps.filter((j) => {
    const t = new Date(j.date).getTime();
    return Number.isFinite(t) && t >= cutoff && j.heightCm > 0;
  });
  if (recent.length < 2) return null;
  return recent.reduce((s, j) => s + j.heightCm, 0) / recent.length;
}

export type JumpBand = "low" | "mid" | "high";

/** Ampel gegen den eigenen Schnitt: ≥ +3 % stark, ≤ −5 % geschont, sonst normal. */
export function jumpBand(heightCm: number, baseline: number | null): JumpBand | null {
  if (!baseline || baseline <= 0) return null;
  const d = heightCm / baseline - 1;
  return d <= -0.05 ? "low" : d >= 0.03 ? "high" : "mid";
}
