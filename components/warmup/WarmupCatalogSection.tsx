"use client";

import { ChevronRight, Youtube } from "lucide-react";
import { useMemo, useState } from "react";
import { useTraining } from "@/components/providers/TrainingProvider";
import { WarmupDrillSheet } from "@/components/warmup/WarmupDrillSheet";
import { Pressable } from "@/components/ui/pressable";
import { WARMUP_CATALOG, type WarmupDrill } from "@/lib/warmup";

const PHASE_ORDER: Record<WarmupDrill["phase"], number> = {
  raise: 0,
  mobilise: 1,
  activate: 2,
};
const PHASE_LABEL: Record<WarmupDrill["phase"], string> = {
  raise: "Puls",
  mobilise: "Mobilität",
  activate: "Aktivierung",
};

/**
 * Aufwärm-Katalog auf der Übungen-Seite: alle RAMP-Drills, je Drill ein
 * Detail-Sheet mit Animation + eigener Video-Verknüpfung für den Player.
 */
export function WarmupCatalogSection() {
  const { warmupVideos } = useTraining();
  const [selected, setSelected] = useState<WarmupDrill | null>(null);

  const drills = useMemo(
    () =>
      [...WARMUP_CATALOG].sort(
        (a, b) =>
          PHASE_ORDER[a.phase] - PHASE_ORDER[b.phase] ||
          a.name.localeCompare(b.name, "de"),
      ),
    [],
  );

  return (
    <>
      <section className="mb-4 overflow-hidden rounded-card border border-line bg-surface-1 shadow-card">
        <p className="border-b border-line px-4 py-2 font-mono text-xs uppercase tracking-widest text-muted">
          Aufwärmen · Übungen <span className="text-faint">· {drills.length}</span>
        </p>
        <div className="px-2 py-1">
          {drills.map((d) => (
            <Pressable
              key={d.id}
              onClick={() => setSelected(d)}
              className="flex w-full min-w-0 items-center justify-between gap-3 px-2 py-2.5 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-sessions"
            >
              <span className="min-w-0 truncate text-sm text-fg">{d.name}</span>
              <span className="flex shrink-0 items-center gap-2">
                <span className="text-xs text-muted">{PHASE_LABEL[d.phase]}</span>
                {warmupVideos[d.id] && (
                  <Youtube size={15} className="text-accent-ink" aria-label="Video verknüpft" />
                )}
                <ChevronRight size={15} className="text-faint" aria-hidden />
              </span>
            </Pressable>
          ))}
        </div>
      </section>
      <p className="-mt-3 mb-4 px-1 text-xs text-faint">
        Übung antippen → eigenes YouTube-Video fürs Aufwärmen.
      </p>

      <WarmupDrillSheet
        open={!!selected}
        onClose={() => setSelected(null)}
        drill={selected}
      />
    </>
  );
}
