"use client";

import { Pressable } from "@/components/ui/pressable";
import { cn } from "@/lib/utils";

/** Schalter (38 × 20, Pille) mit rundem 16er-Knopf; der Zustandswechsel
 *  bleibt HART ohne Gleiten (Filmtransport). An = Siegellack-Fläche,
 *  aus = Faden-Rahmen + Schleier-Knopf. */
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
        className={cn(
          "relative h-5 shrink-0 rounded-pill border focus:outline-none",
          checked ? "border-transparent bg-accent-sessions" : "border-line bg-transparent",
        )}
        style={{ width: 38 }}
      >
        <span
          className={cn("absolute h-4 w-4 rounded-pill", checked ? "bg-on-accent" : "bg-muted")}
          style={{ top: 1, left: checked ? 19 : 1 }}
        />
      </Pressable>
    </div>
  );
}
