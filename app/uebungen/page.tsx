"use client";

import { ChevronRight, Eye, EyeOff, Pencil, Plus, Search, Youtube } from "lucide-react";
import { useMemo, useState } from "react";
import { CustomExerciseEditor } from "@/components/exercises/CustomExerciseEditor";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { Pressable } from "@/components/ui/pressable";
import { GuideSheet } from "@/components/workout/GuideSheet";
import { useTraining } from "@/components/providers/TrainingProvider";
import { PATTERN_LABEL } from "@/lib/exercises";
import { reqOk } from "@/lib/progression";
import { MUSCLE_LABEL, MUSCLE_ORDER, muscleOf } from "@/lib/volume";
import { cn } from "@/lib/utils";
import type { Exercise, Muscle, Pattern } from "@/lib/types";

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
  "calf",
  "cardio",
];

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Pressable
      onClick={onClick}
      className={cn(
        "shrink-0 rounded-pill px-3 py-1.5 text-xs font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-ink",
        active ? "bg-accent-sessions text-on-accent" : "bg-surface-2 text-muted",
      )}
    >
      {children}
    </Pressable>
  );
}

export default function ExerciseCatalogPage() {
  const { allLib, exerciseVideos, has, disabledExercises, toggleExerciseDisabled } = useTraining();
  const [q, setQ] = useState("");
  const [patFilter, setPatFilter] = useState<Pattern | null>(null);
  const [muscleFilter, setMuscleFilter] = useState<Muscle | null>(null);
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const [selected, setSelected] = useState<Exercise | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<Exercise | null>(null);

  const customCount = useMemo(() => allLib.filter((e) => e.custom).length, [allLib]);

  // Suche + Muster-/Muskel-/Equipment-Filter, dann nach Muster gruppieren.
  const groups = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const match = (e: Exercise) => {
      if (needle) {
        const hit =
          e.name.toLowerCase().includes(needle) ||
          (e.tag ?? "").toLowerCase().includes(needle) ||
          (PATTERN_LABEL[e.pattern] ?? "").toLowerCase().includes(needle) ||
          MUSCLE_LABEL[muscleOf(e).primary].toLowerCase().includes(needle);
        if (!hit) return false;
      }
      if (patFilter && e.pattern !== patFilter) return false;
      if (muscleFilter) {
        const m = muscleOf(e);
        if (m.primary !== muscleFilter && m.secondary !== muscleFilter) return false;
      }
      if (onlyAvailable && !reqOk(e, has)) return false;
      return true;
    };
    return PATTERN_ORDER.map((pat) => ({
      pat,
      list: allLib
        .filter((e) => e.pattern === pat && match(e))
        .sort((a, b) => a.name.localeCompare(b.name, "de")),
    })).filter((g) => g.list.length > 0);
  }, [allLib, q, patFilter, muscleFilter, onlyAvailable, has]);

  const shown = groups.reduce((a, g) => a + g.list.length, 0);

  return (
    <div>
      <PageHeader
        eyebrow="Katalog"
        title="Übungen"
        tone="var(--fg)"
        subtitle={`${allLib.length} Übungen${customCount ? ` · ${customCount} eigene` : ""}`}
      />

      <div className="mb-3 flex gap-2">
        <div className="relative flex-1">
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
            className="w-full rounded-card bg-surface-2 py-2.5 pl-9 pr-3 text-base text-fg placeholder:text-faint focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-sessions"
          />
        </div>
        <Pressable
          onClick={() => {
            setEditing(null);
            setEditorOpen(true);
          }}
          aria-label="Eigene Übung anlegen"
          className="flex shrink-0 items-center gap-1.5 rounded-card bg-strong px-3.5 text-sm font-semibold text-on-strong focus:outline-none"
        >
          <Plus size={16} strokeWidth={2.5} /> Neu
        </Pressable>
      </div>

      {/* Filter: Muster · Muskel · nur verfügbare Geräte. */}
      <div className="no-scrollbar mb-2 flex gap-1.5 overflow-x-auto pb-1">
        <FilterChip active={!patFilter} onClick={() => setPatFilter(null)}>
          Alle Muster
        </FilterChip>
        {PATTERN_ORDER.map((p) => (
          <FilterChip
            key={p}
            active={patFilter === p}
            onClick={() => setPatFilter((cur) => (cur === p ? null : p))}
          >
            {PATTERN_LABEL[p]}
          </FilterChip>
        ))}
      </div>
      <div className="no-scrollbar mb-2 flex gap-1.5 overflow-x-auto pb-1">
        <FilterChip active={!muscleFilter} onClick={() => setMuscleFilter(null)}>
          Alle Muskeln
        </FilterChip>
        {MUSCLE_ORDER.map((m) => (
          <FilterChip
            key={m}
            active={muscleFilter === m}
            onClick={() => setMuscleFilter((cur) => (cur === m ? null : m))}
          >
            {MUSCLE_LABEL[m]}
          </FilterChip>
        ))}
      </div>
      <div className="mb-4 flex items-center gap-1.5">
        <FilterChip active={onlyAvailable} onClick={() => setOnlyAvailable((v) => !v)}>
          Nur mit deinen Geräten
        </FilterChip>
        <span className="ml-auto font-mono text-xs tabular-nums text-faint">
          {shown} Treffer
        </span>
      </div>

      {groups.length === 0 ? (
        <EmptyState
          icon={Search}
          title="Nichts gefunden"
          description="Kein Treffer für diese Kombination — Filter lockern oder eine eigene Übung anlegen."
          action={
            <Button
              variant="secondary"
              onClick={() => {
                setQ("");
                setPatFilter(null);
                setMuscleFilter(null);
                setOnlyAvailable(false);
              }}
            >
              Filter zurücksetzen
            </Button>
          }
        />
      ) : (
        groups.map((g) => (
          <section
            key={g.pat}
            className="mb-4 overflow-hidden rounded-card border border-line bg-surface-1 shadow-card"
          >
            <p className="border-b border-line px-4 py-2 font-mono text-xs uppercase tracking-widest text-muted">
              {PATTERN_LABEL[g.pat]} <span className="text-faint">· {g.list.length}</span>
            </p>
            <div className="px-2 py-1">
              {g.list.map((ex) => {
                const hasVideo = !!exerciseVideos[ex.id];
                const available = reqOk(ex, has);
                const off = disabledExercises.includes(ex.id);
                const m = muscleOf(ex);
                return (
                  <div key={ex.id} className="flex items-center gap-1">
                    <Pressable
                      onClick={() => setSelected(ex)}
                      className="flex min-w-0 flex-1 items-center justify-between gap-3 px-2 py-2.5 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-sessions"
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <span
                          className={cn(
                            "truncate text-sm",
                            available && !off ? "text-fg" : "text-faint",
                            off && "line-through",
                          )}
                        >
                          {ex.name}
                        </span>
                        {ex.custom && (
                          <span className="shrink-0 rounded-pill bg-surface-2 px-1.5 py-0.5 text-xs text-accent-2">
                            Eigene
                          </span>
                        )}
                        {off && (
                          <span className="shrink-0 rounded-pill bg-surface-2 px-1.5 py-0.5 text-xs text-faint">
                            Aus
                          </span>
                        )}
                      </span>
                      <span className="flex shrink-0 items-center gap-2">
                        <span className="text-xs text-muted">
                          {ex.pattern === "cardio" ? ex.tag : MUSCLE_LABEL[m.primary]}
                        </span>
                        {hasVideo && (
                          <Youtube
                            size={15}
                            className="text-accent-ink"
                            aria-label="Video verknüpft"
                          />
                        )}
                        <ChevronRight size={15} className="text-faint" aria-hidden />
                      </span>
                    </Pressable>
                    {ex.custom && (
                      <Pressable
                        onClick={() => {
                          setEditing(ex);
                          setEditorOpen(true);
                        }}
                        aria-label={`${ex.name} bearbeiten`}
                        className="shrink-0 rounded-full p-2 text-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-ink"
                      >
                        <Pencil size={14} />
                      </Pressable>
                    )}
                    {ex.pattern !== "cardio" && (
                      <Pressable
                        onClick={() => toggleExerciseDisabled(ex.id)}
                        aria-label={`${ex.name} ${off ? "aktivieren" : "deaktivieren"}`}
                        aria-pressed={off}
                        className={cn(
                          "shrink-0 rounded-full p-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-ink",
                          off ? "text-status-over" : "text-faint",
                        )}
                      >
                        {off ? <EyeOff size={14} /> : <Eye size={14} />}
                      </Pressable>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        ))
      )}

      <p className={cn("mt-1 px-1 text-xs text-faint", groups.length === 0 && "hidden")}>
        Ausgegraut = Equipment fehlt. Übung antippen → Ausführung, Video und Notizen.
      </p>

      <GuideSheet open={!!selected} onClose={() => setSelected(null)} ex={selected} />
      <CustomExerciseEditor
        open={editorOpen}
        onClose={() => setEditorOpen(false)}
        initial={editing}
      />
    </div>
  );
}
