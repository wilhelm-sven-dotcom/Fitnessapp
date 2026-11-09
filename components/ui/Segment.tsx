"use client";

import { Pressable } from "@/components/ui/pressable";
import { cn } from "@/lib/utils";

export interface SegmentOption<T extends string | number> {
  value: T;
  label: string;
  /** Vorlesetext, wenn das Label allein zu knapp ist (z. B. „2,5 kg“). */
  ariaLabel?: string;
}

/**
 * DER Umschalter der App: Pille mit dickem Tinte-Rand, das aktive Segment
 * als Tinte-Fläche. Ersetzt die früheren Einzel-Rezepte (Einstellungen, Profil,
 * Gewichtsstufe, Darstellung, Ort). `aria-pressed` je Segment.
 */
export function Segment<T extends string | number>({
  options,
  value,
  onChange,
  label,
  disabled,
  className,
}: {
  options: readonly SegmentOption<T>[];
  value: T | undefined;
  onChange: (v: T) => void;
  /** Gruppenname für Screenreader. */
  label: string;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className={cn(
        "flex gap-1 rounded-pill border-dick border-rand bg-surface-1 p-1",
        disabled && "opacity-50",
        className,
      )}
    >
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable
            key={String(o.value)}
            type="button"
            disabled={disabled}
            onClick={() => {
              if (!active) onChange(o.value);
            }}
            aria-pressed={active}
            aria-label={o.ariaLabel}
            className={cn(
              "min-h-10 min-w-0 flex-1 truncate rounded-pill px-2 py-2 font-display text-sm font-extrabold",
              active ? "bg-strong text-on-strong" : "text-fg",
            )}
          >
            {o.label}
          </Pressable>
        );
      })}
    </div>
  );
}
