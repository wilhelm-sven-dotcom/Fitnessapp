/**
 * Rep counting as a small hysteresis state machine over one tracked angle.
 * `downBelow < upAbove` gives a dead-band so jitter near a threshold doesn't
 * double-count. Pure and unit-testable.
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

export interface RepState {
  phase: RepPhase;
  reps: number;
  /** True on the frame a rep was just counted (for cue/vibration). */
  justCounted: boolean;
}

export function initRepState(): RepState {
  return { phase: "up", reps: 0, justCounted: false };
}

export function updateRep(state: RepState, value: number, cfg: RepConfig): RepState {
  if (state.phase === "up" && value < cfg.downBelow) {
    return { phase: "down", reps: state.reps, justCounted: false };
  }
  if (state.phase === "down" && value > cfg.upAbove) {
    return { phase: "up", reps: state.reps + 1, justCounted: true };
  }
  return state.justCounted ? { ...state, justCounted: false } : state;
}
