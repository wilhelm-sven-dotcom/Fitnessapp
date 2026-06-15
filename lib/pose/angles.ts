/**
 * Pure geometry over MediaPipe pose landmarks (normalized 0..1, y grows down).
 * No browser APIs here — unit-testable.
 */

export interface Landmark {
  x: number;
  y: number;
  z?: number;
  visibility?: number;
}

/** BlazePose landmark indices we use. */
export const LM = {
  nose: 0,
  lShoulder: 11,
  rShoulder: 12,
  lElbow: 13,
  rElbow: 14,
  lWrist: 15,
  rWrist: 16,
  lHip: 23,
  rHip: 24,
  lKnee: 25,
  rKnee: 26,
  lAnkle: 27,
  rAnkle: 28,
} as const;

/** Interior angle at b for the a–b–c joint, in degrees (0..180). */
export function jointAngle(a: Landmark, b: Landmark, c: Landmark): number {
  const abx = a.x - b.x;
  const aby = a.y - b.y;
  const cbx = c.x - b.x;
  const cby = c.y - b.y;
  const mag = Math.hypot(abx, aby) * Math.hypot(cbx, cby);
  if (mag === 0) return 180;
  const cos = Math.max(-1, Math.min(1, (abx * cbx + aby * cby) / mag));
  return (Math.acos(cos) * 180) / Math.PI;
}

export function midpoint(a: Landmark, b: Landmark): Landmark {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

/** Forward/sideways lean of the torso from vertical, in degrees (0 = upright). */
export function torsoLean(shoulderMid: Landmark, hipMid: Landmark): number {
  const dx = shoulderMid.x - hipMid.x;
  const dy = shoulderMid.y - hipMid.y;
  return (Math.atan2(Math.abs(dx), Math.abs(dy)) * 180) / Math.PI;
}

export interface PoseMetrics {
  kneeAngle: number | null;
  hipAngle: number | null;
  elbowAngle: number | null;
  torsoLean: number | null;
  visible: boolean;
}

const vis = (lms: Landmark[], i: number) => lms[i]?.visibility ?? 1;

/** Pick the better-visible of two sides for a joint; null if neither is confident. */
function bestAngle(
  lms: Landmark[],
  left: [number, number, number],
  right: [number, number, number],
): number | null {
  const lv = left.reduce((s, i) => s + vis(lms, i), 0);
  const rv = right.reduce((s, i) => s + vis(lms, i), 0);
  const use = lv >= rv ? left : right;
  if (Math.min(...use.map((i) => vis(lms, i))) < 0.3) return null;
  return jointAngle(lms[use[0]], lms[use[1]], lms[use[2]]);
}

export function poseMetrics(lms: Landmark[]): PoseMetrics {
  if (!lms || lms.length < 29) {
    return { kneeAngle: null, hipAngle: null, elbowAngle: null, torsoLean: null, visible: false };
  }
  const kneeAngle = bestAngle(lms, [LM.lHip, LM.lKnee, LM.lAnkle], [LM.rHip, LM.rKnee, LM.rAnkle]);
  const hipAngle = bestAngle(lms, [LM.lShoulder, LM.lHip, LM.lKnee], [LM.rShoulder, LM.rHip, LM.rKnee]);
  const elbowAngle = bestAngle(lms, [LM.lShoulder, LM.lElbow, LM.lWrist], [LM.rShoulder, LM.rElbow, LM.rWrist]);
  const shoulderMid = midpoint(lms[LM.lShoulder], lms[LM.rShoulder]);
  const hipMid = midpoint(lms[LM.lHip], lms[LM.rHip]);
  const lean = torsoLean(shoulderMid, hipMid);
  const visible =
    Math.min(vis(lms, LM.lShoulder), vis(lms, LM.rShoulder), vis(lms, LM.lHip), vis(lms, LM.rHip)) >
    0.3;
  return { kneeAngle, hipAngle, elbowAngle, torsoLean: lean, visible };
}
