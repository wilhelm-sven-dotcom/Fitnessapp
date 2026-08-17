"use client";

import { useMemo } from "react";
import { MyologieFigur } from "@/components/phasen/MyologieFigur";
import { Card } from "@/components/ui/Card";
import { useTraining } from "@/components/providers/TrainingProvider";
import { muskelStufen, type MyologieStufe } from "@/lib/heat";
import { MUSCLE_LABEL, MUSCLE_ORDER, volumeTargetFor } from "@/lib/volume";
import { cn } from "@/lib/utils";

const STUFEN: MyologieStufe[] = [1, 2, 3, 4];
const ROEMISCH = ["I", "II", "III", "IV"];

/**
 * Tafel: Myologie — die Wochenarbeit je Muskelgruppe als diskrete Blaustufen
 * (Quartile aufs Wochenziel) auf zwei Frontalfiguren (vorn/hinten), plus das
 * Gruppenregister mit 4er-Stufenblöcken. Ersetzt die alte Grün-Heatmap.
 */
export function MyologieTab() {
  const { muscleVolumes } = useTraining();
  const stufen = useMemo(() => muskelStufen(muscleVolumes), [muscleVolumes]);
  const zielVon = useMemo(
    () => new Map(muscleVolumes.map((v) => [v.muscle, volumeTargetFor(v.muscle).max])),
    [muscleVolumes],
  );
  const setsVon = useMemo(
    () => new Map(muscleVolumes.map((v) => [v.muscle, v.sets])),
    [muscleVolumes],
  );

  return (
    <div>
      <Card className="mb-4">
        <div className="flex justify-between font-mono text-3xs font-medium uppercase tracking-gesperrt text-muted">
          <span>Tafel · Myologie</span>
          <span>Diese Woche</span>
        </div>
        <div className="mt-3 flex items-start justify-center gap-6">
          <div className="w-32">
            <MyologieFigur seite="vorn" stufen={stufen} />
            <p className="mt-1.5 text-center font-mono text-4xs font-semibold uppercase tracking-gesperrt text-muted">
              Vorn
            </p>
          </div>
          <div className="w-32">
            <MyologieFigur seite="hinten" stufen={stufen} />
            <p className="mt-1.5 text-center font-mono text-4xs font-semibold uppercase tracking-gesperrt text-muted">
              Hinten
            </p>
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between gap-2 border-t border-line-card pt-2.5">
          <span className="flex items-center gap-1.5">
            {STUFEN.map((n, i) => (
              <span key={n} className="flex items-center gap-1">
                <span
                  aria-hidden
                  className="h-2.5 w-2.5 rounded-xs"
                  style={{ backgroundColor: `var(--stufe-${n})` }}
                />
                <span className="font-mono text-4xs font-medium uppercase tracking-gesperrt text-muted">
                  {ROEMISCH[i]}
                </span>
              </span>
            ))}
          </span>
          <span className="font-mono text-4xs font-medium uppercase tracking-gesperrt text-muted">
            Schema, keine Anatomie
          </span>
        </div>
      </Card>

      {/* Gruppenregister: jede Muskelgruppe mit 4er-Stufenblock + Satz-Stand. */}
      <p className="mb-1 font-mono text-3xs font-semibold uppercase tracking-gesperrt-2 text-muted">
        Gruppenregister
      </p>
      <div>
        {MUSCLE_ORDER.map((m, i) => {
          const stufe = stufen.get(m) ?? 0;
          const sets = setsVon.get(m) ?? 0;
          const ziel = zielVon.get(m) ?? volumeTargetFor(m).max;
          return (
            <div
              key={m}
              className={cn(
                "flex items-center justify-between gap-3 border-t border-line py-2.5",
                i === MUSCLE_ORDER.length - 1 && "border-b",
              )}
            >
              <span className="min-w-0 flex-1 truncate text-sm text-fg">
                {MUSCLE_LABEL[m]}
              </span>
              <span className="flex shrink-0 items-center gap-1" aria-hidden>
                {STUFEN.map((n) => (
                  <span
                    key={n}
                    className={cn("h-2.5 w-5 rounded-xs", stufe < n && "border border-line-card")}
                    style={stufe >= n ? { backgroundColor: `var(--stufe-${n})` } : undefined}
                  />
                ))}
              </span>
              <span className="w-14 shrink-0 text-right font-mono text-xs tabular-nums text-muted">
                {sets}/{ziel}
              </span>
            </div>
          );
        })}
      </div>
      <p className="mt-2 font-mono text-4xs font-medium uppercase tracking-gesperrt text-muted">
        Stufen = Quartile aufs Wochenziel der Gruppe
      </p>
    </div>
  );
}
