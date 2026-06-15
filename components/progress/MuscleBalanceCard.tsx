"use client";

import { BalanceRadar } from "./BalanceRadar";
import { balanceRatios, radarAxes } from "@/lib/balance";
import { cn } from "@/lib/utils";
import type { MuscleVolume } from "@/lib/volume";

export function MuscleBalanceCard({ muscleVolumes }: { muscleVolumes: MuscleVolume[] }) {
  if (!muscleVolumes.some((m) => m.sets > 0)) return null;
  const axes = radarAxes(muscleVolumes);
  const ratios = balanceRatios(muscleVolumes);

  return (
    <div className="mb-3 rounded-2xl bg-neutral-900 p-4">
      <p className="mb-1 font-mono text-xs uppercase tracking-widest text-neutral-400">
        Muskel-Balance
      </p>
      <p className="mb-2 text-xs text-neutral-500">
        Sätze je Muskel diese Woche · äußerer Rand = Ziel (20).
      </p>
      <BalanceRadar axes={axes} />
      <div className="mt-3 space-y-2">
        {ratios.map((r) => (
          <div key={r.key} className="flex items-center justify-between gap-3 text-sm">
            <span className="text-neutral-400">{r.label}</span>
            <div className="flex items-center gap-2">
              <span className="font-mono tabular-nums text-neutral-300">
                {r.a} : {r.b}
              </span>
              <span
                className={cn(
                  "rounded px-1.5 py-0.5 text-xs font-medium",
                  r.status === "balanced"
                    ? "bg-accent-volume text-neutral-950"
                    : "bg-status-over text-neutral-950",
                )}
              >
                {r.status === "balanced" ? "im Lot" : "Ungleichgewicht"}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
