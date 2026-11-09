"use client";

import { Pressable } from "@/components/ui/pressable";
import { cn } from "@/lib/utils";

/** Schalter (Pille) mit rundem Knopf; der Zustandswechsel bleibt hart ohne
 *  Gleiten. An = Tinte-Fläche, aus = `surface-2`. `role="switch"`. */
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
          "relative h-7 shrink-0 rounded-pill focus:outline-none",
          checked ? "bg-strong" : "bg-surface-2",
        )}
        style={{ width: 46 }}
      >
        <span
          className={cn("absolute h-5 w-5 rounded-pill", checked ? "bg-on-strong" : "bg-muted")}
          style={{ top: 4, left: checked ? 22 : 4 }}
        />
      </Pressable>
    </div>
  );
}
