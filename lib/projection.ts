import { isFilled, oneRm, workSets } from "@/lib/stats";
import type { BodyMetric, Exercise, LoggedSession } from "@/lib/types";

export interface SeriesPoint {
  date: string;
  value: number;
}

export interface LinearFit {
  slope: number;
  intercept: number;
}

/** Ordinary least-squares fit of y = slope·x + intercept. */
export function linearFit(points: { x: number; y: number }[]): LinearFit {
  const n = points.length;
  if (n === 0) return { slope: 0, intercept: 0 };
  if (n === 1) return { slope: 0, intercept: points[0].y };
  const sx = points.reduce((s, p) => s + p.x, 0);
  const sy = points.reduce((s, p) => s + p.y, 0);
  const sxx = points.reduce((s, p) => s + p.x * p.x, 0);
  const sxy = points.reduce((s, p) => s + p.x * p.y, 0);
  const denom = n * sxx - sx * sx;
  if (Math.abs(denom) < 1e-9) return { slope: 0, intercept: sy / n };
  const slope = (n * sxy - sx * sy) / denom;
  const intercept = (sy - slope * sx) / n;
  return { slope, intercept };
}

const WEEK_MS = 7 * 86400000;
function toWeeks(series: SeriesPoint[]): { x: number; y: number }[] {
  if (!series.length) return [];
  const t0 = new Date(series[0].date).getTime();
  return series.map((p) => ({
    x: (new Date(p.date).getTime() - t0) / WEEK_MS,
    y: p.value,
  }));
}

/** Best estimated 1RM per session for one (weighted) exercise, chronologically. */
export function exercise1RMHistory(
  log: LoggedSession[],
  allLib: Exercise[],
  exId: string,
): SeriesPoint[] {
  const ex = allLib.find((e) => e.id === exId);
  if (!ex || !ex.weighted) return [];
  const out: SeriesPoint[] = [];
  log.forEach((s) => {
    const se = s.exercises.find((e) => e.id === exId);
    if (!se) return;
    const sets = workSets(se.sets).filter(isFilled);
    if (!sets.length) return;
    const best = Math.max(
      ...sets.map((st) => oneRm(Number(st.weight) || 0, Number(st.reps) || 0)),
    );
    if (best > 0) out.push({ date: s.date, value: Math.round(best * 10) / 10 });
  });
  return out;
}

export function bodyTrend(
  body: BodyMetric[],
  field: "weightKg" | "waistCm",
): SeriesPoint[] {
  return body
    .filter((b) => b[field] != null)
    .map((b) => ({ date: b.date, value: b[field] as number }));
}

export interface Projection {
  slopePerWeek: number;
  current: number;
  projected: number;
  weeksAhead: number;
}

/** Minimum data points before a projection is trustworthy enough to show. */
export const MIN_POINTS = 3;

export function project(series: SeriesPoint[], weeksAhead: number): Projection | null {
  if (series.length < MIN_POINTS) return null;
  const pts = toWeeks(series);
  const { slope, intercept } = linearFit(pts);
  const lastX = pts[pts.length - 1].x;
  const projected = intercept + slope * (lastX + weeksAhead);
  return {
    slopePerWeek: Math.round(slope * 100) / 100,
    current: series[series.length - 1].value,
    projected: Math.round(projected * 10) / 10,
    weeksAhead,
  };
}

/**
 * Weeks until the fitted trend reaches `target`. 0 if already reached/passed in
 * the direction of travel, null only when the trend is flat (no progress) — too
 * little data also yields null.
 */
export function weeksToTarget(series: SeriesPoint[], target: number): number | null {
  if (series.length < MIN_POINTS) return null;
  const pts = toWeeks(series);
  const { slope, intercept } = linearFit(pts);
  const lastX = pts[pts.length - 1].x;
  const latestFit = intercept + slope * lastX;
  if (Math.abs(slope) < 1e-6) return Math.abs(target - latestFit) < 1e-6 ? 0 : null;
  const weeks = (target - latestFit) / slope;
  return weeks <= 0 ? 0 : Math.round(weeks);
}
