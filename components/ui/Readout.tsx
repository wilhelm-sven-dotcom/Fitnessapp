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
 * The signature numeral readout: a big Space-Grotesk number with a small mono
 * eyebrow and optional unit — the app's "instrument" voice. One bold metric,
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
        <p className="mb-1 font-mono text-xs uppercase tracking-widest text-muted">{eyebrow}</p>
      )}
      <p className="flex items-baseline gap-1.5">
        <span
          className={cn(
            "font-display font-semibold leading-none tracking-tight tabular-nums text-fg",
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
        {unit && <span className="font-mono text-sm font-medium text-muted">{unit}</span>}
      </p>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );
}
