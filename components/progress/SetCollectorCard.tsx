"use client";

import { Layers } from "lucide-react";
import { useMemo } from "react";
import { Card } from "@/components/ui/Card";
import { Readout } from "@/components/ui/Readout";
import { Reveal } from "@/components/ui/Reveal";
import { useTraining } from "@/components/providers/TrainingProvider";
import { setCollectorTier, totalSetCount, weeklySetStats } from "@/lib/set-plan";

/** Set-Collector hero: the lifetime working-set count as a big numeral, the
 *  collector tier, and a gently-progressive weekly goal you fill up. Sets also
 *  feed the training level, so collecting them visibly moves you forward. */
export function SetCollectorCard() {
  const { log } = useTraining();
  const total = useMemo(() => totalSetCount(log), [log]);
  const week = useMemo(() => weeklySetStats(log), [log]);
  const tier = useMemo(() => setCollectorTier(total), [total]);
  const remaining = Math.max(0, week.target - week.collected);

  return (
    <Reveal>
      <Card variant="elevated" className="edge-top mb-4 rounded-card p-5">
        <div className="mb-3 flex items-center justify-between">
          <span className="flex items-center gap-1.5 font-mono text-xs uppercase tracking-widest text-accent-2">
            <Layers size={13} className="text-accent-ink" /> Sätze gesammelt
          </span>
          {tier.next != null && (
            <span className="font-mono text-xs tabular-nums text-faint">
              nächste Stufe {tier.next}
            </span>
          )}
        </div>

        <Readout
          value={total}
          eyebrow={`Gesamt · ${tier.title}`}
          unit="Sätze"
          size="lg"
          tone="var(--accent-ink)"
        />

        <div className="mt-4 flex items-center justify-between text-xs">
          <span className="text-muted">Diese Woche</span>
          <span className="font-mono tabular-nums text-fg">
            {week.collected} / {week.target}
          </span>
        </div>
        <div className="mt-1.5 h-1.5 overflow-hidden rounded-pill bg-surface-2" aria-hidden>
          <div
            className="h-full rounded-pill bg-accent-sessions transition-[width] duration-500"
            style={{ width: `${Math.round(week.pct * 100)}%`, boxShadow: "0 0 10px -1px var(--accent)" }}
          />
        </div>
        <p className="mt-2 text-xs text-muted">
          {week.collected >= week.target
            ? "Wochenziel erreicht — stark!"
            : `Noch ${remaining} ${remaining === 1 ? "Satz" : "Sätze"} bis zum Wochenziel.`}
        </p>
      </Card>
    </Reveal>
  );
}
