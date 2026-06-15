"use client";

import { Check } from "lucide-react";
import { TimedSet } from "./TimedSet";
import { cn } from "@/lib/utils";
import type { SetEntry, Unit } from "@/lib/types";

const inputClass =
  "min-w-0 flex-1 rounded-xl bg-neutral-800 py-2.5 text-center font-mono text-lg tabular-nums text-neutral-100 placeholder:text-neutral-600 focus:outline-none focus:ring-2 focus:ring-amber-400";

export function SetRow({
  index,
  unit,
  set,
  onWeight,
  onReps,
}: {
  index: number;
  unit: Unit;
  set: SetEntry;
  onWeight: (val: string) => void;
  onReps: (oldVal: string, val: string) => void;
}) {
  const filled = set.reps !== "" && set.reps != null;
  return (
    <div className="flex items-center gap-2">
      <span className="w-12 shrink-0 font-mono text-xs text-neutral-500">
        Satz {index + 1}
      </span>
      {unit === "Sek" ? (
        <TimedSet value={set.reps} onChange={(val) => onReps(set.reps, val)} />
      ) : (
        <>
          <input
            type="number"
            inputMode="decimal"
            step="0.5"
            value={set.weight}
            onChange={(e) => onWeight(e.target.value)}
            placeholder="kg"
            className={inputClass}
          />
          <input
            type="number"
            inputMode="numeric"
            value={set.reps}
            onChange={(e) => onReps(set.reps, e.target.value)}
            placeholder="Wdh"
            className={inputClass}
          />
        </>
      )}
      <span
        className={cn(
          "flex w-6 shrink-0 justify-center",
          filled ? "text-emerald-400" : "text-neutral-700",
        )}
      >
        <Check size={18} strokeWidth={2.5} />
      </span>
    </div>
  );
}
