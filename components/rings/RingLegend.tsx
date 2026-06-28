"use client";

import { CountUp } from "@/components/ui/CountUp";
import type { RingMetric } from "@/lib/ring-colors";

export function RingLegend({ metrics }: { metrics: RingMetric[] }) {
  return (
    <div className="flex flex-col gap-2">
      {metrics.map((m) => (
        <div key={m.id} className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-2 text-sm text-neutral-300">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: m.color, boxShadow: `0 0 8px -1px ${m.color}` }}
            />
            {m.label}
          </span>
          <span className="font-display text-sm font-medium tabular-nums text-neutral-100">
            <CountUp value={Math.round(m.value)} />
            <span className="text-neutral-500">/{m.target}</span>
          </span>
        </div>
      ))}
    </div>
  );
}
