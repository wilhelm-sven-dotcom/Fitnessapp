import type { LoggedSession, Readiness } from "@/lib/types";
import { TAG_MS } from "@/lib/zeit";

export type ReadinessBand = "low" | "mid" | "high";

const norm = (v: number) => (v - 1) / 2; // 1→0, 2→0.5, 3→1

/** Weighted readiness 0..1 — the back is weighted highest given Sven's history. */
export function readinessScore(r: { sleep: number; energy: number; back: number }): number {
  return 0.3 * norm(r.sleep) + 0.3 * norm(r.energy) + 0.4 * norm(r.back);
}

export function band(score: number): ReadinessBand {
  return score < 0.4 ? "low" : score <= 0.75 ? "mid" : "high";
}

export interface ReadinessScale {
  setDelta: number;
  loadMult: number;
  cap: boolean;
}

export function scaleFor(b: ReadinessBand): ReadinessScale {
  if (b === "low") return { setDelta: -1, loadMult: 0.95, cap: true };
  if (b === "high") return { setDelta: 1, loadMult: 1, cap: false };
  return { setDelta: 0, loadMult: 1, cap: false };
}

export const NEUTRAL_SCALE: ReadinessScale = { setDelta: 0, loadMult: 1, cap: false };

const STUFE = (v: unknown): v is 1 | 2 | 3 => v === 1 || v === 2 || v === 3;

/**
 * Tagesform der jüngsten Einheit mit Check-in aus den letzten `tage` Tagen —
 * Vorbelegung des nächsten Check-ins („wie zuletzt“). null, wenn es keine
 * gibt oder die Werte unvollständig sind; dann startet der Check-in neutral.
 */
export function lastReadiness(
  log: LoggedSession[],
  tage = 7,
  now = Date.now(),
): Readiness | null {
  let best: { t: number; r: Readiness } | null = null;
  for (const s of log) {
    const r = s.readiness;
    if (!r || !STUFE(r.sleep) || !STUFE(r.energy) || !STUFE(r.back)) continue;
    const t = new Date(s.date).getTime();
    if (!Number.isFinite(t) || now - t > tage * TAG_MS || t > now) continue;
    if (!best || t > best.t) best = { t, r };
  }
  return best ? best.r : null;
}
