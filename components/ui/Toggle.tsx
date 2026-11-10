"use client";

import { Pressable } from "@/components/ui/pressable";
import { cn } from "@/lib/utils";

/** Schalter (Pille mit Tinte-Rand) mit rundem Knopf; der Zustandswechsel
 *  bleibt hart ohne Gleiten. An = Blau, aus = Weiß. `role="switch"`.
 *  Die Pille ist 52 × 32 px, die Tippfläche darum 44 px hoch. */
export function Toggle({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  hint?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="min-w-0">
        <p className="text-sm font-medium text-fg">{label}</p>
        {hint && <p className="mt-0.5 text-xs leading-relaxed text-muted">{hint}</p>}
      </div>
      <Pressable
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className="flex h-11 shrink-0 items-center rounded-pill focus:outline-none"
      >
        <span
          className={cn(
            "relative block h-8 rounded-pill border-dick border-rand",
            checked ? "bg-accent" : "bg-surface-1",
          )}
          style={{ width: 52 }}
        >
          <span
            className={cn("absolute h-5 w-5 rounded-pill", checked ? "bg-on-accent" : "bg-fg")}
            style={{ top: 3, left: checked ? 24 : 3 }}
          />
        </span>
      </Pressable>
    </div>
  );
}
