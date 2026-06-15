import type { PoseMetrics } from "./angles";
import type { PoseExerciseConfig } from "./exercise-pose-config";

export interface FormFinding {
  level: "warn";
  message: string;
}

/**
 * Per-frame form check. The headline rule is back-safety: when the torso leans
 * further forward than the movement should allow, the lower back is likely
 * rounding under load — warn. Returns null when form looks fine or the pose
 * isn't confidently visible.
 */
export function checkForm(m: PoseMetrics, cfg: PoseExerciseConfig): FormFinding | null {
  if (!m.visible) return null;
  if (cfg.maxTorsoLean != null && m.torsoLean != null && m.torsoLean > cfg.maxTorsoLean) {
    return {
      level: "warn",
      message: "Oberkörper kippt zu weit nach vorne — Rücken neutral halten.",
    };
  }
  return null;
}
