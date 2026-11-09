"use client";

import { Card } from "@/components/ui/Card";
import { MUSCLE_LABEL, volumeTargetFor, type MuscleVolume } from "@/lib/volume";

// Status als Tokens: unter Ziel = Tinte, im Ziel = Erfolg, darüber = Warnung.
const statusVar: Record<MuscleVolume["status"], string> = {
  under: "var(--fg)",
  in: "var(--erfolg)",
  over: "var(--warnung)",
};

const fmt = (n: number) => n.toLocaleString("de-DE", { maximumFractionDigits: 1 });

/**
 * Sätze je Muskel diese Woche: flacher Balken, dahinter das Zielband
 * (Skala JE Zeile aus dem Muskel-Ziel — kleine Muskeln haben ein niedrigeres
 * Band), rechts „Sätze/Ziel“ als Zahl. Die Farbe ist nie allein: die Zahl
 * steht daneben, die Legende erklärt die drei Zustände.
 */
export function MuscleVolumeBars({ data }: { data: MuscleVolume[] }) {
  return (
    <Card>
      <div className="mb-3 flex items-baseline justify-between gap-2">
        <p className="text-3xs font-bold text-muted">
          Sätze je Muskel
        </p>
        <p className="text-sm text-muted">diese Woche / Ziel</p>
      </div>
      <div className="space-y-2.5">
        {data.map((m) => {
          const target = volumeTargetFor(m.muscle);
          const scaleMax = target.max * 1.2;
          const pct = Math.min(100, (m.sets / scaleMax) * 100);
          return (
            <div key={m.muscle} className="flex items-center gap-3">
              <span className="w-24 shrink-0 truncate text-sm text-fg">{MUSCLE_LABEL[m.muscle]}</span>
              <div className="relative h-2.5 flex-1 overflow-hidden rounded-pill bg-surface-2">
                <div
                  className="absolute inset-y-0"
                  style={{
                    left: `${(target.min / scaleMax) * 100}%`,
                    width: `${((target.max - target.min) / scaleMax) * 100}%`,
                    backgroundColor: "var(--line)",
                  }}
                />
                <div
                  className="absolute inset-y-0 left-0 rounded-pill transition-[width] duration-500 ease-out"
                  style={{ width: `${pct}%`, backgroundColor: statusVar[m.status] }}
                />
              </div>
              <span className="w-12 shrink-0 text-right text-sm tabular-nums text-muted">
                {fmt(m.sets)}/{target.max}
              </span>
            </div>
          );
        })}
      </div>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 border-t border-line-card pt-2.5 text-sm text-muted">
        <span className="flex items-center gap-1.5">
          <span aria-hidden className="h-2.5 w-2.5 rounded-pill bg-fg" /> unter Ziel
        </span>
        <span className="flex items-center gap-1.5">
          <span aria-hidden className="h-2.5 w-2.5 rounded-pill bg-erfolg" /> im Ziel
        </span>
        <span className="flex items-center gap-1.5">
          <span aria-hidden className="h-2.5 w-2.5 rounded-pill bg-warnung" /> darüber
        </span>
        <span className="flex items-center gap-1.5">
          <span aria-hidden className="h-2.5 w-4 rounded-pill bg-line" /> Zielbereich
        </span>
      </div>
    </Card>
  );
}
