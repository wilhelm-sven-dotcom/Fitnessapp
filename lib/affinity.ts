import type { Exercise, LoggedSession } from "@/lib/types";

/**
 * Per-exercise affinity learned from behaviour: explicit per-slot choices (the
 * strongest signal — the user actively picked this exercise) plus how often the
 * exercise was actually trained recently (revealed preference). Higher = more
 * preferred. Pure → tsx-testable.
 */
export function exerciseAffinity(
  choices: Record<string, string>,
  log: LoggedSession[],
): Map<string, number> {
  const score = new Map<string, number>();
  const add = (id: string, n: number) => score.set(id, (score.get(id) ?? 0) + n);
  // Explicit slot choices (swaps) — the clearest "I want this" signal.
  for (const id of Object.values(choices)) add(id, 2);
  // Actually-trained exercises over the recent past — revealed preference.
  for (const s of log.slice(-20)) for (const e of s.exercises ?? []) add(e.id, 1);
  return score;
}

/**
 * Pick from a same-pattern pool, preferring the highest-affinity tier and
 * rotating within it for variety. Falls back to plain rotation when no exercise
 * has a real signal yet, so a fresh user behaves exactly as before (no regression).
 */
export function pickPreferred(
  pool: Exercise[],
  aff: Map<string, number>,
  rot: number,
): Exercise {
  let max = 0;
  for (const e of pool) max = Math.max(max, aff.get(e.id) ?? 0);
  if (max < 2) return pool[((rot % pool.length) + pool.length) % pool.length];
  const tier = pool.filter((e) => (aff.get(e.id) ?? 0) === max);
  return tier[((rot % tier.length) + tier.length) % tier.length];
}
