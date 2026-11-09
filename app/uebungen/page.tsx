"use client";

import { Check, ChevronDown, Eye, EyeOff, Pencil, Plus, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { CustomExerciseEditor } from "@/components/exercises/CustomExerciseEditor";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { ChipToggle } from "@/components/ui/ChipToggle";
import { Pressable } from "@/components/ui/pressable";
import { Sheet } from "@/components/ui/sheet";
import { GuideSheet } from "@/components/workout/GuideSheet";
import { PhasenFigur } from "@/components/phasen/PhasenFigur";
import { PATTERN_FIGUR } from "@/lib/phasen/figuren";
import { REGION_VAR, regionOf } from "@/lib/phasen/band";
import { WarmupCatalogSection } from "@/components/warmup/WarmupCatalogSection";
import { useTraining } from "@/components/providers/TrainingProvider";
import { geraetText } from "@/lib/equipment";
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
  const [filterBlatt, setFilterBlatt] = useState<"muster" | "muskel" | null>(null);
  const jeMuster = useMemo(() => {
    const m = new Map<Pattern, number>();
    for (const e of allLib) m.set(e.pattern, (m.get(e.pattern) ?? 0) + 1);
    return m;
  }, [allLib]);

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
        eyebrow={`${allLib.length} Übungen${customCount ? ` · ${customCount} eigene` : ""}`}
        title="Übungskatalog"
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
            className="min-h-11 w-full rounded-pill border border-line bg-surface-1 py-2.5 pl-9 pr-3 text-base text-fg placeholder:text-faint focus:outline-none focus-visible:ring-2 focus-visible:ring-fokus"
          />
        </div>
        <Pressable
          onClick={() => {
            setEditing(null);
            setEditorOpen(true);
          }}
          aria-label="Eigene Übung anlegen"
          className="flex min-h-11 shrink-0 items-center gap-1.5 rounded-pill bg-strong px-4 text-sm font-bold text-on-strong focus:outline-none focus-visible:ring-2 focus-visible:ring-fokus"
        >
          <Plus size={18} strokeWidth={2.5} aria-hidden /> Neu
        </Pressable>
      </div>

      {/* Filter in EINER Zeile: Muster und Muskel öffnen je ein Blatt, dazu
          der Geräte-Schalter. Die Liste beginnt so direkt darunter. */}
      <div className="mb-2 flex items-center gap-2">
        {(
          [
            ["muster", patFilter ? PATTERN_LABEL[patFilter] : "Muster", !!patFilter],
            ["muskel", muscleFilter ? MUSCLE_LABEL[muscleFilter] : "Muskel", !!muscleFilter],
          ] as const
        ).map(([key, label, aktiv]) => (
          <Pressable
            key={key}
            onClick={() => setFilterBlatt(key)}
            aria-haspopup="dialog"
            className={cn(
              "flex min-h-10 min-w-0 items-center gap-1.5 rounded-pill px-3.5 text-sm font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-fokus",
              aktiv ? "bg-strong text-on-strong" : "border border-line text-fg",
            )}
          >
            <span className="truncate">{label}</span>
            <ChevronDown size={16} className="shrink-0" aria-hidden />
          </Pressable>
        ))}
        <ChipToggle active={onlyAvailable} onClick={() => setOnlyAvailable((v) => !v)}>
          Meine Geräte
        </ChipToggle>
      </div>
      <div className="mb-4 flex min-h-8 items-center justify-between gap-2 px-1 text-sm text-muted">
        <span className="tabular-nums">{shown} Treffer</span>
        {(patFilter || muscleFilter || onlyAvailable) && (
          <Pressable
            onClick={() => {
              setPatFilter(null);
              setMuscleFilter(null);
              setOnlyAvailable(false);
            }}
            className="rounded-pill px-2 py-1 font-semibold text-fg underline underline-offset-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-fokus"
          >
            Filter zurücksetzen
          </Pressable>
        )}
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
        groups.map((g) => {
          const farbe = REGION_VAR[regionOf(g.list[0])];
          return (
            <section key={g.pat} className="mb-5">
              {/* Gruppenkopf trägt die Figur EINMAL — die Zeilen nennen Muskel und Gerät. */}
              <div className="mb-2 flex items-center gap-3 px-1">
                <span aria-hidden className="w-9 shrink-0">
                  <PhasenFigur figur={PATTERN_FIGUR[g.pat]} color={farbe} />
                </span>
                <h2 className="text-base font-bold text-fg">{PATTERN_LABEL[g.pat]}</h2>
                <span className="text-sm tabular-nums text-muted">{g.list.length}</span>
              </div>
              <div className="overflow-hidden rounded-card bg-surface-1">
                {g.list.map((ex, rowIdx) => {
                  const hasVideo = !!exerciseVideos[ex.id];
                  const available = reqOk(ex, has);
                  const off = disabledExercises.includes(ex.id);
                  const m = muscleOf(ex);
                  return (
                    <div
                      key={ex.id}
                      className={cn(
                        "flex items-center gap-1 pr-1",
                        rowIdx > 0 && "border-t border-line-card",
                      )}
                    >
                      <Pressable
                        onClick={() => setSelected(ex)}
                        className="flex min-h-14 min-w-0 flex-1 items-center gap-3 py-2.5 pl-3 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-fokus"
                      >
                        <span
                          aria-hidden
                          className="h-8 w-1 shrink-0 rounded-pill"
                          style={{ backgroundColor: available && !off ? farbe : "var(--line)" }}
                        />
                        <span className="min-w-0 flex-1">
                          <span className="flex min-w-0 flex-wrap items-center gap-x-2">
                            <span
                              className={cn(
                                "text-base font-semibold leading-snug",
                                available && !off ? "text-fg" : "text-muted",
                                off && "line-through",
                              )}
                            >
                              {ex.name}
                            </span>
                            {ex.custom && (
                              <span className="shrink-0 rounded-pill border border-line px-2 py-0.5 text-3xs font-semibold text-muted">
                                Eigene
                              </span>
                            )}
                            {off && (
                              <span className="shrink-0 rounded-pill border border-line px-2 py-0.5 text-3xs font-semibold text-muted">
                                Aus
                              </span>
                            )}
                          </span>
                          <span className="mt-0.5 block text-sm leading-snug text-muted">
                            {ex.pattern === "cardio" ? ex.tag : MUSCLE_LABEL[m.primary]} ·{" "}
                            {geraetText(ex.req)}
                            {hasVideo ? " · Video" : ""}
                          </span>
                        </span>
                      </Pressable>
                      {ex.custom && (
                        <Pressable
                          onClick={() => {
                            setEditing(ex);
                            setEditorOpen(true);
                          }}
                          aria-label={`${ex.name} bearbeiten`}
                          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-pill text-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-fokus"
                        >
                          <Pencil size={16} />
                        </Pressable>
                      )}
                      {ex.pattern !== "cardio" && (
                        <Pressable
                          onClick={() => toggleExerciseDisabled(ex.id)}
                          aria-label={`${ex.name} ${off ? "aktivieren" : "deaktivieren"}`}
                          aria-pressed={off}
                          className={cn(
                            "flex h-11 w-11 shrink-0 items-center justify-center rounded-pill focus:outline-none focus-visible:ring-2 focus-visible:ring-fokus",
                            off ? "text-warnung" : "text-muted",
                          )}
                        >
                          {off ? <EyeOff size={16} /> : <Eye size={16} />}
                        </Pressable>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })
      )}

      <p className={cn("mb-4 mt-1 px-1 text-sm text-muted", groups.length === 0 && "hidden")}>
        Grauer Balken: Gerät fehlt am aktuellen Ort. Übung antippen für Anleitung,
        Video, Notizen und deinen Verlauf.
      </p>

      {/* Aufwärm-Drills sind kein Teil der filterbaren Übungs-Lib — die Sektion
          erscheint nur im ungefilterten Grundzustand. */}
      {!q && !patFilter && !muscleFilter && !onlyAvailable && <WarmupCatalogSection />}

      <Sheet
        open={filterBlatt === "muster"}
        onClose={() => setFilterBlatt(null)}
        title="Muster"
      >
        <ul>
          {[null, ...PATTERN_ORDER].map((p) => {
            const aktiv = patFilter === p;
            return (
              <li key={p ?? "alle"} className="border-b border-line-card last:border-0">
                <Pressable
                  onClick={() => {
                    setPatFilter(p);
                    setFilterBlatt(null);
                  }}
                  aria-pressed={aktiv}
                  className="flex min-h-12 w-full items-center gap-3 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-fokus"
                >
                  <span aria-hidden className="w-8 shrink-0">
                    {p && <PhasenFigur figur={PATTERN_FIGUR[p]} color="var(--fg)" />}
                  </span>
                  <span className="min-w-0 flex-1 text-base font-semibold text-fg">
                    {p ? PATTERN_LABEL[p] : "Alle Muster"}
                  </span>
                  <span className="text-sm tabular-nums text-muted">
                    {p ? (jeMuster.get(p) ?? 0) : allLib.length}
                  </span>
                  <span className="w-5 shrink-0" aria-hidden>
                    {aktiv && <Check size={18} />}
                  </span>
                </Pressable>
              </li>
            );
          })}
        </ul>
      </Sheet>
      <Sheet
        open={filterBlatt === "muskel"}
        onClose={() => setFilterBlatt(null)}
        title="Muskel"
      >
        <ul>
          {[null, ...MUSCLE_ORDER].map((m) => {
            const aktiv = muscleFilter === m;
            return (
              <li key={m ?? "alle"} className="border-b border-line-card last:border-0">
                <Pressable
                  onClick={() => {
                    setMuscleFilter(m);
                    setFilterBlatt(null);
                  }}
                  aria-pressed={aktiv}
                  className="flex min-h-12 w-full items-center gap-3 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-fokus"
                >
                  <span className="min-w-0 flex-1 text-base font-semibold text-fg">
                    {m ? MUSCLE_LABEL[m] : "Alle Muskeln"}
                  </span>
                  <span className="w-5 shrink-0" aria-hidden>
                    {aktiv && <Check size={18} />}
                  </span>
                </Pressable>
              </li>
            );
          })}
        </ul>
      </Sheet>

      <GuideSheet open={!!selected} onClose={() => setSelected(null)} ex={selected} />
      <CustomExerciseEditor
        open={editorOpen}
        onClose={() => setEditorOpen(false)}
        initial={editing}
      />
    </div>
  );
}
