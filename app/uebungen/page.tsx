"use client";

import { ChevronRight, Search, Youtube } from "lucide-react";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Reveal } from "@/components/ui/Reveal";
import { GuideSheet } from "@/components/workout/GuideSheet";
import { useTraining } from "@/components/providers/TrainingProvider";
import { PATTERN_LABEL } from "@/lib/exercises";
import { cn } from "@/lib/utils";
import type { Exercise, Pattern } from "@/lib/types";

// Muscle-logical order for the catalog groups (matches PATTERN_LABEL).
const PATTERN_ORDER: Pattern[] = [
  "squat",
  "lunge",
  "hinge",
  "hpush",
  "vpush",
  "hpull",
  "vpull",
  "lateral",
  "arm",
  "core",
  "cardio",
];

export default function ExerciseCatalogPage() {
  const { allLib, exerciseVideos } = useTraining();
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<Exercise | null>(null);

  const withVideo = useMemo(
    () => allLib.filter((e) => exerciseVideos[e.id]).length,
    [allLib, exerciseVideos],
  );

  // Filter by name / tag / pattern label, then group by movement pattern.
  const groups = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const match = (e: Exercise) =>
      !needle ||
      e.name.toLowerCase().includes(needle) ||
      (e.tag ?? "").toLowerCase().includes(needle) ||
      (PATTERN_LABEL[e.pattern] ?? "").toLowerCase().includes(needle);
    return PATTERN_ORDER.map((pat) => ({
      pat,
      list: allLib
        .filter((e) => e.pattern === pat && match(e))
        .sort((a, b) => a.name.localeCompare(b.name, "de")),
    })).filter((g) => g.list.length > 0);
  }, [allLib, q]);

  const anyResults = groups.length > 0;

  return (
    <div>
      <PageHeader
        eyebrow="Katalog"
        title="Übungen"
        subtitle={`${allLib.length} Übungen · ${withVideo} mit Video`}
      />

      <div className="relative mb-4">
        <Search
          size={16}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint"
          aria-hidden
        />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          type="search"
          inputMode="search"
          autoCapitalize="off"
          placeholder="Übung suchen…"
          aria-label="Übung suchen"
          className="w-full rounded-xl bg-surface-2 py-2.5 pl-9 pr-3 text-sm text-fg placeholder:text-faint focus:outline-none focus:ring-2 focus:ring-accent-sessions"
        />
      </div>

      {!anyResults ? (
        <p className="px-1 py-8 text-center text-sm text-muted">
          Nichts gefunden für &bdquo;{q}&ldquo;
        </p>
      ) : (
        groups.map((g, gi) => (
          <Reveal key={g.pat} delay={0.04 + gi * 0.03}>
            <section className="mb-4 overflow-hidden rounded-card border border-surface-3 bg-surface-1 shadow-card">
              <p className="border-b border-line px-4 py-2 font-mono text-xs uppercase tracking-widest text-muted">
                {PATTERN_LABEL[g.pat]} <span className="text-faint">· {g.list.length}</span>
              </p>
              <div className="px-2 py-1">
                {g.list.map((ex) => {
                  const hasVideo = !!exerciseVideos[ex.id];
                  return (
                    <button
                      key={ex.id}
                      type="button"
                      onClick={() => setSelected(ex)}
                      className="log-row flex w-full items-center justify-between gap-3 px-2 py-2.5 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-sessions"
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <span className="truncate text-sm text-fg">{ex.name}</span>
                        {ex.custom && (
                          <span className="shrink-0 rounded-pill bg-surface-2 px-1.5 py-0.5 text-xs text-accent-2">
                            Eigene
                          </span>
                        )}
                      </span>
                      <span className="flex shrink-0 items-center gap-2">
                        <span className="text-xs text-muted">{ex.tag}</span>
                        {hasVideo && (
                          <Youtube size={15} className="text-accent-ink" aria-label="Video verknüpft" />
                        )}
                        <ChevronRight size={15} className="text-faint" aria-hidden />
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>
          </Reveal>
        ))
      )}

      <p className={cn("mt-1 px-1 text-xs text-faint", !anyResults && "hidden")}>
        Übung antippen → Ausführung ansehen und ein YouTube-Video hinzufügen.
      </p>

      <GuideSheet open={!!selected} onClose={() => setSelected(null)} ex={selected} />
    </div>
  );
}
