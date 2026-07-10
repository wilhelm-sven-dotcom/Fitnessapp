import { isFilled, sessionVolume, workSets } from "@/lib/stats";
import { VOLUME_LANDMARKS } from "@/lib/training-science";
import type { Exercise, LoggedSession, Muscle, Pattern } from "@/lib/types";

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

const PATTERN_MUSCLE: Record<Pattern, { primary: Muscle; secondary?: Muscle }> = {
  squat: { primary: "quads", secondary: "glutes" },
  lunge: { primary: "quads", secondary: "glutes" },
  hinge: { primary: "glutes", secondary: "hamstrings" },
  hpush: { primary: "chest", secondary: "triceps" },
  vpush: { primary: "shoulders", secondary: "triceps" },
  hpull: { primary: "back", secondary: "biceps" },
  vpull: { primary: "back", secondary: "biceps" },
  arm: { primary: "biceps" },
  lateral: { primary: "shoulders" },
  core: { primary: "core" },
  cardio: { primary: "core" },
};

const ID_OVERRIDE: Record<string, { primary: Muscle; secondary?: Muscle }> = {
  rdl_db: { primary: "hamstrings", secondary: "glutes" },
  rdl_bar: { primary: "hamstrings", secondary: "glutes" },
  deadlift: { primary: "hamstrings", secondary: "back" },
};

/** Primary (+ optional secondary) muscle — explicit field wins, else derived from pattern/tag. */
export function muscleOf(ex: {
  id: string;
  pattern: Pattern;
  tag?: string;
  muscle?: Muscle;
  muscleSecondary?: Muscle;
}): { primary: Muscle; secondary?: Muscle } {
  if (ex.muscle) return { primary: ex.muscle, secondary: ex.muscleSecondary };
  if (ID_OVERRIDE[ex.id]) return ID_OVERRIDE[ex.id];
  if (ex.pattern === "arm")
    return (ex.tag ?? "").toLowerCase().includes("trizeps")
      ? { primary: "triceps" }
      : { primary: "biceps" };
  return PATTERN_MUSCLE[ex.pattern] ?? { primary: "core" };
}

/** Weekly per-muscle set target, derived from the evidence-based landmarks. */
export const VOLUME_TARGET = {
  min: VOLUME_LANDMARKS.target,
  max: VOLUME_LANDMARKS.mav,
} as const;

export const MUSCLE_ORDER: Muscle[] = [
  "chest",
  "back",
  "shoulders",
  "biceps",
  "triceps",
  "quads",
  "hamstrings",
  "glutes",
  "core",
];

export const MUSCLE_LABEL: Record<Muscle, string> = {
  chest: "Brust",
  back: "Rücken",
  shoulders: "Schultern",
  biceps: "Bizeps",
  triceps: "Trizeps",
  quads: "Quadrizeps",
  hamstrings: "Beinrückseite",
  glutes: "Gesäß",
  core: "Core",
};

export type VolumeStatus = "under" | "in" | "over";
export interface MuscleVolume {
  muscle: Muscle;
  sets: number;
  status: VolumeStatus;
}

/** Weekly working sets per muscle (primary 1.0, secondary 0.5), Monday-based. */
export function weeklyMuscleVolume(
  log: LoggedSession[],
  allLib: Exercise[],
  ref: Date = new Date(),
): MuscleVolume[] {
  const start = weekStartMon(ref);
  const end = new Date(start);
  end.setDate(start.getDate() + 7);
  const byId = new Map(allLib.map((e) => [e.id, e]));
  const acc: Partial<Record<Muscle, number>> = {};
  log
    .filter((s) => {
      const d = new Date(s.date);
      return d >= start && d < end;
    })
    .forEach((s) =>
      (s.exercises ?? []).forEach((se) => {
        const ex = byId.get(se.id);
        if (ex?.pattern === "cardio") return; // cardio is its own domain, not strength volume
        const n = workSets(se.sets).filter(isFilled).length;
        if (!n) return;
        const m = muscleOf(ex ?? { id: se.id, pattern: "core" });
        acc[m.primary] = (acc[m.primary] ?? 0) + n;
        if (m.secondary) acc[m.secondary] = (acc[m.secondary] ?? 0) + n * 0.5;
      }),
    );
  return MUSCLE_ORDER.map((muscle) => {
    const sets = Math.round((acc[muscle] ?? 0) * 10) / 10;
    const status: VolumeStatus =
      sets < VOLUME_TARGET.min ? "under" : sets > VOLUME_TARGET.max ? "over" : "in";
    return { muscle, sets, status };
  });
}

/** Coverage = how many muscle groups were touched this week (blue ring). */
export function coverageCount(vols: MuscleVolume[]): { hit: number; total: number } {
  return { hit: vols.filter((v) => v.sets > 0).length, total: vols.length };
}

/** Muscles below the weekly growth target ("under"), most-deficient first. */
export function underservedMuscles(vols: MuscleVolume[]): MuscleVolume[] {
  return vols.filter((v) => v.status === "under").sort((a, b) => a.sets - b.sets);
}

/**
 * Muscle breakdown for a single set of planned/chosen exercises (each with a set
 * count) — the basis of a session's "DNA" radar. Primary 1.0, secondary 0.5.
 */
export function exerciseMuscleVolume(
  items: {
    ex: {
      id: string;
      pattern: Pattern;
      tag?: string;
      muscle?: Muscle;
      muscleSecondary?: Muscle;
    };
    sets: number;
  }[],
): MuscleVolume[] {
  const acc: Partial<Record<Muscle, number>> = {};
  for (const { ex, sets } of items) {
    if (!sets || ex.pattern === "cardio") continue;
    const m = muscleOf(ex);
    acc[m.primary] = (acc[m.primary] ?? 0) + sets;
    if (m.secondary) acc[m.secondary] = (acc[m.secondary] ?? 0) + sets * 0.5;
  }
  return MUSCLE_ORDER.map((muscle) => {
    const sets = Math.round((acc[muscle] ?? 0) * 10) / 10;
    const status: VolumeStatus =
      sets < VOLUME_TARGET.min ? "under" : sets > VOLUME_TARGET.max ? "over" : "in";
    return { muscle, sets, status };
  });
}

