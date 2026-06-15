/* Central domain types for the training app. */

export type Unit = "Wdh" | "Sek";

export type Pattern =
  | "squat"
  | "lunge"
  | "hinge"
  | "hpush"
  | "vpush"
  | "hpull"
  | "vpull"
  | "arm"
  | "lateral"
  | "core";

export type EquipKey =
  | "db"
  | "kb"
  | "bar"
  | "pullup"
  | "rings"
  | "bands"
  | "box"
  | "bench";

export type TrafficLight = "green" | "yellow" | "red";

export type Muscle =
  | "chest"
  | "back"
  | "shoulders"
  | "biceps"
  | "triceps"
  | "quads"
  | "hamstrings"
  | "glutes"
  | "core";

export interface Exercise {
  id: string;
  name: string;
  pattern: Pattern;
  tag: string;
  /** Requirement tokens: none | weight | dumbbell | kettlebell | bar | pullup | rings | bands | box | bench */
  req: string[];
  weighted: boolean;
  sets: number;
  repLow: number;
  repHigh: number;
  unit: Unit;
  cue: string;
  steps: string[];
  back: string;
  easier: string;
  /** Hinge/flexion exercise to treat carefully when the lower back is irritated. */
  backCaution?: boolean;
  /** Dedicated lower-back stabilizer — prioritized in the core slot after a red back signal. */
  backStabilizer?: boolean;
  /** Primary muscle (optional; otherwise derived from pattern/tag by muscleOf). */
  muscle?: Muscle;
  /** Secondary muscle — counts as half a set toward weekly volume. */
  muscleSecondary?: Muscle;
  /** User-defined exercise (created in settings). */
  custom?: boolean;
}

export interface Template {
  key: string;
  name: string;
  focus: string;
  slots: Pattern[];
}

export interface EquipItem {
  key: EquipKey;
  label: string;
}

/**
 * A single set. Persisted shape — `weight`/`reps` stay strings to mirror the
 * inputs and keep the "filled" sentinel (`reps !== "" && reps != null`) intact.
 * `rir`, `intensity` and `warmup` are optional, so logs saved before these
 * features load unchanged.
 */
export interface SetEntry {
  weight: string;
  reps: string;
  /** Reps in reserve, 0..4 — weighted / rep-based exercises. */
  rir?: number;
  /** Felt intensity, 1..5 — timed (hold) exercises, replaces RIR. */
  intensity?: number;
  /** Warm-up set — excluded from progression, volume and PR detection. */
  warmup?: boolean;
}

export interface SessionExercise {
  id: string;
  name: string;
  unit: Unit;
  sets: SetEntry[];
}

export interface LoggedSession {
  date: string; // ISO
  dayKey: string;
  dayName: string;
  focus: string;
  exercises: SessionExercise[];
  /** Lower-back check after the session (traffic light). */
  backTraffic?: TrafficLight;
  /** Free-text note ("Wie war's?"). */
  note?: string;
  /** Estimated session length at start (minutes). */
  estimatedMin?: number;
  /** Marked as a deload session (reduced load/volume). */
  isDeload?: boolean;
}

export interface BodyMetric {
  date: string; // ISO
  weightKg?: number;
  waistCm?: number;
}

export interface AppSettings {
  /** Target session length in minutes. */
  timeBudgetMin: number;
  /** Master switch for daily readiness autoregulation. */
  autoregOn: boolean;
  /** ISO date of the last accepted deload week. */
  lastDeloadDate?: string;
}

/** Most recent performance of one exercise, used to derive the next prescription. */
export interface LastPerf {
  sets: SetEntry[];
  date: string;
}

export type PrescReason = "start" | "up" | "rep" | "down" | "hold" | "lighter";

/** Output of `presc()` — the suggestion shown on the workout card. */
export interface Prescription {
  /** Suggested weight as string for the input (empty if not weighted/unknown). */
  w: string;
  /** Suggested rep / hold target as string. */
  r: string;
  /** Human-readable line ("Heute: 3 × 10 @ 20 kg — hoch!"). */
  line: string;
  /** Suggested weight numeric, already rounded to 2.5 kg — for coaching chips. */
  suggestedWeight?: number;
  /** Why the suggestion changed — drives line text and coaching chips. */
  reason?: PrescReason;
}

/** A resolved template slot: the chosen exercise plus its swap pool. */
export interface ResolvedSlot {
  ex: Exercise;
  slotKey: string;
  pool: Exercise[];
}
