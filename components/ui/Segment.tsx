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
 * DER Umschalter der App: Pillen-Rahmen, Pillen-Segmente, das aktive Segment
 * in Tinte. Ersetzt die früheren Einzel-Rezepte (Einstellungen, Profil,
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
        "flex gap-1 rounded-pill border border-line-card bg-surface-1 p-1",
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
              "min-h-9 min-w-0 flex-1 truncate rounded-pill px-2 py-2 font-mono text-3xs font-semibold uppercase tracking-gesperrt",
              active ? "bg-strong text-on-strong" : "text-muted",
            )}
          >
            {o.label}
          </Pressable>
        );
      })}
    </div>
  );
}
