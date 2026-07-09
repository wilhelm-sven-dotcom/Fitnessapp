"use client";

import { Pressable } from "@/components/ui/pressable";
import { cn } from "@/lib/utils";

export const RIR_OPTIONS = [0, 1, 2, 3, 4];
export const INTENSITY_OPTIONS = [1, 2, 3, 4, 5];

/** Slim effort selector — RIR (0–4) oder gefühlte Intensität (1–5), nach dem
 *  Satz bewertet. Genutzt in der Satz-Zeile und im Pausen-Timer. */
export function Scale({
  label,
  options,
  value,
  onPick,
  className,
}: {
  label: string;
  options: number[];
  value: number | undefined;
  onPick: (v: number) => void;
  className?: string;
}) {
  return (
    <div className={cn("mt-1.5 flex items-center gap-2", className)}>
      <span className="shrink-0 font-mono text-xs uppercase tracking-widest text-faint">
        {label}
      </span>
      <div className="flex flex-1 gap-1">
        {options.map((o) => (
          <Pressable
            key={o}
            onClick={() => onPick(o)}
            className={cn(
              "flex-1 rounded-pill py-1 text-xs font-medium tabular-nums focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-sessions",
              value === o ? "bg-accent-sessions text-on-accent" : "bg-surface-2 text-muted",
            )}
          >
            {o}
          </Pressable>
        ))}
      </div>
    </div>
  );
}
