"use client";

import { Pressable } from "@/components/ui/pressable";
import { cn } from "@/lib/utils";

export const RIR_OPTIONS = [0, 1, 2, 3, 4];
export const INTENSITY_OPTIONS = [1, 2, 3, 4, 5];

/** Anstrengung eines Satzes — RIR (0–4) oder gefühlte Intensität (1–5).
 *  Genutzt im Pausen-Dock und beim Korrigieren eines Satzes. Ohne `label`
 *  (leer) entfällt die Beschriftung links. */
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
      {label && (
        <span className="shrink-0 text-3xs font-bold text-muted">
          {label}
        </span>
      )}
      <div className="flex flex-1 gap-1.5">
        {options.map((o) => (
          <Pressable
            key={o}
            onClick={() => onPick(o)}
            aria-pressed={value === o}
            className={cn(
              // 44-px-Ziel: der meistgetippte Control im Training — mit
              // Schweiß an den Händen zählt jede Zielfläche.
              "flex h-11 flex-1 items-center justify-center rounded-inner text-base font-semibold tabular-nums focus:outline-none focus-visible:ring-2 focus-visible:ring-fokus",
              value === o ? "bg-accent text-on-accent" : "bg-surface-2 text-fg",
            )}
          >
            {o}
          </Pressable>
        ))}
      </div>
    </div>
  );
}
