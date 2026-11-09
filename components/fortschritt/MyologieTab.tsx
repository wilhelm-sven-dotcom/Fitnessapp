"use client";

import { useMemo } from "react";
import { MyologieFigur } from "@/components/phasen/MyologieFigur";
import { MuscleBalanceCard } from "@/components/progress/MuscleBalanceCard";
import { MuscleVolumeBars } from "@/components/progress/MuscleVolumeBars";
import { Card } from "@/components/ui/Card";
import { useTraining } from "@/components/providers/TrainingProvider";
import { muskelStufen, type MyologieStufe } from "@/lib/heat";
import { weeklyMuscleVolume } from "@/lib/volume";

const STUFEN: MyologieStufe[] = [1, 2, 3, 4];
const ROEMISCH = ["I", "II", "III", "IV"];

/**
 * Muskeln: die Wochenarbeit je Muskelgruppe als diskrete Stufen (Quartile
 * aufs Wochenziel) auf zwei Figuren (vorn/hinten), darunter die Sätze je
 * Muskel mit Zielband und die Muskel-Balance (Radar, Verhältnisse).
 */
export function MyologieTab() {
  const { muscleVolumes, log, allLib } = useTraining();
  const stufen = useMemo(() => muskelStufen(muscleVolumes), [muscleVolumes]);
  // Vorwochen-Volumen für die gestrichelte Kontur im Radar.
  const prevMuscleVolumes = useMemo(
    () => weeklyMuscleVolume(log, allLib, new Date(Date.now() - 7 * 86400000)),
    [log, allLib],
  );

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex justify-between text-3xs font-bold text-muted">
          <span>Muskelgruppen</span>
          <span>Diese Woche</span>
        </div>
        <div className="mt-3 flex items-start justify-center gap-6">
          <div className="w-32">
            <MyologieFigur seite="vorn" stufen={stufen} />
            <p className="mt-1.5 text-center text-sm text-muted">Vorn</p>
          </div>
          <div className="w-32">
            <MyologieFigur seite="hinten" stufen={stufen} />
            <p className="mt-1.5 text-center text-sm text-muted">Hinten</p>
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
                <span className="text-sm text-muted">{ROEMISCH[i]}</span>
              </span>
            ))}
          </span>
          <span className="text-sm text-muted">Stufe = Anteil am Wochenziel</span>
        </div>
      </Card>

      {muscleVolumes.some((m) => m.sets > 0) && <MuscleVolumeBars data={muscleVolumes} />}

      <MuscleBalanceCard muscleVolumes={muscleVolumes} prevMuscleVolumes={prevMuscleVolumes} />
    </div>
  );
}
