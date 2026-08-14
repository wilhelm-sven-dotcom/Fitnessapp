"use client";

import { useEffect, useMemo, useState } from "react";
import { FigurePanel } from "@/components/figures/FigurePanel";
import { FIG, MUSCLE_BONES_HEAT } from "@/components/figures/figureData";
import { Card } from "@/components/ui/Card";
import { volumeTargetFor, type MuscleVolume } from "@/lib/volume";

// Grün-Rampe (color-mix-Anteil Richtung Wochen-Maximum je Muskel):
// vier Stufen, damit „angefangen" und „voll im Ziel" unterscheidbar sind.
const STEPS = [35, 55, 78, 100] as const;

function stepFor(p: number): (typeof STEPS)[number] {
  if (p < 0.25) return STEPS[0];
  if (p < 0.5) return STEPS[1];
  if (p < 0.75) return STEPS[2];
  return STEPS[3];
}

/**
 * Der grüne Athlet: die Wochensätze färben die stehende Piktogramm-Figur —
 * vorn die Front-Muskeln, im Profil die hintere Kette. Schema, keine
 * Anatomie (Kombi-Segmente nehmen das MAX ihrer Muskeln); die exakten
 * Zahlen stehen im Wochen-Volumen darunter.
 */
export function MuscleHeatmapCard({ muscleVolumes }: { muscleVolumes: MuscleVolume[] }) {
  // color-mix erst nach dem Mount einschalten (SSR-stabil). Ohne Browser-
  // Support bleibt die Binär-Stufe: jede trainierte Zone in vollem Grün.
  const [mix, setMix] = useState(false);
  useEffect(() => {
    setMix(
      typeof CSS !== "undefined" &&
        !!CSS.supports?.("color", "color-mix(in srgb, red 50%, blue)"),
    );
  }, []);

  const { tints, hit } = useMemo(() => {
    const p = new Map<string, number>();
    for (const v of muscleVolumes) {
      p.set(
        v.muscle,
        Math.min(1, Math.max(0, v.sets / volumeTargetFor(v.muscle).max)),
      );
    }
    const color = (muscles: readonly string[]): string => {
      const m = Math.max(...muscles.map((k) => p.get(k) ?? 0));
      if (m <= 0) return "var(--surface-2)";
      if (!mix) return "var(--gruen)";
      return `color-mix(in srgb, var(--gruen) ${stepFor(m)}%, var(--surface-2))`;
    };
    const paint = (view: "front" | "side") =>
      Object.fromEntries(
        Object.entries(MUSCLE_BONES_HEAT[view]).map(([bone, ms]) => [bone, color(ms)]),
      );
    return {
      tints: { front: paint("front"), side: paint("side") },
      hit: muscleVolumes.filter((v) => v.status !== "under").length,
    };
  }, [muscleVolumes, mix]);

  const fig = FIG.squat_bw;
  if (!fig) return null;

  return (
    <Card variant="elevated" className="mb-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-mono text-xs uppercase tracking-widest text-accent-2">
            Muskel-Heatmap
          </p>
          <p className="mt-1 stretch-display font-display text-3xl font-bold leading-none tabular-nums text-fg">
            {hit}
            <span className="text-base font-medium tracking-normal text-muted">
              {" "}
              von {muscleVolumes.length}
            </span>
          </p>
          <p className="mt-1 text-xs text-muted">Muskeln im Wochenziel</p>
        </div>
        <span className="shrink-0 text-xs text-muted">Diese Woche</span>
      </div>

      <div className="mt-3 flex items-start gap-3">
        <FigurePanel
          label="Vorn"
          fig={fig}
          viewKey="front"
          freeze={0}
          boneTint={tints.front}
        />
        <FigurePanel
          label="Hinten"
          fig={fig}
          viewKey="side"
          freeze={0}
          boneTint={tints.side}
        />
      </div>

      <div className="mt-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-muted">wenig</span>
          {STEPS.map((x) => (
            <span
              key={x}
              className="h-3 w-3 rounded-sm"
              style={{
                background: mix
                  ? `color-mix(in srgb, var(--gruen) ${x}%, var(--surface-2))`
                  : "var(--gruen)",
              }}
            />
          ))}
          <span className="text-xs text-muted">Ziel</span>
        </div>
        <span className="text-xs text-faint">Schema, keine Anatomie</span>
      </div>
    </Card>
  );
}
