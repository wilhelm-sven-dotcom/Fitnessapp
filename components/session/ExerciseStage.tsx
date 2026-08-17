"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Check, ChevronRight, Repeat, Wrench } from "lucide-react";
import { useEffect, useState } from "react";
import { PhasenFigur } from "@/components/phasen/PhasenFigur";
import { SetRow } from "@/components/workout/SetRow";
import { Pressable } from "@/components/ui/pressable";
import { beatsRecord } from "@/lib/records";
import type { ExRecord } from "@/lib/records";
import { PATTERN_LABEL } from "@/lib/exercises";
import { fmtKg } from "@/lib/format";
import { SPRING } from "@/lib/motion";
import { figurFor } from "@/lib/phasen/figuren";
import { isFilled } from "@/lib/stats";
import { cn } from "@/lib/utils";
import type { PlannedExercise } from "@/lib/session-model";
import type { Exercise, LastPerf, Prescription, SetEntry } from "@/lib/types";

/**
 * Die Bühne: EINE Übung im Fokus (Fokus.dc). Oben die Bühnen-Karte —
 * Zoetrop-Figur in Siegellack auf dem 88er-Raster, Name in Kursive,
 * Satz-Stand; darunter das Kader-Logbuch (SetRow: der offene Kader ist das
 * Instrument mit Siegellack-Rahmen). Handler-Pfade unverändert.
 */
