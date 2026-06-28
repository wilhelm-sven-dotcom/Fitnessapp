"use client";

import { Pressable } from "@/components/ui/pressable";
import { cn } from "@/lib/utils";

/** A labelled iOS-style switch row. */
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
          "relative h-7 w-12 shrink-0 rounded-full transition-colors focus:outline-none",
          checked ? "bg-accent-volume" : "bg-surface-2",
        )}
      >
        <span
          className="absolute top-0.5 h-6 w-6 rounded-full bg-white transition-all"
          style={{ left: checked ? 22 : 2 }}
        />
      </Pressable>
    </div>
  );
}
