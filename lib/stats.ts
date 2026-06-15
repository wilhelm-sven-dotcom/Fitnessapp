import type { LoggedSession, SetEntry } from "@/lib/types";

/** A set counts as "done" once reps are entered. */
export const isFilled = (s: SetEntry) => s.reps !== "" && s.reps != null;

/** Working sets only — warm-ups never count toward volume, PRs or progression. */
export const workSets = (sets: SetEntry[]) => sets.filter((s) => !s.warmup);

/** Total weight × reps across all working sets of a session. */
export function sessionVolume(s: LoggedSession): number {
  return s.exercises.reduce(
    (sum, ex) =>
      sum +
      workSets(ex.sets).reduce(
        (a, st) => a + (Number(st.weight) || 0) * (Number(st.reps) || 0),
        0,
      ),
    0,
  );
}

/** Epley estimated 1RM. */
export const oneRm = (w: number, r: number) => w * (1 + r / 30);
