"use client";

import { useEffect, useMemo, useState } from "react";
import { FigurePanel } from "@/components/figures/FigurePanel";
import { FIG } from "@/components/figures/figureData";
import { Card } from "@/components/ui/Card";
import { boneHeatSteps, HEAT_STEPS, type HeatStep } from "@/lib/heat";
import type { MuscleVolume } from "@/lib/volume";

/**
 * Der grüne Athlet: die Wochensätze färben die stehende Piktogramm-Figur —
 * vorn die Front-Muskeln, im Profil die hintere Kette. Stufen-Mathematik
 * lebt in lib/heat (geteilt mit dem Wochen-Poster); hier wird nur noch
 * color-mix daraus. Schema, keine Anatomie; die exakten Zahlen stehen im
 * Wochen-Volumen darunter.
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
    const steps = boneHeatSteps(muscleVolumes);
    const color = (step: HeatStep): string => {
      if (step <= 0) return "var(--surface-2)";
      if (!mix) return "var(--gruen)";
      return `color-mix(in srgb, var(--gruen) ${step}%, var(--surface-2))`;
    };
    const paint = (m: Record<string, HeatStep>) =>
      Object.fromEntries(Object.entries(m).map(([bone, s]) => [bone, color(s)]));
    return {
      tints: { front: paint(steps.front), side: paint(steps.side) },
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
          <p className="mt-1 font-mono text-3xl font-bold leading-none tabular-nums text-fg">
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
          {HEAT_STEPS.map((x) => (
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
