import { volumeTargetFor, type MuscleVolume } from "@/lib/volume";
import type { Muscle } from "@/lib/types";

/**
 * Myologie-Tafel (Platte 311): das Wochenvolumen je Muskelgruppe wird in
 * VIER diskrete Blaustufen übersetzt (Quartile auf dem Volumenziel) —
 * Konsumenten sind MyologieFigur/-Tab. Schema, keine Anatomie. Die alten
 * Grün-Mix-Helfer (boneHeatSteps/mixHex) sind mit Heatmap-Card und
 * Wochen-Poster entfallen; das Cyanotypie-Poster kennt keine Muskel-Hitze.
 */

/** Stufe I–IV (Quartile), 0 = untrainiert. */
export type MyologieStufe = 0 | 1 | 2 | 3 | 4;

export function stufeFor(p: number): MyologieStufe {
  if (p <= 0) return 0;
  if (p < 0.25) return 1;
  if (p < 0.5) return 2;
  if (p < 0.75) return 3;
  return 4;
}

/** Intensität je Muskel: sets / volumeTargetFor(m).max, geklemmt auf 0..1. */
export function muskelStufen(muscleVolumes: MuscleVolume[]): Map<Muscle, MyologieStufe> {
  const m = new Map<Muscle, MyologieStufe>();
  for (const v of muscleVolumes) {
    const p = Math.min(1, Math.max(0, v.sets / volumeTargetFor(v.muscle).max));
    m.set(v.muscle, stufeFor(p));
  }
  return m;
}
