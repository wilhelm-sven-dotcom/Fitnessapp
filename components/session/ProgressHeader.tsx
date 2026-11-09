"use client";

import { X } from "lucide-react";
import { Odometer } from "@/components/ui/Odometer";
import { Pressable } from "@/components/ui/pressable";
import type { KaderGruppe } from "@/lib/phasen/band";
import { cn } from "@/lib/utils";

/**
 * Kopf des Trainings „spotter“: runder Schließen-Knopf links, „Übung 2 von 6“
 * in der Mitte, Restzeit rechts; darunter ein dickes Segment je Übung (Pille
 * mit Tinte-Rand), erledigte Sätze füllen es blau. Die laufende Übung hat den
 * dicken Rand. Tipp auf die Segmente öffnet die Übersicht.
 */
export function ProgressHeader({
  gruppen,
  currentIndex,
  remainMin,
  onExit,
  onOverview,
}: {
  gruppen: KaderGruppe[];
  currentIndex: number;
  remainMin: number;
  onExit: () => void;
  onOverview: () => void;
}) {
  return (
    <div>
      <div className="flex items-center gap-2">
        <div className="w-20 shrink-0">
          <Pressable
            onClick={onExit}
            aria-label="Training beenden"
            className="flex h-10 w-10 items-center justify-center rounded-pill border-dick border-rand bg-surface-1 text-fg focus:outline-none focus-visible:ring-2 focus-visible:ring-fokus"
          >
            <X size={18} strokeWidth={2.5} />
          </Pressable>
        </div>
        <p className="min-w-0 flex-1 truncate text-center font-display text-lg font-extrabold tabular-nums text-fg">
          Übung {currentIndex + 1} von {gruppen.length}
        </p>
        <p className="w-20 shrink-0 text-right text-sm font-semibold tabular-nums text-muted">
          {/* Rollt nur bei echten Wertwechseln — beim Mount steht er sofort. */}
          ~<Odometer value={remainMin} /> Min
        </p>
      </div>

      <Pressable
        onClick={onOverview}
        aria-label={`Einheit im Überblick, Übung ${currentIndex + 1} von ${gruppen.length}`}
        className="mt-2.5 flex w-full gap-1.5 rounded-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-fokus"
      >
        {gruppen.map((g, i) => {
          const gesamt = g.kader.length || 1;
          const erledigt = g.kader.filter((k) => k.status === "belichtet").length;
          return (
            <span
              key={g.itemId}
              aria-hidden
              className={cn(
                "relative h-3 min-w-0 flex-1 overflow-hidden rounded-pill border-rand bg-surface-1",
                i === currentIndex ? "border-dick" : "border-2",
              )}
            >
              <span
                className="absolute inset-y-0 left-0 bg-accent"
                style={{ width: `${Math.round((erledigt / gesamt) * 100)}%` }}
              />
            </span>
          );
        })}
      </Pressable>
    </div>
  );
}
