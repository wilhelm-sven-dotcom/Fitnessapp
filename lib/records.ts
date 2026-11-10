import { fmtGewicht } from "@/lib/format";
import { isFilled, oneRm, workSets } from "@/lib/stats";
import type { Exercise, LoggedSession, SetEntry } from "@/lib/types";
import { weekStartMon } from "@/lib/zeit";

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
export function kindsAcross(log: readonly LoggedSession[]): Record<string, RecordKind> {
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

/** Bester Satz einer Einheit nach der Rekord-Kennzahl — OHNE Label. Das
 *  Formatieren kostet (Intl) und wird nur für den Satz gebraucht, der am Ende
 *  wirklich gezeigt wird. */
function bestSet(kind: RecordKind, sets: SetEntry[]): { value: number; set: SetEntry | null } {
  let best = 0;
  let top: SetEntry | null = null;
  for (const st of sets) {
    const w = Number(st.weight) || 0;
    const r = Number(st.reps) || 0;
    const m = kind === "weight" ? oneRm(w, r) : r;
    if (m > best) {
      best = m;
      top = st;
    }
  }
  return { value: kind === "weight" ? Math.round(best) : best, set: top };
}

/** Beschriftung eines Rekord-Satzes: „60 × 8“, „45 s“, „12 Wdh“. */
function setLabel(kind: RecordKind, st: SetEntry | null): string {
  if (!st) return "";
  const w = Number(st.weight) || 0;
  const r = Number(st.reps) || 0;
  return kind === "weight" ? `${fmtGewicht(w)} × ${r}` : kind === "time" ? `${r} s` : `${r} Wdh`;
}

/** Best metric (and its label) of one session's working, filled sets. */
export function sessionBest(kind: RecordKind, sets: SetEntry[]): { value: number; label: string } {
  const { value, set } = bestSet(kind, sets);
  return { value, label: setLabel(kind, set) };
}

/*
 * Rekorde und PR-Verlauf hängen nur am Verlauf. Der Verlauf ist React-State
 * und wird bei jeder Änderung als NEUES Array gesetzt, nie verändert — also
 * reicht ein Zwischenspeicher je Array (WeakMap, räumt sich selbst auf). Vorher
 * rechnete jede Übung jeder Einheit im Verlauf alle Rekorde neu: quadratisch,
 * bei 150 Einheiten rund 18 s. Die Rückgaben sind deshalb `readonly`.
 */
const PR_CACHE = new WeakMap<readonly LoggedSession[], readonly PrEvent[]>();
const REC_CACHE = new WeakMap<readonly LoggedSession[], readonly ExRecord[]>();
const REC_MAP_CACHE = new WeakMap<readonly LoggedSession[], ReadonlyMap<string, ExRecord>>();

const byDateAsc = (log: readonly LoggedSession[]) =>
  [...log].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

/** All PR events across history, newest first. */
export function prTimeline(log: readonly LoggedSession[]): readonly PrEvent[] {
  const hit = PR_CACHE.get(log);
  if (hit) return hit;
  const sorted = byDateAsc(log);
  const kinds = kindsAcross(sorted);
  const best: Record<string, number> = {};
  const events: PrEvent[] = [];
  for (const s of sorted) {
    for (const ex of s.exercises || []) {
      const sets = workSets(ex.sets || []).filter(isFilled);
      if (!sets.length) continue;
      const kind = kinds[ex.id] ?? "reps";
      const { value, set } = bestSet(kind, sets);
      if (value <= 0) continue;
      const prev = best[ex.id] ?? 0;
      if (prev > 0 && value > prev) {
        events.push({
          exId: ex.id,
          name: ex.name,
          kind,
          date: s.date,
          value,
          prev,
          label: setLabel(kind, set),
        });
      }
      if (value > prev) best[ex.id] = value;
    }
  }
  const out = events.reverse();
  PR_CACHE.set(log, out);
  return out;
}

/** Current all-time best per exercise, most-recently-set first. */
export function exerciseRecords(log: readonly LoggedSession[]): readonly ExRecord[] {
  const hit = REC_CACHE.get(log);
  if (hit) return hit;
  const map: Record<string, { rec: ExRecord; set: SetEntry | null }> = {};
  const sorted = byDateAsc(log);
  const kinds = kindsAcross(sorted);
  for (const s of sorted) {
    for (const ex of s.exercises || []) {
      const sets = workSets(ex.sets || []).filter(isFilled);
      if (!sets.length) continue;
      const kind = kinds[ex.id] ?? "reps";
      const { value, set } = bestSet(kind, sets);
      if (value <= 0) continue;
      const cur = map[ex.id];
      if (!cur || value >= cur.rec.best) {
        map[ex.id] = {
          rec: { exId: ex.id, name: ex.name, kind, best: value, label: "", date: s.date },
          set,
        };
      }
    }
  }
  // Label erst jetzt, nur für die Sätze, die Rekord geblieben sind.
  const out = Object.values(map)
    .map(({ rec, set }) => ({ ...rec, label: setLabel(rec.kind, set) }))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  REC_CACHE.set(log, out);
  return out;
}

/** Rekorde als Nachschlagetabelle (Übungs-Id → Rekord), je Verlauf einmal. */
export function recordsById(log: readonly LoggedSession[]): ReadonlyMap<string, ExRecord> {
  let m = REC_MAP_CACHE.get(log);
  if (!m) {
    m = new Map(exerciseRecords(log).map((r) => [r.exId, r] as const));
    REC_MAP_CACHE.set(log, m);
  }
  return m;
}

/** PR events set in the current Monday-based week (for celebration / briefing). */
export function weeklyPrs(log: readonly LoggedSession[], ref: Date = new Date()): PrEvent[] {
  const start = weekStartMon(ref);
  const end = new Date(start);
  end.setDate(start.getDate() + 7);
  return prTimeline(log).filter((e) => {
    const t = new Date(e.date);
    return t >= start && t < end;
  });
}

/** Consecutive Monday-weeks with at least one PR (current week needn't break it). */
export function prStreakWeeks(log: readonly LoggedSession[], ref: Date = new Date()): number {
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
export function bestForExercise(log: readonly LoggedSession[], exId: string): ExRecord | null {
  return recordsById(log).get(exId) ?? null;
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
