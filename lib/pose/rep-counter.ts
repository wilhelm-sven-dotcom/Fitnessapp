/**
 * Rep counting as a small hysteresis state machine over one tracked angle.
 * `downBelow < upAbove` gives a dead-band so jitter near a threshold doesn't
 * double-count. Pure and unit-testable.
 *
 * Mit Zeitstempeln vermisst die Maschine jede Wiederholung zusätzlich:
 * konzentrische Dauer (Tiefpunkt → oben) und Bewegungsumfang (ROM). Daraus
 * rechnet lib/pose/velocity.ts den Velocity-Loss über den Satz — die Basis
 * für „ATLAS bekommt Augen" (gemessenes RIR, Satz-Stopp-Ansage).
 */

export type RepMetric = "kneeAngle" | "elbowAngle" | "hipAngle";

export interface RepConfig {
  metric: RepMetric;
  /** Enter the "down" phase when the angle drops below this. */
  downBelow: number;
  /** Count a rep when the angle returns above this. */
  upAbove: number;
}

export type RepPhase = "up" | "down";

/** Vermessung einer gezählten Wiederholung. */
export interface RepSample {
  /** Dauer der konzentrischen Phase (Tiefpunkt → oben), ms. */
  concMs: number;
  /** Bewegungsumfang dieser Rep (Winkelgrad zwischen Tief- und Endpunkt). */
  rom: number;
}

export interface RepState {
  phase: RepPhase;
  reps: number;
  /** True on the frame a rep was just counted (for cue/vibration). */
  justCounted: boolean;
  /** Vermessene Reps (nur wenn updateRep Zeitstempel bekommt). */
  history: RepSample[];
  /** intern: Tiefpunkt der laufenden Rep (Wert + Zeitpunkt). */
  minValue?: number;
  minAt?: number;
}

export function initRepState(): RepState {
  return { phase: "up", reps: 0, justCounted: false, history: [] };
}

export function updateRep(
  state: RepState,
  value: number,
  cfg: RepConfig,
  ts?: number,
): RepState {
  if (state.phase === "up" && value < cfg.downBelow) {
    return {
      ...state,
      phase: "down",
      justCounted: false,
      minValue: value,
      minAt: ts,
    };
  }
  if (state.phase === "down") {
    // Tiefpunkt der laufenden Rep nachführen.
    const isNewMin = state.minValue == null || value < state.minValue;
    const minValue = isNewMin ? value : state.minValue;
    const minAt = isNewMin ? ts : state.minAt;
    if (value > cfg.upAbove) {
      const measured =
        ts != null && minAt != null && minValue != null
          ? [...state.history, { concMs: ts - minAt, rom: value - minValue }]
          : state.history;
      return {
        phase: "up",
        reps: state.reps + 1,
        justCounted: true,
        history: measured,
        minValue: undefined,
        minAt: undefined,
      };
    }
    if (isNewMin) return { ...state, minValue, minAt, justCounted: false };
  }
  return state.justCounted ? { ...state, justCounted: false } : state;
}
