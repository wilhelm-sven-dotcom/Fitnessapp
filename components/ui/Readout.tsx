"use client";

import { Odometer } from "@/components/ui/Odometer";
import { cn } from "@/lib/utils";

type ReadoutSize = "sm" | "md" | "lg" | "xl";

const SIZE: Record<ReadoutSize, string> = {
  sm: "text-2xl",
  md: "text-4xl",
  lg: "text-6xl",
  xl: "text-7xl",
};

/**
 * Die große Zahl: Bricolage 800 mit kleinem Kicker und optionaler Einheit. One bold metric,
 * stated plainly. Rollt beim Einblenden wie ein Zählwerk hoch (reduced-motion-sicher via Odometer).
 */
export function Readout({
  value,
  eyebrow,
  unit,
  decimals = 0,
  count = true,
  size = "lg",
  tone,
  hint,
  className,
}: {
  value: number;
  eyebrow?: string;
  unit?: string;
  decimals?: number;
  count?: boolean;
  size?: ReadoutSize;
  /** Numeral color (e.g. "var(--accent)" for the one bold moment). */
  tone?: string;
  hint?: string;
  className?: string;
}) {
  return (
    <div className={cn("min-w-0", className)}>
      {eyebrow && (
        <p className="mb-1 text-sm font-bold text-muted">{eyebrow}</p>
      )}
      <p className="flex items-baseline gap-1.5">
        <span
          className={cn(
            "font-display font-extrabold leading-none tabular-nums text-fg",
            SIZE[size],
          )}
          style={tone ? { color: tone } : undefined}
        >
          {count ? (
            <Odometer value={value} decimals={decimals} />
          ) : (
            value.toLocaleString("de-DE", {
              minimumFractionDigits: decimals,
              maximumFractionDigits: decimals,
            })
          )}
        </span>
        {unit && <span className="text-sm font-semibold text-muted">{unit}</span>}
      </p>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );
}
