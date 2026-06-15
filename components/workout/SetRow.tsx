"use client";

import { Check } from "lucide-react";
import { TimedSet } from "./TimedSet";
import { Pressable } from "@/components/ui/pressable";
import { cn } from "@/lib/utils";
import type { SetEntry, Unit } from "@/lib/types";

const inputClass =
  "min-w-0 flex-1 rounded-xl bg-neutral-800 py-2.5 text-center font-mono text-lg tabular-nums text-neutral-100 placeholder:text-neutral-600 focus:outline-none focus:ring-2 focus:ring-amber-400";

const RIR_OPTIONS = [0, 1, 2, 3, 4];
const INTENSITY_OPTIONS = [1, 2, 3, 4, 5];

function Scale({
  label,
  options,
  value,
  onPick,
}: {
  label: string;
  options: number[];
  value: number | undefined;
  onPick: (v: number) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-12 shrink-0 font-mono text-xs text-neutral-600">{label}</span>
      <div className="flex flex-1 gap-1.5">
        {options.map((o) => (
          <Pressable
            key={o}
            onClick={() => onPick(o)}
            className={cn(
              "flex-1 rounded-lg py-1.5 text-sm font-medium tabular-nums focus:outline-none",
              value === o
                ? "bg-amber-400 text-neutral-950"
                : "bg-neutral-800 text-neutral-400",
            )}
          >
            {o}
          </Pressable>
        ))}
      </div>
      <span className="w-6 shrink-0" />
    </div>
  );
}

export function SetRow({
  label,
  isWarmup,
  unit,
  set,
  onWeight,
  onReps,
  onRir,
  onIntensity,
}: {
  label: string;
  isWarmup: boolean;
  unit: Unit;
  set: SetEntry;
  onWeight: (val: string) => void;
  onReps: (oldVal: string, val: string) => void;
  onRir: (val: number) => void;
  onIntensity: (val: number) => void;
}) {
  const filled = set.reps !== "" && set.reps != null;
  const timed = unit === "Sek";
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        <span
          className={cn(
            "w-12 shrink-0 font-mono text-xs",
            isWarmup ? "text-neutral-600" : "text-neutral-500",
          )}
        >
          {label}
        </span>
        {timed ? (
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
              className={cn(inputClass, isWarmup && "text-neutral-400")}
            />
            <input
              type="number"
              inputMode="numeric"
              value={set.reps}
              onChange={(e) => onReps(set.reps, e.target.value)}
              placeholder="Wdh"
              className={cn(inputClass, isWarmup && "text-neutral-400")}
            />
          </>
        )}
        <span
          className={cn(
            "flex w-6 shrink-0 justify-center",
            isWarmup
              ? "text-neutral-700"
              : filled
                ? "text-emerald-400"
                : "text-neutral-700",
          )}
        >
          <Check size={18} strokeWidth={2.5} />
        </span>
      </div>
      {!isWarmup &&
        (timed ? (
          <Scale label="Int." options={INTENSITY_OPTIONS} value={set.intensity} onPick={onIntensity} />
        ) : (
          <Scale label="RIR" options={RIR_OPTIONS} value={set.rir} onPick={onRir} />
        ))}
    </div>
  );
}
