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

export const bandLabel: Record<ReadinessBand, string> = {
  low: "geschont",
  mid: "normal",
  high: "stark",
};
