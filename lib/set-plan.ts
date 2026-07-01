/**
 * "Set collector" — turns working sets into a visible, gently-progressive goal.
 *
 * Evidence-anchored to the weekly volume landmarks (`VOLUME_LANDMARKS`): the
 * per-exercise nudge never pushes a muscle past its Maximum Adaptive Volume
 * (no junk volume), and the weekly goal grows with the athlete's own recent
 * output rather than a fixed number, so "collect more and more" stays realistic.
 * Pure + tsx-testable.
 */

import { isFilled, workSets } from "@/lib/stats";
import { VOLUME_LANDMARKS } from "@/lib/training-science";
import { muscleOf, type MuscleVolume } from "@/lib/volume";
import type { Exercise, LoggedSession } from "@/lib/types";

const DAY = 86_400_000;

/** Monday 00:00 of the week containing `ref`. */
function weekStartMon(ref: Date): Date {
  const d = new Date(ref);
  d.setHours(0, 0, 0, 0);
  const off = (d.getDay() + 6) % 7; // Mon = 0
  d.setDate(d.getDate() - off);
  return d;
}

/** Working, filled sets logged in the Monday-based week containing `ref`. */
export function weeklySetCount(log: LoggedSession[], ref: Date): number {
  const start = weekStartMon(ref).getTime();
  const end = start + 7 * DAY;
  let n = 0;
  for (const s of log) {
    const t = new Date(s.date).getTime();
    if (Number.isNaN(t) || t < start || t >= end) continue;
    for (const ex of s.exercises ?? []) {
      for (const st of workSets(ex.sets)) if (isFilled(st)) n++;
    }
  }
  return n;
}

/** All-time working, filled sets — the lifetime "collected" count. */
export function totalSetCount(log: LoggedSession[]): number {
  let n = 0;
  for (const s of log) {
    for (const ex of s.exercises ?? []) {
      for (const st of workSets(ex.sets)) if (isFilled(st)) n++;
    }
  }
  return n;
}

function median(xs: number[]): number {
  if (!xs.length) return 0;
  const a = [...xs].sort((x, y) => x - y);
  const m = Math.floor(a.length / 2);
  return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2;
}

// A gently-progressive weekly set goal: baseline = median of the last 4
// completed weeks (only weeks actually trained), nudged ~8 % above it — so as
// the athlete's weekly output climbs, the goal climbs too. Floored so it stays
// motivating for newcomers, capped in a productive band so it never becomes an
// unrealistic junk-volume chase.
const MIN_WEEKLY_TARGET = 18;
const MAX_WEEKLY_TARGET = 80;

export interface WeeklySetStats {
  collected: number;
  target: number;
  pct: number; // 0..1 toward the weekly goal
}

export function weeklySetStats(log: LoggedSession[], ref: Date = new Date()): WeeklySetStats {
  const collected = weeklySetCount(log, ref);
  const thisStart = weekStartMon(ref).getTime();
  const prev: number[] = [];
  for (let w = 1; w <= 4; w++) prev.push(weeklySetCount(log, new Date(thisStart - w * 7 * DAY)));
  const base = median(prev.filter((n) => n > 0));
  const raw = base > 0 ? Math.round(base * 1.08) : MIN_WEEKLY_TARGET;
  const target = Math.max(MIN_WEEKLY_TARGET, Math.min(MAX_WEEKLY_TARGET, raw));
  return { collected, target, pct: target > 0 ? Math.min(1, collected / target) : 0 };
}

export interface SetRecCtx {
  muscleVolumes: MuscleVolume[];
  deload?: boolean;
  lowReadiness?: boolean;
}

/**
 * Advisory set target for one exercise today. Nudges +1 over the base when the
 * exercise's primary muscle still has room below its Maximum Adaptive Volume
 * this week — never during a deload or a poor-readiness day, and never pushing
 * the muscle past MAV. Returns the base otherwise.
 */
export function recommendedSets(ex: Exercise, ctx: SetRecCtx): number {
  const base = ex.sets;
  if (ctx.deload || ctx.lowReadiness) return base;
  const primary = muscleOf(ex).primary; // built-in exercises don't carry `muscle`
  const mv = ctx.muscleVolumes.find((v) => v.muscle === primary);
  if (!mv) return base;
  return mv.sets + 1 <= VOLUME_LANDMARKS.mav ? base + 1 : base;
}

const TIERS: { min: number; title: string }[] = [
  { min: 0, title: "Sammler-Start" },
  { min: 100, title: "Satz-Sammler" },
  { min: 250, title: "Satz-Jäger" },
  { min: 500, title: "Satz-Profi" },
  { min: 1000, title: "Satz-Meister" },
  { min: 2500, title: "Satz-Legende" },
];

export interface SetTier {
  title: string;
  total: number;
  next: number | null; // next threshold, or null when maxed out
  pct: number; // progress toward the next tier
}

export function setCollectorTier(totalSets: number): SetTier {
  let i = 0;
  for (let k = 0; k < TIERS.length; k++) if (totalSets >= TIERS[k].min) i = k;
  const cur = TIERS[i];
  const nxt = TIERS[i + 1];
  return {
    title: cur.title,
    total: totalSets,
    next: nxt ? nxt.min : null,
    pct: nxt ? Math.min(1, (totalSets - cur.min) / (nxt.min - cur.min || 1)) : 1,
  };
}
