import type { CardioSession } from "@/lib/types";

/**
 * Source-agnostic cardio helpers. A `CardioSession` can come from Strava
 * (current) or older Peloton syncs — everything below treats them the same.
 */

export interface CardioWeek {
  count: number;
  minutes: number;
  kj: number;
  /** Total burned calories this week (0 if none recorded). */
  calories: number;
  /** Total distance this week in metres (0 if none recorded). */
  distance: number;
}

const weekStart = (ref: Date) => {
  const off = (ref.getDay() + 6) % 7;
  const m = new Date(ref);
  m.setHours(0, 0, 0, 0);
  m.setDate(ref.getDate() - off);
  return m;
};

export function weeklyCardio(cardio: CardioSession[], ref: Date = new Date()): CardioWeek {
  const mon = weekStart(ref);
  const end = new Date(mon);
  end.setDate(mon.getDate() + 7);
  let count = 0;
  let sec = 0;
  let kj = 0;
  let cal = 0;
  let dist = 0;
  for (const c of cardio) {
    const t = new Date(c.date);
    if (t >= mon && t < end) {
      count++;
      sec += c.durationSec;
      kj += c.kj ?? 0;
      cal += c.calories ?? 0;
      dist += c.distance ?? 0;
    }
  }
  return {
    count,
    minutes: Math.round(sec / 60),
    kj: Math.round(kj),
    calories: Math.round(cal),
    distance: Math.round(dist),
  };
}

export function lastRide(cardio: CardioSession[]): CardioSession | null {
  if (!cardio.length) return null;
  return [...cardio].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  )[0];
}

export function hoursSince(dateIso: string, ref: Date = new Date()): number {
  return (ref.getTime() - new Date(dateIso).getTime()) / 3600000;
}

/** Merge new sessions into existing by id (dedupe), newest first. */
export function mergeCardio(
  existing: CardioSession[],
  incoming: CardioSession[],
): CardioSession[] {
  const byId = new Map(existing.map((c) => [c.id, c]));
  for (const c of incoming) byId.set(c.id, c);
  return [...byId.values()].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );
}
