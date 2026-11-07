"use client";

import { X } from "lucide-react";
import { Phasenband } from "@/components/ui/Phasenband";
import { Odometer } from "@/components/ui/Odometer";
import { Pressable } from "@/components/ui/pressable";
import type { KaderGruppe } from "@/lib/phasen/band";

/**
 * Kopf des Trainings: Schließen links, „Übung 2 von 6“ in der Mitte, Restzeit
 * rechts; darunter das Phasenband (ein Segment je Satz in der Regionsfarbe,
 * erledigt gefüllt). Tipp aufs Band öffnet die Übersicht.
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
            className="-ml-2.5 flex h-11 w-11 items-center justify-center rounded-pill text-fg focus:outline-none focus-visible:ring-2 focus-visible:ring-fokus"
          >
            <X size={22} />
          </Pressable>
        </div>
        <p className="min-w-0 flex-1 truncate text-center text-base font-semibold tabular-nums text-fg">
          Übung {currentIndex + 1} von {gruppen.length}
        </p>
        <p className="w-20 shrink-0 text-right text-sm tabular-nums text-muted">
          {/* Rollt nur bei echten Wertwechseln — beim Mount steht er sofort. */}
          ~<Odometer value={remainMin} /> Min
        </p>
      </div>

      <Pressable
        onClick={onOverview}
        aria-label={`Einheit im Überblick, Übung ${currentIndex + 1} von ${gruppen.length}`}
        className="mt-2 block w-full rounded-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-fokus"
      >
        <Phasenband gruppen={gruppen} groesse="live" />
      </Pressable>
    </div>
  );
}
