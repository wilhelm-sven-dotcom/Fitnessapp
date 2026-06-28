import type { CardioSession } from "@/lib/types";

/** Unofficial Peloton API base. All access is best-effort + server-side. */
export const PELOTON_BASE = "https://api.onepeloton.com";

export interface RawPelotonWorkout {
  id?: string;
  created_at?: number;
  start_time?: number;
  end_time?: number;
  fitness_discipline?: string;
  total_work?: number;
  ride?: { title?: string } | null;
}

/** Map a raw Peloton workout to a CardioSession. Defensive — fields may be missing. */
export function normalizeRide(raw: RawPelotonWorkout): CardioSession | null {
  if (!raw || !raw.id) return null;
  const start = raw.start_time ?? raw.created_at ?? 0;
  const end = raw.end_time ?? 0;
  const durationSec = end > start ? end - start : 0;
  const kj = typeof raw.total_work === "number" ? Math.round(raw.total_work / 1000) : undefined;
  const epoch = start || raw.created_at || 0;
  const date = new Date(epoch * 1000).toISOString();
  const mins = durationSec / 60;
  const kjPerMin = kj && mins > 0 ? kj / mins : 0;
  const intensity: CardioSession["intensity"] =
    kjPerMin >= 9 ? "hard" : kjPerMin >= 5.5 ? "moderate" : "easy";
  return {
    id: String(raw.id),
    source: "peloton",
    date,
    durationSec,
    kj,
    title: raw.ride?.title ?? undefined,
    intensity,
  };
}

export interface CardioWeek {
  count: number;
  minutes: number;
  kj: number;
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
  for (const c of cardio) {
    const t = new Date(c.date);
    if (t >= mon && t < end) {
      count++;
      sec += c.durationSec;
      kj += c.kj ?? 0;
    }
  }
  return { count, minutes: Math.round(sec / 60), kj: Math.round(kj) };
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

/** Merge new rides into existing by id (dedupe), newest first. */
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
