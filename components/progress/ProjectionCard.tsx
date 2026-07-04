"use client";

import { Telescope } from "lucide-react";
import { TrendChart } from "@/components/progress/TrendChart";
import { Card } from "@/components/ui/Card";
import { fmtKg } from "@/lib/format";
import type { ProjectionTarget } from "@/lib/projection-targets";
import { cn } from "@/lib/utils";

const STATE_LINE: Record<ProjectionTarget["state"], string> = {
  kurs: "",
  flach: "Trend flach — erst Konstanz, dann Prognose.",
  fern: "Ziel weiter draußen — dranbleiben.",
};

/**
 * ATLAS rechnet voraus: je Kernübung die nächste runde Marke und die
 * Kalenderwoche, in der der lineare Trend sie erreicht. Ehrliche Zustände
 * statt Fantasie-Daten (flach/fern) — deterministisch aus dem Log.
 */
export function ProjectionCard({ targets }: { targets: ProjectionTarget[] }) {
  if (!targets.length) return null;
  return (
    <Card className="mb-4 p-4" data-testid="projection-card">
      <div className="flex items-center gap-2">
        <Telescope size={15} className="text-accent-ink" aria-hidden />
        <p className="font-mono text-xs uppercase tracking-widest text-accent-2">Projektion</p>
      </div>
      <p className="mt-1 text-xs leading-relaxed text-muted">
        ATLAS rechnet deinen Trend voraus — deterministisch aus deinen Einheiten.
      </p>
      <div className="mt-3 space-y-4">
        {targets.map((t) => (
          <div key={t.exId} className="border-t border-line pt-3 first:border-0 first:pt-0">
            <div className="flex items-baseline justify-between gap-3">
              <p className="min-w-0 truncate text-sm font-medium text-fg">{t.name}</p>
              <p className="shrink-0 font-mono text-xs tabular-nums text-muted">
                {fmtKg(t.current)} →{" "}
                <span className="font-medium text-fg">{fmtKg(t.targetKg)} kg</span>
              </p>
            </div>
            <div className="mt-1.5">
              <TrendChart values={t.values} />
            </div>
            <p
              className={cn(
                "mt-1.5 font-mono text-xs tabular-nums",
                t.state === "kurs" ? "text-accent-ink" : "text-faint",
              )}
            >
              {t.state === "kurs"
                ? `${fmtKg(t.targetKg)} kg ≈ KW ${t.etaKw} · +${fmtKg(t.slopePerWeek)} kg/Wo`
                : STATE_LINE[t.state]}
            </p>
          </div>
        ))}
      </div>
    </Card>
  );
}
