import { isFilled, oneRm, workSets } from "@/lib/stats";
import type { Exercise, LoggedSession, SetEntry } from "@/lib/types";

/**
 * Personal-record history. A PR is a working set that beats the all-time best
 * for that exercise — by estimated 1RM for weighted lifts, by reps for
 * bodyweight work, by seconds for timed holds. Warm-ups never count (workSets).
 * Reused by the Progress "Rekorde"-Board and the weekly briefing (PR P).
 */

export type RecordKind = "weight" | "reps" | "time";

export interface PrEvent {
  exId: string;
  name: string;
  kind: RecordKind;
  date: string; // session date the new best was set
  value: number; // new best (rounded e1RM / reps / seconds)
  prev: number; // previous all-time best (always > 0 for an emitted event)
  label: string; // e.g. "60 × 8"
}

export interface ExRecord {
  exId: string;
  name: string;
  kind: RecordKind;
  best: number;
  label: string;
  date: string;
}

/**
 * Record kind per exercise across the WHOLE history. One session with a
 * forgotten weight must not flip a weighted lift into reps-counting (and a
 * bare `best` number would then compare kg-e1RM against rep counts — false
 * "Neuer Rekord" included). Once any session was weighted, the exercise
 * counts as "weight" for good; weightless sessions of it score 0 and drop out.
 */
function kindsAcross(log: LoggedSession[]): Record<string, RecordKind> {
  const kinds: Record<string, RecordKind> = {};
  for (const s of log) {
    for (const ex of s.exercises || []) {
      const sets = workSets(ex.sets || []).filter(isFilled);
      if (!sets.length) continue;
      if (ex.unit === "Sek") {
        kinds[ex.id] = "time";
        continue;
      }
      const weighted = sets.some(
        (st) => st.weight !== "" && st.weight != null && Number(st.weight) > 0,
      );
      if (weighted) kinds[ex.id] = "weight";
      else if (!kinds[ex.id]) kinds[ex.id] = "reps";
    }
  }
  return kinds;
}

/** Best metric (and its label) of one session's working, filled sets. */
function sessionBest(kind: RecordKind, sets: SetEntry[]): { value: number; label: string } {
  let best = 0;
  let label = "";
  for (const st of sets) {
    const w = Number(st.weight) || 0;
    const r = Number(st.reps) || 0;
    const m = kind === "weight" ? oneRm(w, r) : r;
    if (m > best) {
      best = m;
      label = kind === "weight" ? `${w} × ${r}` : kind === "time" ? `${r} s` : `${r} Wdh`;
    }
  }
  return { value: kind === "weight" ? Math.round(best) : best, label };
}

function weekStartMon(d: Date): Date {
  const off = (d.getDay() + 6) % 7;
  const m = new Date(d);
  m.setHours(0, 0, 0, 0);
  m.setDate(d.getDate() - off);
  return m;
}

/** All PR events across history, newest first. */
export function prTimeline(log: LoggedSession[]): PrEvent[] {
  const sorted = [...log].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const kinds = kindsAcross(sorted);
  const best: Record<string, number> = {};
  const events: PrEvent[] = [];
  for (const s of sorted) {
    for (const ex of s.exercises || []) {
      const sets = workSets(ex.sets || []).filter(isFilled);
      if (!sets.length) continue;
      const kind = kinds[ex.id] ?? "reps";
      const { value, label } = sessionBest(kind, sets);
      if (value <= 0) continue;
      const prev = best[ex.id] ?? 0;
      if (prev > 0 && value > prev) {
        events.push({ exId: ex.id, name: ex.name, kind, date: s.date, value, prev, label });
      }
      if (value > prev) best[ex.id] = value;
    }
  }
  return events.reverse();
}

/** Current all-time best per exercise, most-recently-set first. */
export function exerciseRecords(log: LoggedSession[]): ExRecord[] {
  const map: Record<string, ExRecord> = {};
  const sorted = [...log].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const kinds = kindsAcross(sorted);
  for (const s of sorted) {
    for (const ex of s.exercises || []) {
      const sets = workSets(ex.sets || []).filter(isFilled);
      if (!sets.length) continue;
      const kind = kinds[ex.id] ?? "reps";
      const { value, label } = sessionBest(kind, sets);
      if (value <= 0) continue;
      const cur = map[ex.id];
      if (!cur || value >= cur.best) {
        map[ex.id] = { exId: ex.id, name: ex.name, kind, best: value, label, date: s.date };
      }
    }
  }
  return Object.values(map).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

/** PR events set in the current Monday-based week (for celebration / briefing). */
export function weeklyPrs(log: LoggedSession[], ref: Date = new Date()): PrEvent[] {
  const start = weekStartMon(ref);
  const end = new Date(start);
  end.setDate(start.getDate() + 7);
  return prTimeline(log).filter((e) => {
    const t = new Date(e.date);
    return t >= start && t < end;
  });
}

/** Consecutive Monday-weeks with at least one PR (current week needn't break it). */
export function prStreakWeeks(log: LoggedSession[], ref: Date = new Date()): number {
  const weeks = new Set(prTimeline(log).map((e) => weekStartMon(new Date(e.date)).getTime()));
  if (!weeks.size) return 0;
  const cur = weekStartMon(ref);
  let streak = weeks.has(cur.getTime()) ? 1 : 0;
  for (let i = 1; i < 260; i++) {
    const wk = new Date(cur);
    wk.setDate(cur.getDate() - i * 7);
    if (weeks.has(wk.getTime())) streak++;
    else break;
  }
  return streak;
}

/** Suffix for a record value by kind. */
export function recordUnit(kind: RecordKind): string {
  return kind === "weight" ? "kg" : kind === "time" ? "s" : "Wdh";
}

/** All-time best for one exercise (null if never logged). Note: the in-progress
 *  session isn't in `log` yet, so during a workout this is the mark to beat. */
export function bestForExercise(log: LoggedSession[], exId: string): ExRecord | null {
  return exerciseRecords(log).find((r) => r.exId === exId) ?? null;
}

/** A single set's record metric — rounded e1RM for weighted lifts (matches
 *  `exerciseRecords`), reps for bodyweight, seconds for timed holds. */
export function setMetric(ex: Pick<Exercise, "unit" | "weighted">, set: SetEntry): number {
  const w = Number(set.weight) || 0;
  const r = Number(set.reps) || 0;
  if (ex.unit === "Sek") return r;
  if (ex.weighted && w > 0) return Math.round(oneRm(w, r));
  return r;
}

/** Whether a (working, filled) set beats the given all-time record — nur
 *  innerhalb derselben Metrik: Ein Satz ohne (noch nicht getipptes) Gewicht
 *  liefert rohe Wiederholungen und darf nie gegen einen kg-Bestwert gewinnen. */
export function beatsRecord(
  ex: Pick<Exercise, "unit" | "weighted">,
  set: SetEntry,
  rec: ExRecord | null,
): boolean {
  if (!rec || rec.best <= 0 || set.warmup || !isFilled(set)) return false;
  const w = Number(set.weight) || 0;
  const setKind: RecordKind =
    ex.unit === "Sek" ? "time" : ex.weighted && w > 0 ? "weight" : "reps";
  return setKind === rec.kind && setMetric(ex, set) > rec.best;
}
