/**
 * Wochen-Sätze: Arbeitssätze dieser Woche und ein Wochenziel, das mit der
 * eigenen jüngsten Leistung wächst statt einer festen Zahl. Pure.
 */

import { isFilled, workSets } from "@/lib/stats";
import type { LoggedSession } from "@/lib/types";

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
  const startD = weekStartMon(ref);
  const endD = new Date(startD);
  endD.setDate(endD.getDate() + 7); // calendar days, DST-safe (not ms math)
  const start = startD.getTime();
  const end = endD.getTime();
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
  const thisStart = weekStartMon(ref);
  const prev: number[] = [];
  for (let w = 1; w <= 4; w++) {
    const d = new Date(thisStart);
    d.setDate(d.getDate() - 7 * w); // calendar days, DST-safe (not ms math)
    prev.push(weeklySetCount(log, d));
  }
  const base = median(prev.filter((n) => n > 0));
  const raw = base > 0 ? Math.round(base * 1.08) : MIN_WEEKLY_TARGET;
  const target = Math.max(MIN_WEEKLY_TARGET, Math.min(MAX_WEEKLY_TARGET, raw));
  return { collected, target, pct: target > 0 ? Math.min(1, collected / target) : 0 };
}
