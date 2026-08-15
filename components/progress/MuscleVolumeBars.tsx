"use client";

import { Card } from "@/components/ui/Card";
import { MUSCLE_LABEL, volumeTargetFor, type MuscleVolume } from "@/lib/volume";

// Status-Farben als Tokens (theme-korrekt): unter Ziel = Blau, im Ziel = Grün,
// über Ziel = Gelb — identisch zur Status-Semantik in tailwind.config.ts.
const statusVar: Record<MuscleVolume["status"], string> = {
  under: "var(--accent)",
  in: "var(--gruen)",
  over: "var(--gelb)",
};

const fmt = (n: number) => n.toLocaleString("de-DE", { maximumFractionDigits: 1 });

/**
 * Wochen-Volumen je Muskel — flache Balken (keine Glows/Verläufe), Zielband
 * und Skala JE Zeile aus dem per-Muskel-Ziel, damit Bild und Status-Farbe
 * dieselbe Wahrheit erzählen (kleine Muskeln haben ein niedrigeres Band).
 * Breiten-Übergang nur bei Datenänderung (CSS-Transition, kein Mount-Reveal).
 */
export function MuscleVolumeBars({ data }: { data: MuscleVolume[] }) {
  return (
    <Card className="mb-3">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-semibold leading-tight">Wochen-Volumen</h3>
        <span className="text-xs text-muted">Sätze · Ziel je Muskel</span>
      </div>
      <div className="space-y-2">
        {data.map((m) => {
          const target = volumeTargetFor(m.muscle);
          const scaleMax = target.max * 1.2;
          const pct = Math.min(100, (m.sets / scaleMax) * 100);
          return (
            <div key={m.muscle} className="flex items-center gap-3">
              <span className="w-24 shrink-0 text-xs text-muted">
                {MUSCLE_LABEL[m.muscle]}
              </span>
              <div className="relative h-2.5 flex-1 overflow-hidden rounded-full bg-surface-2">
                <div
                  className="absolute inset-y-0"
                  style={{
                    left: `${(target.min / scaleMax) * 100}%`,
                    width: `${((target.max - target.min) / scaleMax) * 100}%`,
                    backgroundColor: "var(--line)",
                  }}
                />
                <div
                  className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-500 ease-out"
                  style={{ width: `${pct}%`, backgroundColor: statusVar[m.status] }}
                />
              </div>
              <span className="w-9 shrink-0 text-right font-mono text-xs tabular-nums text-muted">
                {fmt(m.sets)}
              </span>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
