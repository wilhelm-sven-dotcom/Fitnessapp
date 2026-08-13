"use client";

import { Check, ChevronRight, Wrench } from "lucide-react";
import { useEffect, useState } from "react";
import { SetRow } from "@/components/workout/SetRow";
import { Pressable } from "@/components/ui/pressable";
import { beatsRecord } from "@/lib/records";
import type { ExRecord } from "@/lib/records";
import { PATTERN_LABEL } from "@/lib/exercises";
import { isFilled } from "@/lib/stats";
import { cn } from "@/lib/utils";
import type { PlannedExercise } from "@/lib/session-model";
import type { Exercise, LastPerf, Prescription, SetEntry } from "@/lib/types";

/**
 * Die Bühne: EINE Übung im Fokus. Kopf mit Nummer/Name/Ziel, der aktuelle
 * Auftrag groß, „Letztes Mal" als ruhige Referenz, darunter das Satz-Logbuch
 * (SetRow — Eingaben lokal gepuffert, Commit bei Blur/Enter).
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
  onOpenGuide,
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
  onOpenGuide: () => void;
  onWeight: (i: number, val: string) => void;
  onReps: (i: number, oldVal: string, val: string) => void;
  onRir: (i: number, val: number) => void;
  onIntensity: (i: number, val: number) => void;
  onCardioToggle: (done: boolean) => void;
}) {
  // Fokus-Logbuch: der manuell geöffnete Satz; sonst der erste offene Arbeitssatz.
  const [editIdx, setEditIdx] = useState<number | null>(null);
  useEffect(() => setEditIdx(null), [item.id]);

  const activeSetIdx = sets.findIndex(
    (s) => !s.warmup && (s.reps === "" || s.reps == null),
  );
  const effActive = editIdx ?? activeSetIdx;
  const work = sets.filter((s) => !s.warmup);
  const done = work.filter(isFilled).length;
  const complete = ex.pattern !== "cardio" && work.length > 0 && work.every(isFilled);

  const prescLine = isExam
    ? "Prüfung: Rampe 5 · 4 · 3 — steigere zum schweren Test-Satz."
    : presc.line;

  const ps = lastPerf
    ? lastPerf.sets
        .filter((s) => !s.warmup)
        .map((s) =>
          ex.unit === "Sek"
            ? `${s.reps}s`
            : s.weight !== "" && s.weight != null
              ? `${s.weight}×${s.reps}`
              : `${s.reps}`,
        )
        .join("   ")
    : null;

  // Ghost-Werte fürs Logbuch (Vorschlag bzw. zuletzt bewegtes Gewicht).
  const lastW = [...sets]
    .reverse()
    .find((s) => !s.warmup && s.weight !== "" && s.weight != null)?.weight;
  const ghostWeight = ex.weighted
    ? ((lastW as string | undefined) ??
      (presc.suggestedWeight != null ? String(presc.suggestedWeight) : undefined))
    : undefined;
  const ghostReps = presc.r || String(ex.repHigh);

  // Bühnen-Auftrag: was JETZT zu tun ist (gleiche Quelle wie die Ghost-Werte).
  const order = (() => {
    if (ex.pattern === "cardio" || activeSetIdx < 0) return null;
    const cur = sets[activeSetIdx];
    const prevW = [...sets]
      .slice(0, activeSetIdx)
      .reverse()
      .find((s) => !s.warmup && s.weight !== "" && s.weight != null)?.weight;
    const w = !ex.weighted
      ? undefined
      : cur && cur.weight !== "" && cur.weight != null
        ? String(cur.weight)
        : ((prevW as string | undefined) ??
          (presc.suggestedWeight != null ? String(presc.suggestedWeight) : undefined));
    const r = presc.r || String(ex.repHigh);
    const text = ex.unit === "Sek" ? `${r} Sek` : w ? `${w} kg × ${r}` : `× ${r}`;
    const setNo = sets.slice(0, activeSetIdx + 1).filter((s) => !s.warmup).length;
    return { text, setNo };
  })();

  const cardioDone = !!sets[0] && sets[0].reps !== "" && sets[0].reps != null;

  return (
    <section className="rounded-card border border-line bg-surface-1 p-4 shadow-card">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-xs text-accent-ink">
            {String(index + 1).padStart(2, "0")}
            <span className="text-faint"> / {String(total).padStart(2, "0")}</span>
          </p>
          <h2 className="mt-0.5 font-display text-2xl font-semibold leading-tight tracking-tight text-fg">
            {ex.name}
          </h2>
          <p className="mt-0.5 text-xs text-muted">
            {ex.tag} · {PATTERN_LABEL[ex.pattern]}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="font-mono text-sm tabular-nums text-accent-ink">
            {ex.pattern === "cardio"
              ? `${ex.repLow}–${ex.repHigh}`
              : `${item.sets} × ${item.repLow}${item.repHigh > item.repLow ? `–${item.repHigh}` : ""}`}
          </p>
          <p className="text-xs uppercase tracking-wider text-faint">
            {ex.pattern === "cardio" ? "Min" : ex.unit === "Sek" ? "Sekunden" : "Wdh"}
          </p>
        </div>
      </div>

      {item.why && (
        <p className="mt-2 text-xs leading-relaxed text-muted">{item.why}</p>
      )}

      {aidNote && (
        <Pressable
          onClick={onOpenGuide}
          className="mt-1.5 flex items-center gap-1 text-xs text-muted focus:outline-none"
        >
          <Wrench size={12} className="shrink-0" />
          <span className="min-w-0 truncate">Hilfsmittel: {aidNote}</span>
        </Pressable>
      )}

      {ex.pattern === "cardio" ? (
        <div className="mt-3">
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
              "flex w-full items-center justify-center gap-2 rounded-card py-2.5 text-sm font-medium focus:outline-none",
              cardioDone ? "bg-surface-2 text-accent-2" : "bg-surface-2 text-fg",
            )}
          >
            <Check size={16} strokeWidth={2.5} />
            {cardioDone ? "Erledigt" : "Als erledigt markieren"}
          </Pressable>
        </div>
      ) : (
        <>
          {order && (
            <div className="mt-4 text-center" data-testid="stage-order">
              <p className="font-mono text-xs uppercase tracking-widest text-faint">
                Jetzt · Satz {order.setNo}/{item.sets}
              </p>
              <p className="mt-1 font-display text-5xl font-bold leading-none tracking-tight tabular-nums text-fg">
                {order.text}
              </p>
            </div>
          )}

          <div className="mt-4 rounded-card border-l-2 border-accent-sessions bg-surface-2 px-3 py-2">
            <p className="text-xs uppercase tracking-widest text-muted">Letztes Mal</p>
            <p className="font-mono text-sm tabular-nums text-fg">{ps || "—"}</p>
            <p className="mt-1 text-xs text-accent-ink">{prescLine}</p>
          </div>

          <div className="mt-3 space-y-1">
            {(() => {
              let workIdx = 0;
              return sets.map((s, i) => {
                const label = s.warmup ? "Aufw." : `Satz ${++workIdx}`;
                const filled = s.reps !== "" && s.reps != null;
                const state: "active" | "done" | "upcoming" =
                  i === effActive ? "active" : filled ? "done" : "upcoming";
                return (
                  <SetRow
                    key={i}
                    label={label}
                    isWarmup={!!s.warmup}
                    unit={ex.unit}
                    set={s}
                    isDumbbell={ex.req.includes("dumbbell") || ex.req.includes("db")}
                    state={state}
                    ghostWeight={s.warmup ? undefined : ghostWeight}
                    ghostReps={s.warmup ? undefined : ghostReps}
                    onWeight={(val) => onWeight(i, val)}
                    onReps={(oldVal, val) => onReps(i, oldVal, val)}
                    onRir={(val) => onRir(i, val)}
                    onIntensity={(val) => onIntensity(i, val)}
                    onActivate={() => setEditIdx(i)}
                    onDeactivate={() => setEditIdx((k) => (k === i ? null : k))}
                    recordLabel={record?.label}
                    isRecord={beatsRecord(ex, s, record ?? null)}
                  />
                );
              });
            })()}
          </div>

          {complete && (
            <p className="mt-3 flex items-center gap-1.5 text-sm font-medium text-status-in">
              <Check size={15} strokeWidth={2.5} /> Übung geschafft — {done}/
              {work.length} Sätze.
            </p>
          )}
        </>
      )}

      <Pressable
        onClick={onOpenGuide}
        className="mt-2 -ml-2 flex min-h-11 items-center gap-1 rounded-card px-2 py-2 text-xs text-accent-ink focus:outline-none"
      >
        <ChevronRight size={14} /> Ausführung & Technik
      </Pressable>
    </section>
  );
}
