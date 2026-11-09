/**
 * Small equipment helpers for the gym. The weight logged for a dumbbell
 * exercise is per dumbbell — `dumbbellHint` spells that out and adds the
 * total across both hands, so there's no mental math mid-set.
 */

import { MASCHINEN } from "@/lib/exercises";
import { fmtKg } from "@/lib/format";

/**
 * Hint shown under the weight input of a dumbbell set, e.g.
 * `dumbbellHint(17.5)` → „2 × 17,5 kg · 35 kg gesamt". Null for empty/zero.
 */
export function dumbbellHint(weightKg: number): string | null {
  if (!weightKg || weightKg <= 0) return null;
  return `2 × ${fmtKg(weightKg)} kg · ${fmtKg(weightKg * 2)} kg gesamt`;
}

const GERAET: Record<string, string> = {
  db: "Kurzhanteln",
  dumbbell: "Kurzhanteln",
  kb: "Kettlebell",
  kettlebell: "Kettlebell",
  bar: "Langhantel",
  pullup: "Klimmzugstange",
  rings: "Turnringe",
  bands: "Bänder",
  box: "Erhöhung",
  bench: "Hantelbank",
  cable: "Kabelzug",
  machine: "Maschine",
  bike: "Bike",
  weight: "Freies Gewicht",
  ...Object.fromEntries(MASCHINEN.map((m) => [m.key, m.label])),
};

/** Gerät einer Übung als Text für Listen: „Langhantel + Hantelbank“,
 *  ohne Anforderung „Körpergewicht“. */
export function geraetText(req: readonly string[] | undefined): string {
  const teile = (req ?? []).filter((t) => t !== "none").map((t) => GERAET[t] ?? t);
  return teile.length ? [...new Set(teile)].join(" + ") : "Körpergewicht";
}
