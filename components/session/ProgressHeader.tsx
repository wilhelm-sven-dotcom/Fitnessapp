"use client";

import { LayoutList, X } from "lucide-react";
import { Pressable } from "@/components/ui/pressable";
import { cn } from "@/lib/utils";

export interface HeaderItem {
  id: string;
  done: boolean;
}

/**
 * Kopfzeile des Fokus-Steppers: Ausstieg links, Stationspunkte in der Mitte
 * (Tipp öffnet die Übersicht), Restzeit rechts. Ruhig — keine Animationen.
 */
export function ProgressHeader({
  items,
  currentIndex,
  remainMin,
  onExit,
  onOverview,
}: {
  items: HeaderItem[];
  currentIndex: number;
  remainMin: number;
  onExit: () => void;
  onOverview: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <Pressable
        onClick={onExit}
        aria-label="Training beenden"
        className="shrink-0 rounded-full p-2 text-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-ink"
      >
        <X size={18} />
      </Pressable>

      <Pressable
        onClick={onOverview}
        aria-label="Einheit im Überblick"
        className="flex min-w-0 flex-1 items-center justify-center gap-2 rounded-card px-2 py-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-ink"
      >
        <span className="flex items-center gap-1.5">
          {items.map((it, i) => (
            <span
              key={it.id}
              className={cn(
                "h-1.5 rounded-full transition-[width,background-color] duration-300 ease-out",
                i === currentIndex
                  ? "w-6 bg-accent-ink"
                  : it.done
                    ? "w-2.5 bg-accent-2"
                    : "w-2.5 bg-surface-2",
              )}
            />
          ))}
        </span>
        <span className="font-mono text-xs tabular-nums text-muted">
          {Math.min(currentIndex + 1, items.length)}/{items.length}
        </span>
        <LayoutList size={14} className="shrink-0 text-faint" aria-hidden />
      </Pressable>

      <span className="shrink-0 font-mono text-xs tabular-nums text-muted">
        ~{remainMin} Min
      </span>
    </div>
  );
}
