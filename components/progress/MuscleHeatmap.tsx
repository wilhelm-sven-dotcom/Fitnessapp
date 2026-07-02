"use client";

import { FIG } from "@/components/figures/figureData";
import { FigurePanel } from "@/components/figures/FigurePanel";
import { Card } from "@/components/ui/Card";
import { Reveal } from "@/components/ui/Reveal";
import { MUSCLE_LABEL, MUSCLE_ORDER, VOLUME_TARGET, type MuscleVolume } from "@/lib/volume";
import type { Muscle } from "@/lib/types";

// Weekly volume → heat colour. Four buckets mirror the MuscleVolume status,
// with 0 sets ("ruhig") split out from an under-target build.
function heat(v?: MuscleVolume): string {
  if (!v || v.sets === 0) return "var(--faint)";
  if (v.status === "under") return "var(--accent-2)";
  if (v.status === "in") return "var(--accent)";
  return "#ff375f"; // over — status.danger ("heiß")
}

const LEGEND = [
  { c: "var(--faint)", label: "ruhig" },
  { c: "var(--accent-2)", label: "aufbauend" },
  { c: "var(--accent)", label: "optimal" },
  { c: "#ff375f", label: "viel" },
];

/**
 * Weekly muscle heatmap: two neutral stick figures (front + side) whose body
 * regions are tinted by how much each was worked this week, over a precise
 * 9-muscle legend grid. The figure gives the at-a-glance gestalt (torso split
 * front=Brust / side=Rücken, plus arm- and leg-region heat); the grid carries
 * the exact per-muscle set counts. Colours are token-driven and theme-safe.
 */
export function MuscleHeatmap({ data }: { data: MuscleVolume[] }) {
  const S = Object.fromEntries(data.map((m) => [m.muscle, m])) as Record<Muscle, MuscleVolume>;
  // A region's tint follows its most-worked muscle (the legend keeps the detail).
  const hottest = (ms: Muscle[]) =>
    ms.map((m) => S[m]).reduce((a, b) => ((b?.sets ?? 0) > (a?.sets ?? 0) ? b : a));
  const armC = heat(hottest(["shoulders", "biceps", "triceps"]));
  const legC = heat(hottest(["quads", "hamstrings", "glutes"]));

  const front: Record<string, string> = {
    "sh>hip": heat(S.chest),
    "sh>elbowL": armC,
    "sh>elbowR": armC,
    "elbowL>handL": armC,
    "elbowR>handR": armC,
    "hip>kneeL": legC,
    "hip>kneeR": legC,
    "kneeL>footL": legC,
    "kneeR>footR": legC,
  };
  const side: Record<string, string> = {
    "sh>hip": heat(S.back),
    "sh>elbow": armC,
    "elbow>hand": armC,
    "hip>knee": legC,
    "knee>foot": legC,
  };

  return (
    <Reveal>
      <Card className="mb-3">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="font-semibold leading-tight">Wochen-Heatmap</h3>
          <span className="text-xs text-muted">
            Ziel {VOLUME_TARGET.min}–{VOLUME_TARGET.max} Sätze
          </span>
        </div>
        <div className="flex items-end justify-center gap-4">
          <FigurePanel label="Vorne" fig={FIG.squat_bw} viewKey="front" freeze={0} boneTint={front} />
          <FigurePanel label="Seite" fig={FIG.squat_bw} viewKey="side" freeze={0} boneTint={side} />
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
          {LEGEND.map((l) => (
            <span key={l.label} className="flex items-center gap-1 text-xs text-muted">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: l.c }} aria-hidden />
              {l.label}
            </span>
          ))}
        </div>
        <div className="mt-4 grid grid-cols-3 gap-x-3 gap-y-2">
          {MUSCLE_ORDER.map((m) => {
            const v = S[m];
            return (
              <div key={m} className="flex items-center gap-1.5">
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: heat(v) }}
                  aria-hidden
                />
                <span className="min-w-0 flex-1 truncate text-xs text-muted">{MUSCLE_LABEL[m]}</span>
                <span className="shrink-0 font-mono text-xs tabular-nums text-fg">{v?.sets ?? 0}</span>
              </div>
            );
          })}
        </div>
      </Card>
    </Reveal>
  );
}
