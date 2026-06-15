import type { Pattern } from "@/lib/types";
import type { RepConfig } from "./rep-counter";

export interface PoseExerciseConfig {
  label: string;
  rep: RepConfig;
  /**
   * Warn when the torso leans further forward than this (degrees from vertical).
   * Tuned per movement — a hinge expects a deep lean, a squat does not. The
   * back-safety signal: rounding/folding under load.
   */
  maxTorsoLean?: number;
  /** Plain-language hint about the tracked range of motion. */
  hint: string;
}

/**
 * Maps a movement pattern to what the camera tracks. Covers the main loaded
 * patterns; accessories like lateral raises / core holds have no reliable rep
 * signal and return null (the UI then shows the skeleton without a counter).
 */
const POSE_CONFIG: Partial<Record<Pattern, PoseExerciseConfig>> = {
  squat: {
    label: "Kniebeuge",
    rep: { metric: "kneeAngle", downBelow: 100, upAbove: 160 },
    maxTorsoLean: 55,
    hint: "Tief beugen, Oberkörper aufrecht.",
  },
  lunge: {
    label: "Ausfallschritt",
    rep: { metric: "kneeAngle", downBelow: 110, upAbove: 160 },
    maxTorsoLean: 45,
    hint: "Vorderes Knie über dem Fuß, Rumpf aufrecht.",
  },
  hinge: {
    label: "Hüfte / Hinge",
    rep: { metric: "hipAngle", downBelow: 120, upAbove: 160 },
    maxTorsoLean: 80,
    hint: "Aus der Hüfte, Rücken gerade — nicht runden.",
  },
  hpush: {
    label: "Druck horizontal",
    rep: { metric: "elbowAngle", downBelow: 100, upAbove: 160 },
    hint: "Kontrolliert absenken, voll strecken.",
  },
  vpush: {
    label: "Druck über Kopf",
    rep: { metric: "elbowAngle", downBelow: 100, upAbove: 165 },
    maxTorsoLean: 20,
    hint: "Oben ausstrecken, kein Hohlkreuz.",
  },
  hpull: {
    label: "Zug horizontal",
    rep: { metric: "elbowAngle", downBelow: 100, upAbove: 160 },
    maxTorsoLean: 70,
    hint: "Eng zur Hüfte ziehen, Rücken gerade.",
  },
  vpull: {
    label: "Zug vertikal",
    rep: { metric: "elbowAngle", downBelow: 90, upAbove: 160 },
    hint: "Sauber hochziehen, kontrolliert ablassen.",
  },
  arm: {
    label: "Arme",
    rep: { metric: "elbowAngle", downBelow: 80, upAbove: 150 },
    hint: "Ellbogen fix, kein Schwung.",
  },
};

export function configForPattern(p: Pattern): PoseExerciseConfig | null {
  return POSE_CONFIG[p] ?? null;
}
