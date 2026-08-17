"use client";

import { X } from "lucide-react";
import { Phasenband } from "@/components/ui/Phasenband";
import { Odometer } from "@/components/ui/Odometer";
import { Pressable } from "@/components/ui/pressable";
import type { KaderGruppe } from "@/lib/phasen/band";

/**
 * Kopf des Fokus-Modus (Fokus.dc): „STUDIE Nr. {n} · AKT II" links, Restzeit
 * und Ausstieg rechts; darunter das LIVE-Phasenband in voller Breite (Kader
 * für Kader belichtet, Tipp öffnet die Übersicht). Die Füllung steht hart im
 * Commit-Moment (Filmtransport), der aktive Kader trägt Siegellack.
 */
export function ProgressHeader({
  gruppen,
  plattenNr,
  currentIndex,
  remainMin,
  onExit,
  onOverview,
}: {
  gruppen: KaderGruppe[];
  plattenNr: number;
  currentIndex: number;
  remainMin: number;
  onExit: () => void;
  onOverview: () => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <span className="min-w-0 truncate font-mono text-2xs font-semibold uppercase tracking-gesperrt text-fg">
          Studie Nr. <span className="tabular-nums">{plattenNr}</span> · Akt II
        </span>
        <span className="flex shrink-0 items-center gap-1">
          <span className="font-mono text-xs tabular-nums text-muted">
            {/* Rollt nur bei echten Wertwechseln — beim Mount steht er sofort. */}
            ~<Odometer value={remainMin} /> Min
          </span>
          <Pressable
            onClick={onExit}
            aria-label="Studie beenden"
            className="-m-1.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-cyanotypie"
          >
            <X size={18} />
          </Pressable>
        </span>
      </div>

      <Pressable
        onClick={onOverview}
        aria-label={`Einheit im Überblick — Übung ${currentIndex + 1} von ${gruppen.length}`}
        className="mt-2 block w-full rounded-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-cyanotypie"
      >
        <Phasenband gruppen={gruppen} groesse="live" />
      </Pressable>
    </div>
  );
}
