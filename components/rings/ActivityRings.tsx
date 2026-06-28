"use client";

import { ActivityRing } from "./ActivityRing";
import type { RingMetric } from "@/lib/ring-colors";

export function ActivityRings({
  metrics,
  size = 168,
  stroke = 14,
  gap = 6,
  center,
}: {
  metrics: RingMetric[];
  size?: number;
  stroke?: number;
  gap?: number;
  center?: React.ReactNode;
}) {
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      {metrics.map((m, i) => {
        const ringSize = size - i * 2 * (stroke + gap);
        return (
          <div key={m.id} className="absolute inset-0 flex items-center justify-center">
            <ActivityRing
              progress={m.target > 0 ? m.value / m.target : 0}
              color={m.color}
              size={ringSize}
              stroke={stroke}
              delay={i * 0.15}
            />
          </div>
        );
      })}
      {center && (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {center}
        </div>
      )}
    </div>
  );
}
