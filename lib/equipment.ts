/**
 * Small equipment helpers for the gym. The weight logged for a dumbbell
 * exercise is per dumbbell — `dumbbellHint` spells that out and adds the
 * total across both hands, so there's no mental math mid-set.
 */

/** Format a kg value with a German decimal comma, trimming a trailing ",0". */
function fmtKg(kg: number): string {
  return (Math.round(kg * 10) / 10).toString().replace(".", ",");
}

/**
 * Hint shown under the weight input of a dumbbell set, e.g.
 * `dumbbellHint(17.5)` → „2 × 17,5 kg · 35 kg gesamt". Null for empty/zero.
 */
export function dumbbellHint(weightKg: number): string | null {
  if (!weightKg || weightKg <= 0) return null;
  return `2 × ${fmtKg(weightKg)} kg · ${fmtKg(weightKg * 2)} kg gesamt`;
}
