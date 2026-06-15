import { MUSCLE_LABEL, VOLUME_TARGET, type MuscleVolume } from "@/lib/volume";
import type { Muscle } from "@/lib/types";

/** Short labels so all nine spokes fit around the radar. */
const SHORT_LABEL: Record<Muscle, string> = {
  chest: "Brust",
  back: "Rücken",
  shoulders: "Schultern",
  biceps: "Bizeps",
  triceps: "Trizeps",
  quads: "Quad",
  hamstrings: "Beinr.",
  glutes: "Gesäß",
  core: "Core",
};

export interface RadarAxis {
  muscle: Muscle;
  label: string;
  short: string;
  sets: number;
  /** 0..1+, sets relative to the upper target. 1 = top of the 10–20 range. */
  value: number;
}

export function radarAxes(vols: MuscleVolume[]): RadarAxis[] {
  return vols.map((v) => ({
    muscle: v.muscle,
    label: MUSCLE_LABEL[v.muscle],
    short: SHORT_LABEL[v.muscle],
    sets: v.sets,
    value: VOLUME_TARGET.max > 0 ? v.sets / VOLUME_TARGET.max : 0,
  }));
}

export interface BalanceRatio {
  key: string;
  label: string;
  aLabel: string;
  bLabel: string;
  a: number;
  b: number;
  /** -1..1 — 0 balanced, positive = a-heavy, negative = b-heavy. */
  skew: number;
  status: "balanced" | "skewed";
}

const PAIRS: {
  key: string;
  label: string;
  aLabel: string;
  bLabel: string;
  a: Muscle[];
  b: Muscle[];
}[] = [
  {
    key: "pushpull",
    label: "Druck / Zug",
    aLabel: "Druck",
    bLabel: "Zug",
    a: ["chest", "shoulders", "triceps"],
    b: ["back", "biceps"],
  },
  {
    key: "frontback",
    label: "Beine vorne / hinten",
    aLabel: "Vorne",
    bLabel: "Hinten",
    a: ["quads"],
    b: ["hamstrings", "glutes"],
  },
  {
    key: "upperlower",
    label: "Oberkörper / Beine",
    aLabel: "Oben",
    bLabel: "Beine",
    a: ["chest", "back", "shoulders", "biceps", "triceps"],
    b: ["quads", "hamstrings", "glutes"],
  },
];

const sumSets = (vols: MuscleVolume[], muscles: Muscle[]) =>
  vols.filter((v) => muscles.includes(v.muscle)).reduce((s, v) => s + v.sets, 0);

/** A "balanced" rating tolerates up to ~2:1 before flagging an imbalance. */
const BALANCED_SKEW = 0.34;

export function balanceRatios(vols: MuscleVolume[]): BalanceRatio[] {
  return PAIRS.map((p) => {
    const a = Math.round(sumSets(vols, p.a) * 10) / 10;
    const b = Math.round(sumSets(vols, p.b) * 10) / 10;
    const total = a + b;
    const skew = total > 0 ? (a - b) / total : 0;
    return {
      key: p.key,
      label: p.label,
      aLabel: p.aLabel,
      bLabel: p.bLabel,
      a,
      b,
      skew,
      status: Math.abs(skew) <= BALANCED_SKEW ? "balanced" : "skewed",
    };
  });
}
