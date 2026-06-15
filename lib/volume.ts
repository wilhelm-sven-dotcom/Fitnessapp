import { sessionVolume } from "@/lib/stats";
import type { LoggedSession } from "@/lib/types";

/** Monday-based week start (same algorithm as the provider's weekCount). */
export function weekStartMon(d: Date = new Date()): Date {
  const off = (d.getDay() + 6) % 7;
  const m = new Date(d);
  m.setHours(0, 0, 0, 0);
  m.setDate(d.getDate() - off);
  return m;
}

function volumeInWeek(log: LoggedSession[], start: Date): number {
  const end = new Date(start);
  end.setDate(start.getDate() + 7);
  return log
    .filter((s) => {
      const dt = new Date(s.date);
      return dt >= start && dt < end;
    })
    .reduce((sum, s) => sum + sessionVolume(s), 0);
}

/** Total working volume (kg) in the current week. */
export function weeklyVolume(log: LoggedSession[], ref: Date = new Date()): number {
  return volumeInWeek(log, weekStartMon(ref));
}

/** Median weekly volume over the previous `weeks` full weeks — the Volume-ring target. */
export function rollingWeeklyBaseline(
  log: LoggedSession[],
  weeks = 4,
  ref: Date = new Date(),
): number {
  const thisStart = weekStartMon(ref);
  const vols: number[] = [];
  for (let i = 1; i <= weeks; i++) {
    const start = new Date(thisStart);
    start.setDate(thisStart.getDate() - i * 7);
    const v = volumeInWeek(log, start);
    if (v > 0) vols.push(v);
  }
  if (!vols.length) return 0;
  vols.sort((a, b) => a - b);
  const mid = Math.floor(vols.length / 2);
  return vols.length % 2
    ? vols[mid]
    : Math.round((vols[mid - 1] + vols[mid]) / 2);
}
