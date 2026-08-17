"use client";

import { LayoutList, X } from "lucide-react";
import { Phasenband } from "@/components/ui/Phasenband";
import { Odometer } from "@/components/ui/Odometer";
import { Pressable } from "@/components/ui/pressable";
import type { KaderGruppe } from "@/lib/phasen/band";

/**
 * Kopfzeile des Fokus-Steppers: Ausstieg links, das LIVE-Phasenband in
 * der Mitte (Kader für Kader belichtet; Tipp öffnet die Übersicht),
 * Restzeit rechts. Ruhig — die Füllung steht hart im Commit-Moment
 * (Filmtransport: kein Kriechen), der aktive Kader trägt Siegellack.
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
    <div className="flex items-center justify-between gap-2">
      <Pressable
        onClick={onExit}
        aria-label="Training beenden"
        className="-m-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-ink"
      >
        <X size={18} />
      </Pressable>

      <Pressable
        onClick={onOverview}
        aria-label="Einheit im Überblick"
        className="flex min-w-0 flex-1 items-center justify-center gap-2 rounded-card px-2 py-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-ink"
      >
        <Phasenband gruppen={gruppen} groesse="live" className="max-w-40 flex-1" />
        <span className="font-mono text-xs tabular-nums text-muted">
          {Math.min(currentIndex + 1, gruppen.length)}/{gruppen.length}
        </span>
        <LayoutList size={14} className="shrink-0 text-faint" aria-hidden />
      </Pressable>

      <span className="shrink-0 font-mono text-xs tabular-nums text-muted">
        {/* Rollt nur bei echten Wertwechseln — beim Mount steht er sofort. */}
        ~<Odometer value={remainMin} /> Min
      </span>
    </div>
  );
}
