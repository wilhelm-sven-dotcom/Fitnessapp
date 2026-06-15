"use client";

import { MUSCLE_LABEL, VOLUME_TARGET, type MuscleVolume } from "@/lib/volume";
import { cn } from "@/lib/utils";

const SCALE_MAX = 24;

const statusColor: Record<MuscleVolume["status"], string> = {
  under: "bg-status-under",
  in: "bg-status-in",
  over: "bg-status-over",
};

export function MuscleVolumeBars({ data }: { data: MuscleVolume[] }) {
  return (
    <div className="mb-3 rounded-2xl bg-neutral-900 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-semibold leading-tight">Wochen-Volumen</h3>
        <span className="text-xs text-neutral-500">
          Sätze · Ziel {VOLUME_TARGET.min}–{VOLUME_TARGET.max}
        </span>
      </div>
      <div className="space-y-2">
        {data.map((m) => (
          <div key={m.muscle} className="flex items-center gap-3">
            <span className="w-24 shrink-0 text-xs text-neutral-400">
              {MUSCLE_LABEL[m.muscle]}
            </span>
            <div className="relative h-2.5 flex-1 overflow-hidden rounded-full bg-neutral-800">
              <div
                className="absolute inset-y-0"
                style={{
                  left: `${(VOLUME_TARGET.min / SCALE_MAX) * 100}%`,
                  width: `${((VOLUME_TARGET.max - VOLUME_TARGET.min) / SCALE_MAX) * 100}%`,
                  backgroundColor: "#2a2a30",
                }}
              />
              <div
                className={cn("absolute inset-y-0 left-0 rounded-full", statusColor[m.status])}
                style={{ width: `${Math.min(100, (m.sets / SCALE_MAX) * 100)}%` }}
              />
            </div>
            <span className="w-7 shrink-0 text-right font-mono text-xs tabular-nums text-neutral-300">
              {m.sets}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
