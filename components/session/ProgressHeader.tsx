"use client";

import { X } from "lucide-react";
import { Odometer } from "@/components/ui/Odometer";
import { Pressable } from "@/components/ui/pressable";
import type { KaderGruppe } from "@/lib/phasen/band";
import { useOffline } from "@/lib/use-offline";
import { cn } from "@/lib/utils";

/**
 * Kopf des Trainings „spotter“: runder Schließen-Knopf links, „Übung 2 von 6“
 * in der Mitte, Restzeit rechts; darunter ein dickes Segment je Übung (Pille
 * mit Tinte-Rand), erledigte Sätze füllen es blau. Die laufende Übung hat den
 * dicken Rand. Tipp auf die Segmente öffnet die Übersicht.
 *
 * Tippflächen: Schließen 44 × 44 px; die Übersicht ist zwar nur ein 12 px
 * hoher Balken, die Fläche zum Tippen reicht aber 44 px hoch (Polster oben und
 * unten). Vorher musste man den schmalen Balken treffen. Ohne Netz steht unter
 * der Restzeit „Offline“ — dann fehlen die Sätze von ATLAS, sonst nichts.
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
  const offline = useOffline();
  return (
    <div>
      <div className="flex items-center gap-2">
        <div className="w-20 shrink-0">
          <Pressable
            onClick={onExit}
            aria-label="Training beenden"
            className="flex h-11 w-11 items-center justify-center rounded-pill border-dick border-rand bg-surface-1 text-fg focus:outline-none focus-visible:ring-2 focus-visible:ring-fokus"
          >
            <X size={18} strokeWidth={2.5} />
          </Pressable>
        </div>
        <p className="min-w-0 flex-1 truncate text-center font-display text-lg font-extrabold tabular-nums text-fg">
          Übung {currentIndex + 1} von {gruppen.length}
        </p>
        <div className="w-20 shrink-0 text-right">
          <p className="text-sm font-semibold tabular-nums text-muted">
            {/* Rollt nur bei echten Wertwechseln — beim Mount steht er sofort. */}
            ~<Odometer value={remainMin} /> Min
          </p>
          {offline && (
            <p role="status" className="text-4xs font-bold text-warnung">
              Offline
            </p>
          )}
        </div>
      </div>

      <Pressable
        onClick={onOverview}
        aria-label={`Einheit im Überblick, Übung ${currentIndex + 1} von ${gruppen.length}`}
        className="-mb-2 flex w-full gap-1.5 rounded-xs pb-5 pt-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-fokus"
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
