"use client";

import { CountUp } from "@/components/ui/CountUp";
import type { RingMetric } from "@/lib/ring-colors";

export function RingLegend({ metrics }: { metrics: RingMetric[] }) {
  return (
    <div className="flex flex-col gap-2">
      {metrics.map((m) => {
        // Large counts (e.g. weekly volume in kg) collapse to tonnes so the row
        // never clips and matches the hero readout ("7.8 t").
        const big = m.target >= 1000;
        const value = big ? m.value / 1000 : Math.round(m.value);
        const target = big ? (m.target / 1000).toFixed(1) : m.target;
        return (
          <div key={m.id} className="flex items-center justify-between gap-2">
            <span className="flex min-w-0 items-center gap-2 text-sm text-muted">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: m.color, boxShadow: `0 0 8px -1px ${m.color}` }}
              />
              {m.label}
            </span>
            <span className="shrink-0 whitespace-nowrap font-display text-sm font-medium tabular-nums text-fg">
              <CountUp value={value} decimals={big ? 1 : 0} />
              <span className="text-muted">
                /{target}
                {big ? " t" : ""}
              </span>
            </span>
          </div>
        );
      })}
    </div>
  );
}
