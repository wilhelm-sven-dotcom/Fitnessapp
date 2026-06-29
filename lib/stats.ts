import type { LoggedSession, SetEntry } from "@/lib/types";

/** A set counts as "done" once reps are entered. */
export const isFilled = (s: SetEntry) => s.reps !== "" && s.reps != null;

/** Working sets only — warm-ups never count toward volume, PRs or progression.
 *  Tolerates a missing `sets` array (legacy/partial sessions) so callers that
 *  walk the whole history never throw. */
export const workSets = (sets: SetEntry[]) => (sets ?? []).filter((s) => !s.warmup);

/** Total weight × reps across all working sets of a session. */
export function sessionVolume(s: LoggedSession): number {
  return (s.exercises ?? []).reduce(
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

function weekStartMon(d: Date): Date {
  const off = (d.getDay() + 6) % 7;
  const m = new Date(d);
  m.setHours(0, 0, 0, 0);
  m.setDate(d.getDate() - off);
  return m;
}

/**
 * Consecutive weeks meeting the 3×/week goal. The current (in-progress) week
 * counts only if already met and never breaks the streak; older weeks must hit
 * the goal to keep it going.
 */
export function weeklyStreak(log: LoggedSession[], ref: Date = new Date()): number {
  const inWeek = (start: Date) => {
    const end = new Date(start);
    end.setDate(start.getDate() + 7);
    return log.filter((s) => {
      const t = new Date(s.date);
      return t >= start && t < end;
    }).length;
  };
  const week = weekStartMon(ref);
  let streak = inWeek(week) >= 3 ? 1 : 0;
  for (let i = 0; i < 260; i++) {
    week.setDate(week.getDate() - 7);
    if (inWeek(week) >= 3) streak++;
    else break;
  }
  return streak;
}

/**
 * Mean RIR across this week's working, filled sets (Monday-based) — the
 * editorial "Anstrengung Ø". null when nothing logged with an RIR this week.
 */
export function weeklyAvgRir(log: LoggedSession[], ref: Date = new Date()): number | null {
  const start = weekStartMon(ref);
  const end = new Date(start);
  end.setDate(start.getDate() + 7);
  const rirs: number[] = [];
  for (const s of log) {
    const t = new Date(s.date);
    if (t < start || t >= end) continue;
    for (const ex of s.exercises ?? []) {
      for (const set of workSets(ex.sets)) {
        if (set.rir != null && isFilled(set)) rirs.push(set.rir);
      }
    }
  }
  if (!rirs.length) return null;
  return rirs.reduce((a, b) => a + b, 0) / rirs.length;
}
