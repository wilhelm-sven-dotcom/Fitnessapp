import { volumeTargetFor, type MuscleVolume } from "@/lib/volume";
import type { Muscle } from "@/lib/types";

/**
 * Die eine Heat-Wahrheit für den „grünen Athleten" — von der Heatmap-Card
 * (CSS `color-mix`) UND dem Wochen-Poster (Canvas, `mixHex`) konsumiert,
 * damit Card und Poster nie auseinanderlaufen. Schema, keine Anatomie:
 * Kombi-Segmente nehmen das MAX ihrer Muskeln.
 */

/**
 * Wochen-Heatmap: Bone-Segmente („a>b") der stehenden Figur (squat_bw) je
 * Ansicht → beteiligte Muskeln. Die Front trägt die vorderen Muskeln, das
 * Profil die hintere Kette (Rücken, Schultern/Trizeps, Beinrückseite/Gesäß).
 */
export const MUSCLE_BONES_HEAT: Record<
  "front" | "side",
  Record<string, readonly Muscle[]>
> = {
  front: {
    "sh>hip": ["chest", "core"],
    "sh>elbowL": ["biceps"],
    "sh>elbowR": ["biceps"],
    "elbowL>handL": ["forearms"],
    "elbowR>handR": ["forearms"],
    "hip>kneeL": ["quads"],
    "hip>kneeR": ["quads"],
    "kneeL>footL": ["calves"],
    "kneeR>footR": ["calves"],
  },
  side: {
    "sh>hip": ["back"],
    "sh>elbow": ["shoulders", "triceps"],
    "elbow>hand": ["forearms"],
    "hip>knee": ["hamstrings", "glutes"],
    "knee>foot": ["calves"],
  },
};

/** Grün-Anteile der vier Stufen (Prozent Richtung `--gruen`). */
export const HEAT_STEPS = [35, 55, 78, 100] as const;

/** 0 = untrainiert, sonst eine der vier Stufen. */
export type HeatStep = 0 | (typeof HEAT_STEPS)[number];

/** Intensität 0..1 (Anteil am Wochen-Maximum je Muskel) → Stufe (Quartile). */
export function heatStepFor(p: number): (typeof HEAT_STEPS)[number] {
  if (p < 0.25) return HEAT_STEPS[0];
  if (p < 0.5) return HEAT_STEPS[1];
  if (p < 0.75) return HEAT_STEPS[2];
  return HEAT_STEPS[3];
}

/** Je Ansicht: Bone-Key → Stufe. Intensität = sets / volumeTargetFor(m).max. */
export function boneHeatSteps(muscleVolumes: MuscleVolume[]): {
  front: Record<string, HeatStep>;
  side: Record<string, HeatStep>;
} {
  const p = new Map<string, number>();
  for (const v of muscleVolumes) {
    p.set(v.muscle, Math.min(1, Math.max(0, v.sets / volumeTargetFor(v.muscle).max)));
  }
  const paint = (view: "front" | "side"): Record<string, HeatStep> =>
    Object.fromEntries(
      Object.entries(MUSCLE_BONES_HEAT[view]).map(([bone, ms]) => {
        const m = Math.max(...ms.map((k) => p.get(k) ?? 0));
        return [bone, m <= 0 ? 0 : heatStepFor(m)];
      }),
    );
  return { front: paint("front"), side: paint("side") };
}

/* ── Myologie-Tafel (Platte 311): diskrete Blaustufen statt Grün-Mix ────── */

/** Stufe I–IV (Quartile), 0 = untrainiert — Konsument MyologieFigur/-Tab. */
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

function parseHex(hex: string): [number, number, number] | null {
  const h = hex.trim().replace("#", "");
  const full =
    h.length === 3
      ? h
          .split("")
          .map((c) => c + c)
          .join("")
      : h;
  if (!/^[0-9a-fA-F]{6}$/.test(full)) return null;
  return [
    parseInt(full.slice(0, 2), 16),
    parseInt(full.slice(2, 4), 16),
    parseInt(full.slice(4, 6), 16),
  ];
}

/**
 * RGB-Lerp zweier #rrggbb-Farben — Canvas kennt kein `color-mix()`/`var()`.
 * `t` = Anteil von `a` (wie „a t·100 %, b Rest" in color-mix). `null` bei
 * unparsbaren Werten — der Aufrufer entscheidet den Fallback (volles Grün).
 */
export function mixHex(a: string, b: string, t: number): string | null {
  const pa = parseHex(a);
  const pb = parseHex(b);
  if (!pa || !pb) return null;
  const f = Math.min(1, Math.max(0, t));
  const ch = (i: number) => Math.round(pa[i] * f + pb[i] * (1 - f));
  return `#${[ch(0), ch(1), ch(2)].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}