export function ExerciseStage({
  ex,
  item,
  index,
  total,
  sets,
  presc,
  lastPerf,
  record,
  isExam,
  aidNote,
  weightStep,
  zoetropOn,
  onOpenGuide,
  onSwap,
  onPrev,
  onNext,
  onWeight,
  onReps,
  onRir,
  onIntensity,
  onCardioToggle,
}: {
  ex: Exercise;
  item: PlannedExercise;
  index: number;
  total: number;
  sets: SetEntry[];
  presc: Prescription;
  lastPerf: LastPerf | null;
  record: ExRecord | null;
  isExam: boolean;
  aidNote?: string;
  /** Schrittweite der Gewichts-Stepper im Satz-Logbuch (settings.weightStep). */
  weightStep?: number;
  /** Zoetrop-Gate (settings.zoetrope). */
  zoetropOn?: boolean;
  onOpenGuide: () => void;
  /** Schnell-Tausch der aktuellen Übung — nur gereicht, wenn erlaubt & Pool da. */
  onSwap?: () => void;
  /** Swipe auf der Bühne blättert zwischen Übungen (Buttons bleiben). */
  onPrev: () => void;
  onNext: () => void;
  onWeight: (i: number, val: string) => void;
  onReps: (i: number, oldVal: string, val: string) => void;
  onRir: (i: number, val: number) => void;
  onIntensity: (i: number, val: number) => void;
  onCardioToggle: (done: boolean) => void;
}) {
  // Fokus-Logbuch: der manuell geöffnete Satz; sonst der erste offene Arbeitssatz.
  const [editIdx, setEditIdx] = useState<number | null>(null);
  useEffect(() => setEditIdx(null), [item.id]);
  const reduce = useReducedMotion();

  const activeSetIdx = sets.findIndex(
    (s) => !s.warmup && (s.reps === "" || s.reps == null),
  );
  const effActive = editIdx ?? activeSetIdx;
  const work = sets.filter((s) => !s.warmup);
  const done = work.filter(isFilled).length;
  const alleBelichtet = ex.pattern !== "cardio" && activeSetIdx < 0;

  const prescLine = isExam
    ? "Prüfung: Rampe 5 · 4 · 3 — steigere zum schweren Test-Satz."
    : presc.line;

  // Ghost-Werte fürs Logbuch (Vorschlag bzw. zuletzt bewegtes Gewicht).
  const lastW = [...sets]
    .reverse()
    .find((s) => !s.warmup && s.weight !== "" && s.weight != null)?.weight;
  const ghostWeight = ex.weighted
    ? ((lastW as string | undefined) ??
      (presc.suggestedWeight != null ? String(presc.suggestedWeight) : undefined))
    : undefined;
  const ghostReps = presc.r || String(ex.repHigh);

  const cardioDone = !!sets[0] && sets[0].reps !== "" && sets[0].reps != null;
  const figur = figurFor(ex);

  // „Letztes Mal"-Inline-Zeile für den offenen Kader (Fokus.dc):
  // Top-Arbeitssatz von damals + RIR.
  const lastInline = (() => {
    const w = (lastPerf?.sets ?? []).filter((s) => !s.warmup && isFilled(s));
    if (!w.length) return null;
    const top = w.reduce((a, b) =>
      (Number(b.weight) || 0) > (Number(a.weight) || 0) ? b : a,
    );
    if (ex.unit === "Sek") return `${top.reps} s`;
    const kg = Number(top.weight) || 0;
    return `${kg > 0 ? `${fmtKg(kg)} × ` : "× "}${top.reps}${top.rir != null ? ` · RIR ${top.rir}` : ""}`;
  })();
  const zielLabel =
    ex.pattern === "cardio"
      ? undefined
      : `Ziel ${item.sets} × ${item.repLow}${item.repHigh > item.repLow ? `–${item.repHigh}` : ""}`;

  return (
    <section data-testid="stage-order">
      {/* Bühnen-Karte = Wischfläche: horizontal blättern; das Kader-Logbuch
          darunter bleibt reine Tipp-Zone. */}
      <motion.div
        className="rounded-card border border-line-card bg-surface-1 p-3.5"
        drag={reduce ? false : "x"}
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.18}
        dragMomentum={false}
        onDragEnd={(_, info) => {
          if (info.offset.x < -56 || info.velocity.x < -500) onNext();
          else if (info.offset.x > 56 || info.velocity.x > 500) onPrev();
        }}
      >
        <div className="flex justify-between gap-2 font-mono text-3xs font-medium uppercase tracking-gesperrt text-muted">
          <span>
            Übung <span className="tabular-nums">{index + 1}/{total}</span> · Bühne
          </span>
          <span className={cn(alleBelichtet && "text-cyanotypie")}>
            {alleBelichtet ? "Alle Kader belichtet" : "Zoetrop 8 B/s"}
          </span>
        </div>
        {ex.pattern !== "cardio" && (
          <div className="mt-2.5">
            <PhasenFigur
              figur={figur}
              mode={alleBelichtet ? "freeze" : "zoetrop"}
              color="var(--accent)"
              zoetropOn={zoetropOn}
              buehne
              raster
            />
          </div>
        )}
        <div className="mt-2.5 flex items-baseline justify-between gap-3">
          <h2 className="min-w-0 truncate font-display text-titel italic text-fg">
            {ex.name}
          </h2>
          {ex.pattern === "cardio" ? (
            <span className="shrink-0 font-mono text-2xs uppercase tracking-gesperrt text-muted">
              <span className="tabular-nums">
                {ex.repLow}–{ex.repHigh}
              </span>{" "}
              Min
            </span>
          ) : (
            <span className="shrink-0 font-mono text-2xs uppercase tracking-gesperrt text-muted">
              Satz{" "}
              <span className="tabular-nums">
                {Math.min(done + 1, work.length)}/{work.length}
              </span>
            </span>
          )}
        </div>
        <p className="mt-1 font-mono text-3xs uppercase tracking-gesperrt text-muted">
          {ex.tag} · {PATTERN_LABEL[ex.pattern]}
        </p>
        {item.why && (
          <p className="mt-1.5 font-display text-sm leading-snug text-muted">{item.why}</p>
        )}
        {aidNote && (
          <Pressable
            onClick={onOpenGuide}
            className="flex min-h-11 items-center gap-1 rounded-card text-xs text-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-cyanotypie"
          >
            <Wrench size={12} className="shrink-0" />
            <span className="min-w-0 truncate">Hilfsmittel: {aidNote}</span>
          </Pressable>
        )}
      </motion.div>

      {ex.pattern === "cardio" ? (
        <div className="mt-3 rounded-card border border-line-card bg-surface-1 p-3.5">
          {ex.steps.length > 0 && (
            <ul className="mb-3 space-y-1">
              {ex.steps.map((st, i) => (
                <li key={i} className="flex gap-2 text-xs leading-relaxed text-muted">
                  <span className="font-mono text-faint">{i + 1}</span>
                  <span>{st}</span>
                </li>
              ))}
            </ul>
          )}
          <Pressable
            onClick={() => onCardioToggle(!cardioDone)}
            className={cn(
              "flex w-full items-center justify-center gap-2 rounded-pill border py-2.5 font-mono text-xs font-semibold uppercase tracking-gesperrt-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyanotypie",
              cardioDone
                ? "border-line text-muted"
                : "border-strong text-fg",
            )}
          >
            <Check size={16} strokeWidth={2.5} />
            {cardioDone ? "Belichtet" : "Als belichtet markieren"}
          </Pressable>
        </div>
      ) : (
        <div className="mt-3 space-y-1.5">
          {(() => {
            let workIdx = 0;
            return sets.map((s, i) => {
              const label = s.warmup ? "Kalibr." : `Kader ${++workIdx}`;
              const filled = s.reps !== "" && s.reps != null;
              const state: "active" | "done" | "upcoming" =
                i === effActive ? "active" : filled ? "done" : "upcoming";
              return (
                // layout="position" = reine Translation: beim Aktiv-Wechsel
                // GLEITEN die Zeilen an ihre neuen Plätze (kein Scale-Morph,
                // der Ring und Inputs verzerren würde). SetRow selbst bleibt
                // unangetastet — .set-active trägt weiter den Smoke-Test.
                <motion.div
                  key={i}
                  layout={reduce ? false : "position"}
                  transition={SPRING.panel}
                >
                  <SetRow
                    label={label}
                    isWarmup={!!s.warmup}
                    unit={ex.unit}
                    set={s}
                    isDumbbell={ex.req.includes("dumbbell") || ex.req.includes("db")}
                    state={state}
                    ghostWeight={s.warmup ? undefined : ghostWeight}
                    ghostReps={s.warmup ? undefined : ghostReps}
                    weightStep={weightStep}
                    zielLabel={zielLabel}
                    lastLabel={lastInline}
                    prescLine={state === "active" && !s.warmup ? prescLine : undefined}
                    onWeight={(val) => onWeight(i, val)}
                    onReps={(oldVal, val) => onReps(i, oldVal, val)}
                    onRir={(val) => onRir(i, val)}
                    onIntensity={(val) => onIntensity(i, val)}
                    onActivate={() => setEditIdx(i)}
                    onDeactivate={() => setEditIdx((k) => (k === i ? null : k))}
                    recordLabel={record?.label}
                    isRecord={beatsRecord(ex, s, record ?? null)}
                  />
                </motion.div>
              );
            });
          })()}
        </div>
      )}

      {/* Fußzeile: Guide links, Schnell-Tausch rechts — bewusst AUSSERHALB der
          Wischfläche oben, damit kein Swipe-Tap-Konflikt entsteht. */}
      <div className="mt-2 flex items-center justify-between gap-2">
        <Pressable
          onClick={onOpenGuide}
          className="-ml-2 flex min-h-11 items-center gap-1 rounded-card px-2 py-2 font-mono text-xs font-medium uppercase tracking-gesperrt text-accent-ink focus:outline-none"
        >
          <ChevronRight size={14} /> Guide & Technik
        </Pressable>
        {onSwap && (
          <Pressable
            onClick={onSwap}
            aria-label={`${ex.name} tauschen`}
            className="flex min-h-11 shrink-0 items-center gap-1.5 rounded-pill border border-strong px-3 font-mono text-xs font-semibold uppercase tracking-gesperrt-2 text-fg focus:outline-none focus-visible:ring-2 focus-visible:ring-cyanotypie"
          >
            <Repeat size={13} /> Tauschen
          </Pressable>
        )}
      </div>
    </section>
  );
}
