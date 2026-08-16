"use client";

import { LayoutList, X } from "lucide-react";
import { EtappenProfil } from "@/components/ui/EtappenProfil";
import { Odometer } from "@/components/ui/Odometer";
import { Pressable } from "@/components/ui/pressable";
import type { EtappenBlock } from "@/lib/etappen";

/**
 * Kopfzeile des Fokus-Steppers: Ausstieg links, das LIVE-Etappen-Profil in
 * der Mitte (füllt sich Satz für Satz; Tipp öffnet die Übersicht), Restzeit
 * rechts. Ruhig — nur die Füllung reagiert auf Datenänderung.
 */
export function ProgressHeader({
  blocks,
  currentKey,
  currentIndex,
  remainMin,
  onExit,
  onOverview,
}: {
  blocks: EtappenBlock[];
  /** Item-Instanz-Id des aktiven Blocks (Tinte-Strich darunter). */
  currentKey?: string;
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
        <EtappenProfil
          blocks={blocks}
          size="strip"
          live
          currentKey={currentKey}
          className="max-w-40 flex-1"
        />
        <span className="font-mono text-xs tabular-nums text-muted">
          {Math.min(currentIndex + 1, blocks.length)}/{blocks.length}
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
