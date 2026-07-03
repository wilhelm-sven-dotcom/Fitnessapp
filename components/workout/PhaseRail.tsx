"use client";

import { Check, Flag, Flame } from "lucide-react";
import { Pressable } from "@/components/ui/pressable";
import { cn } from "@/lib/utils";

export interface PhaseRailItem {
  slotKey: string;
  name: string;
  state: "done" | "active" | "open";
}

const STATE_LABEL: Record<PhaseRailItem["state"], string> = {
  done: "erledigt",
  active: "aktiv",
  open: "offen",
};

/**
 * The session as a phase stepper: warm-up → numbered exercises → finish flag.
 * One glance answers "where am I, what's left"; tapping a node scrolls there.
 * Connectors turn accent once the phase left of them is completed.
 */
export function PhaseRail({
  warmupDone,
  items,
  allDone,
  onWarmup,
  onItem,
}: {
  warmupDone: boolean;
  items: PhaseRailItem[];
  allDone: boolean;
  onWarmup: () => void;
  onItem: (slotKey: string) => void;
}) {
  const lastDone = items.length > 0 && items[items.length - 1].state === "done";
  return (
    <div
      role="list"
      aria-label="Phasen der Einheit"
      className="no-scrollbar -mx-1 mt-3 flex items-center overflow-x-auto px-1 py-1"
    >
      <span role="listitem" className="shrink-0">
        <Pressable
          onClick={onWarmup}
          aria-label={warmupDone ? "Aufwärmen — erledigt" : "Aufwärmen"}
          className={cn(
            "flex h-7 w-7 items-center justify-center rounded-full focus:outline-none",
            warmupDone ? "bg-accent-sessions text-on-accent" : "bg-surface-2 text-accent-ink",
          )}
        >
          {warmupDone ? <Check size={13} strokeWidth={3} /> : <Flame size={13} />}
        </Pressable>
      </span>
      {items.map((it, i) => (
        <span key={it.slotKey} role="listitem" className="flex shrink-0 items-center">
          <span
            aria-hidden
            className={cn(
              "mx-1 h-px w-3",
              (i === 0 ? warmupDone : items[i - 1].state === "done")
                ? "bg-accent-sessions"
                : "bg-line",
            )}
          />
          <Pressable
            onClick={() => onItem(it.slotKey)}
            aria-label={`${it.name} — ${STATE_LABEL[it.state]}`}
            aria-current={it.state === "active" ? "step" : undefined}
            className={cn(
              "flex items-center justify-center rounded-full font-mono text-xs tabular-nums focus:outline-none",
              it.state === "done" && "h-6 w-6 bg-accent-sessions text-on-accent",
              it.state === "active" &&
                "h-8 w-8 bg-surface-1 text-accent-ink ring-1 ring-accent-sessions shadow-glow-sessions",
              it.state === "open" && "h-7 w-7 bg-surface-2 text-faint",
            )}
          >
            {it.state === "done" ? (
              <Check size={12} strokeWidth={3} />
            ) : (
              String(i + 1).padStart(2, "0")
            )}
          </Pressable>
        </span>
      ))}
      <span role="listitem" className="flex shrink-0 items-center">
        <span aria-hidden className={cn("mx-1 h-px w-3", lastDone ? "bg-accent-sessions" : "bg-line")} />
        <span
          aria-label={allDone ? "Abschluss — bereit" : "Abschluss"}
          className={cn(
            "flex h-7 w-7 items-center justify-center rounded-full",
            allDone
              ? "bg-accent-sessions text-on-accent shadow-glow-sessions"
              : "bg-surface-2 text-faint",
          )}
        >
          <Flag size={12} />
        </span>
      </span>
    </div>
  );
}
