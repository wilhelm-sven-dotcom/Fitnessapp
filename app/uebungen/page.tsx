"use client";

import { Check, ChevronDown, Eye, EyeOff, Pencil, Plus, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { CustomExerciseEditor } from "@/components/exercises/CustomExerciseEditor";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { ChipToggle } from "@/components/ui/ChipToggle";
import { Pressable } from "@/components/ui/pressable";
import { Segment } from "@/components/ui/Segment";
import { Sheet } from "@/components/ui/sheet";
import { GeraetBild } from "@/components/geraete/GeraetBild";
import { GeraetFotoAktionen } from "@/components/geraete/GeraetFotoAktionen";
import type { GeraetKey } from "@/components/geraete/GeraetZeichnung";
import { GuideSheet } from "@/components/workout/GuideSheet";
import { BewegungsMini } from "@/components/bewegung/BewegungsMini";
import { MUSTER_BILD } from "@/lib/bewegung";
import { REGION_VAR, regionOf } from "@/lib/phasen/band";
import { WarmupCatalogSection } from "@/components/warmup/WarmupCatalogSection";
import { useTraining } from "@/components/providers/TrainingProvider";
import { geraetText } from "@/lib/equipment";
import { PATTERN_LABEL } from "@/lib/exercises";
import { GERAETE_REIHENFOLGE, geraetName, geraetVon } from "@/lib/geraete";
import { hasFuer } from "@/lib/orte";
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

/** Eine Katalog-Gruppe: ein Gerät (Ort „nur an Geräten“) oder ein Muster. */
interface Gruppe {
  key: string;
  titel: string;
  list: Exercise[];
  pat?: Pattern;
  geraet?: GeraetKey;
}

export default function ExerciseCatalogPage() {
  const { allLib, exerciseVideos, has, disabledExercises, toggleExerciseDisabled, gyms, activeGym } =
    useTraining();
  // Katalog nach Ort: null = der heutige Ort; „alle“ = der ganze Katalog.
  const [sicht, setSicht] = useState<string | null>(null);
  const sichtId = sicht ?? activeGym?.id ?? "alle";
  const ortSicht = sichtId === "alle" ? null : (gyms.find((g) => g.id === sichtId) ?? null);
  const nachGeraet = !!ortSicht?.nurGeraete;
  const hasSicht = useMemo(() => (ortSicht ? hasFuer(ortSicht) : has), [ortSicht, has]);
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

  // Suche + Muster-/Muskel-Filter; am Ort nur, was er hergibt. Ort „nur an
  // Geräten“: Gruppen je Gerät, sonst nach Bewegungsmuster.
  const groups = useMemo<Gruppe[]>(() => {
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
      if (ortSicht) {
        if (!reqOk(e, hasSicht)) return false;
      } else if (onlyAvailable && !reqOk(e, has)) return false;
      return true;
    };
    const sortiert = (l: Exercise[]) => l.sort((a, b) => a.name.localeCompare(b.name, "de"));
    if (nachGeraet) {
      const out: Gruppe[] = GERAETE_REIHENFOLGE.map((k) => ({
        key: k,
        titel: geraetName(k),
        geraet: k,
        list: sortiert(allLib.filter((e) => geraetVon(e) === k && match(e))),
      }));
      const rest = sortiert(allLib.filter((e) => geraetVon(e) === null && match(e)));
      if (rest.length) out.push({ key: "weitere", titel: "Weitere Geräte", list: rest });
      return out.filter((g) => g.list.length > 0);
    }
    return PATTERN_ORDER.map((pat) => ({
      key: pat,
      titel: PATTERN_LABEL[pat],
      pat,
      list: sortiert(allLib.filter((e) => e.pattern === pat && match(e))),
    })).filter((g) => g.list.length > 0);
  }, [allLib, q, patFilter, muscleFilter, onlyAvailable, has, ortSicht, hasSicht, nachGeraet]);

  const shown = groups.reduce((a, g) => a + g.list.length, 0);

  return (
    <div>
      <PageHeader
        eyebrow={`${allLib.length} Übungen${customCount ? ` · ${customCount} eigene` : ""}`}
        title="Übungskatalog"
      />

      {gyms.length > 0 && (
        <Segment
          label="Katalog für Ort"
          options={[
            ...gyms.map((g) => ({ value: g.id, label: g.name })),
            { value: "alle", label: "Alle" },
          ]}
          value={sichtId}
          onChange={(v) => setSicht(v)}
          className="mb-3"
        />
      )}

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
              "flex min-h-11 min-w-0 items-center gap-1.5 rounded-pill px-3.5 text-sm font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-fokus",
              aktiv ? "bg-strong text-on-strong" : "border border-line text-fg",
            )}
          >
            <span className="truncate">{label}</span>
            <ChevronDown size={16} className="shrink-0" aria-hidden />
          </Pressable>
        ))}
        {!ortSicht && (
          <ChipToggle active={onlyAvailable} onClick={() => setOnlyAvailable((v) => !v)}>
            Meine Geräte
          </ChipToggle>
        )}
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
            className="flex min-h-11 items-center rounded-pill px-2 font-semibold text-fg underline underline-offset-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-fokus"
          >
            Filter zurücksetzen
          </Pressable>
        )}
      </div>

      {groups.length === 0 ? (
        <EmptyState
          bild="nichts-gefunden"
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
          return (
            <section key={g.key} className="mb-5">
              {/* Gruppenkopf: Gerät mit Bild und Kamera-Knopf, sonst die Figur
                  des Musters EINMAL — die Zeilen nennen Muskel und Gerät. */}
              <div className="mb-2 flex items-center gap-3 px-1">
                {g.geraet ? (
                  <span
                    aria-hidden
                    className="h-12 w-16 shrink-0 overflow-hidden rounded-kachel border-dick border-rand bg-surface-1"
                  >
                    <GeraetBild geraet={g.geraet} dekorativ klein />
                  </span>
                ) : g.pat ? (
                  <BewegungsMini id={MUSTER_BILD[g.pat]} className="h-12 w-12" />
                ) : null}
                <h2
                  className={cn(
                    "min-w-0 flex-1 text-base font-bold text-fg",
                    g.geraet && "font-display text-lg font-extrabold",
                  )}
                >
                  {g.titel}
                </h2>
                <span className="text-sm tabular-nums text-muted">{g.list.length}</span>
                {g.geraet && <GeraetFotoAktionen geraet={g.geraet} kompakt />}
              </div>
              <div className="overflow-hidden rounded-card border-dick border-rand bg-surface-1">
                {g.list.map((ex, rowIdx) => {
                  const hasVideo = !!exerciseVideos[ex.id];
                  const available = reqOk(ex, hasSicht);
                  const farbe = REGION_VAR[regionOf(ex)];
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
                          className="h-4 w-4 shrink-0 rounded-xs border-dick border-rand"
                          style={{ backgroundColor: available && !off ? farbe : "var(--surface-2)" }}
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
        {ortSicht
          ? nachGeraet
            ? `${ortSicht.name}: nur Übungen an Geräten. Kamera-Knopf: eigenes Foto vom Gerät. `
            : `Nur Übungen, die ${ortSicht.name} hergibt. `
          : "Graues Quadrat: Gerät fehlt am heutigen Ort. "}
        Übung antippen für Anleitung, Video, Notizen und deinen Verlauf.
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
                  <span aria-hidden className="w-10 shrink-0">
                    {p && <BewegungsMini id={MUSTER_BILD[p]} className="h-10 w-10" />}
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
