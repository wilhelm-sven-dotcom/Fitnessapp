"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ArrowLeftRight, BookOpen, Check, ChevronRight, Wrench } from "lucide-react";
import { useEffect, useState } from "react";
import { BewegungsBild } from "@/components/bewegung/BewegungsBild";
import { useGeraetFoto } from "@/components/geraete/GeraetBild";
import { GeraetZeichnung } from "@/components/geraete/GeraetZeichnung";
import { PhasenFigur } from "@/components/phasen/PhasenFigur";
import { SetRow } from "@/components/workout/SetRow";
import { Button } from "@/components/ui/Button";
import { Sticker } from "@/components/ui/Sticker";
import { Pressable } from "@/components/ui/pressable";
import { beatsRecord, setMetric } from "@/lib/records";
import type { ExRecord } from "@/lib/records";
import { fmtSatz } from "@/lib/format";
import { SPRING } from "@/lib/motion";
import { hatBewegung } from "@/lib/bewegung";
import { geraetBildUrl, geraetVon } from "@/lib/geraete";
import { figurFor } from "@/lib/phasen/figuren";
import { isFilled } from "@/lib/stats";
import { cn } from "@/lib/utils";
import type { PlannedExercise } from "@/lib/session-model";
import type { Exercise, LastPerf, Prescription, RelatedPerf, SetEntry } from "@/lib/types";

const GRUND: Partial<Record<NonNullable<Prescription["reason"]>, string>> = {
  up: "mehr als letztes Mal",
  down: "etwas leichter als letztes Mal",
  start: "Startgewicht, 2–3 Wdh Reserve",
  lighter: "ruhiger Wiedereinstieg",
};

/** „Vorschlag 22,5 kg × 9 · mehr als letztes Mal“ — der Vorschlag ist das, was
 *  in den Kacheln vorbelegt steht; „Ziel“ bleibt der Bereich aus dem Plan. */
function vorschlagText(p: Prescription, ex: Exercise): string | undefined {
  const timed = ex.unit === "Sek";
  const werte = fmtSatz(p.w, p.r, timed);
  if (!werte)
    return p.reason === "start" && ex.weighted && !timed ? "Startgewicht selbst wählen" : undefined;
  const grund = p.reason ? GRUND[p.reason] : undefined;
  return `Vorschlag ${werte}${grund ? ` · ${grund}` : ""}`;
}

/**
 * Die Bühne: EINE Übung im Fokus. Oben der Übungskopf als Fläche in der
 * Regionsfarbe (kleine Figur, Name, Muskel und Satzstand; wischen blättert),
 * darunter „Anleitung“ und „Tauschen“, dann die Satzliste mit der offenen
 * Satzkarte. „Satz eintragen“ steht im Dock (SessionRunner).
 */
export function ExerciseStage({
  ex,
  item,
  sets,
  presc,
  lastPerf,
  relatedPerf,
  nextExName,
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
  sets: SetEntry[];
  presc: Prescription;
  lastPerf: LastPerf | null;
  /** Verwandte Übung als Ersatz-Historie — reine Anzeige. */
  relatedPerf: RelatedPerf | null;
  /** Name der nächsten offenen Übung — null, wenn danach der Abschluss kommt. */
  nextExName?: string | null;
  record: ExRecord | null;
  isExam: boolean;
  aidNote?: string;
  /** Schrittweite der Gewichts-Stepper (settings.weightStep). */
  weightStep?: number;
  /** Zoetrop-Gate (settings.zoetrope). */
  zoetropOn?: boolean;
  onOpenGuide: () => void;
  /** Schnell-Tausch der aktuellen Übung — nur gereicht, wenn erlaubt & Pool da. */
  onSwap?: () => void;
  /** Wischen über den Übungskopf blättert zwischen Übungen. */
  onPrev: () => void;
  onNext: () => void;
  onWeight: (i: number, val: string) => void;
  onReps: (i: number, oldVal: string, val: string) => void;
  onRir: (i: number, val: number) => void;
  onIntensity: (i: number, val: number) => void;
  onCardioToggle: (done: boolean) => void;
}) {
  // Der manuell geöffnete Satz; sonst der erste offene Arbeitssatz.
  const [editIdx, setEditIdx] = useState<number | null>(null);
  useEffect(() => setEditIdx(null), [item.id]);
  const reduce = useReducedMotion();

  const cardio = ex.pattern === "cardio";
  const geraet = geraetVon(ex);
  const foto = useGeraetFoto(geraet);
  // Ohne eigenes Foto: das mitgelieferte Bild (kleine Datei) als Kachel.
  const bild = foto ? null : geraetBildUrl(geraet, true);
  // Bewegungsbild als Kachel rechts — außer ein eigenes Gerätefoto füllt die
  // Karte (das hat Vorrang, wie bisher).
  const bewegt = !cardio && !foto && hatBewegung(ex.id);
  const timed = ex.unit === "Sek";

  const activeSetIdx = sets.findIndex((s) => !s.warmup && (s.reps === "" || s.reps == null));
  const effActive = editIdx ?? activeSetIdx;
  const work = sets.filter((s) => !s.warmup);
  const done = work.filter(isFilled).length;
  const alleErledigt = !cardio && activeSetIdx < 0;

  const vorschlag = isExam
    ? "Prüfung: Rampe 5 · 4 · 3, steigere zum schweren Test-Satz."
    : vorschlagText(presc, ex);

  // Platzhalter (Vorschlag bzw. zuletzt bewegtes Gewicht).
  const lastW = [...sets]
    .reverse()
    .find((s) => !s.warmup && s.weight !== "" && s.weight != null)?.weight;
  const ghostWeight = ex.weighted
    ? ((lastW as string | undefined) ??
      (presc.suggestedWeight != null ? String(presc.suggestedWeight) : undefined))
    : undefined;
  const ghostReps = presc.r || String(ex.repHigh);

  // Ein Wort über 12 Zeichen („Schulterdrücken,“) passt in der breiten
  // Schrift nicht in eine Zeile — eine Stufe kleiner statt Silbentrennung.
  const langesWort = ex.name.split(/\s+/).some((w) => w.length > 12);
  const cardioDone = !!sets[0] && sets[0].reps !== "" && sets[0].reps != null;
  const figur = figurFor(ex);

  // „Letztes Mal“: stärkster Arbeitssatz nach der Rekord-Kennzahl der Übung
  // (e1RM gewichtet, sonst Wiederholungen bzw. Sekunden) + RIR.
  const bestSatz = (list: SetEntry[]) => {
    const w = list.filter((s) => !s.warmup && isFilled(s));
    if (!w.length) return null;
    return w.reduce((a, b) => (setMetric(ex, b) > setMetric(ex, a) ? b : a));
  };
  const perfLabel = (top: SetEntry) => {
    const rir = !timed && top.rir != null ? ` · RIR ${top.rir}` : "";
    return `${fmtSatz(top.weight, top.reps, timed)}${rir}`;
  };
  const lastInline = (() => {
    const eigen = bestSatz(lastPerf?.sets ?? []);
    if (eigen) return perfLabel(eigen);
    // Kein eigener Verlauf: die verwandte Übung nennen statt „Erstes Mal“.
    const verwandt = bestSatz(relatedPerf?.sets ?? []);
    if (verwandt && relatedPerf) return `${relatedPerf.exName}: ${perfLabel(verwandt)}`;
    return null;
  })();
  const recordLabel = record
    ? record.kind === "weight"
      ? record.label.replace(" × ", " kg × ")
      : record.label
    : undefined;
  const zielLabel = cardio
    ? undefined
    : `Ziel ${item.repLow}${item.repHigh > item.repLow ? `–${item.repHigh}` : ""} ${timed ? "s" : "Wdh"}`;
  const stand = cardio
    ? `${item.repLow}–${item.repHigh} Min`
    : alleErledigt
      ? "Alle Sätze erledigt"
      : `Satz ${Math.min(done + 1, work.length)} von ${work.length}`;

  return (
    <section data-testid="stage-order">
      {/* Übungskopf = Wischfläche: horizontal blättern; Satzliste darunter
          bleibt reine Tipp-Zone. */}
      <motion.div
        className="relative mt-3 flex items-center gap-3 rounded-card border-dick border-rand bg-accent p-4 pr-5 text-on-accent shadow-hart"
        drag={reduce ? false : "x"}
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.18}
        dragMomentum={false}
        onDragEnd={(_, info) => {
          if (info.offset.x < -56 || info.velocity.x < -500) onNext();
          else if (info.offset.x > 56 || info.velocity.x > 500) onPrev();
        }}
      >
        {/* Gerät mit eigenem Foto: das Foto füllt die Karte, eine feste
            Tinte-Abdeckung hält die weiße Schrift lesbar. Eigene Ebene mit
            overflow-hidden, damit der Sticker über die Kante ragen darf.
            Bilder fangen keine Gesten ab (Wischen, langes Drücken). */}
        {foto && (
          <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden rounded-card">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={foto} alt="" draggable={false} className="h-full w-full object-cover" />
            <div className="absolute inset-0 bg-bild-scrim" />
          </div>
        )}
        {!cardio && !bewegt && !(geraet && !foto) && (
          <div className="relative w-14 shrink-0" aria-hidden>
            <PhasenFigur
              figur={figur}
              mode={alleErledigt ? "freeze" : "zoetrop"}
              color="var(--on-accent)"
              zoetropOn={zoetropOn}
            />
          </div>
        )}
        <div className="relative min-w-0 flex-1">
          <h2
            className={cn(
              "hyphens-auto break-words font-display font-extrabold leading-tight",
              langesWort ? "text-xl" : "text-2xl",
            )}
          >
            {ex.name}
          </h2>
          <p className="mt-1 text-sm font-semibold tabular-nums">
            {stand}
            {zielLabel && !alleErledigt ? ` · ${zielLabel}` : ""}
          </p>
        </div>
        {/* Bewegungsbild als Kachel rechts; erledigt oder mit Figuren aus
            steht es still. */}
        {bewegt && (
          <div
            aria-hidden
            className="pointer-events-none relative aspect-bild w-28 shrink-0 overflow-hidden rounded-kachel border-dick border-rand bg-surface-1"
          >
            <BewegungsBild id={ex.id} klein steht={alleErledigt || zoetropOn === false} />
          </div>
        )}
        {/* Gerät ohne eigenes Foto: das mitgelieferte Bild als Kachel
            rechts, sonst die Zeichnung in Weiß auf Blau. */}
        {!bewegt && geraet && !foto && bild && (
          <div
            aria-hidden
            className="pointer-events-none relative aspect-bild w-28 shrink-0 overflow-hidden rounded-kachel border-dick border-rand bg-surface-1"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={bild}
              alt=""
              draggable={false}
              decoding="async"
              className="h-full w-full object-cover"
            />
          </div>
        )}
        {!bewegt && geraet && !foto && !bild && (
          <div aria-hidden className="relative w-28 shrink-0 self-end">
            <GeraetZeichnung geraet={geraet} variante="auf-blau" />
          </div>
        )}
        {/* Die Region als Sticker an der Kartenkante (Wort, nicht Farbe). */}
        <Sticker drehung={4} className="absolute -top-3.5 right-3 max-w-48 overflow-hidden">
          {ex.tag}
        </Sticker>
      </motion.div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Pressable
          onClick={onOpenGuide}
          className="flex min-h-11 items-center gap-2 rounded-pill border-dick border-rand bg-surface-1 px-4 font-display text-sm font-extrabold text-fg focus:outline-none focus-visible:ring-2 focus-visible:ring-fokus"
        >
          <BookOpen size={18} aria-hidden /> Anleitung
        </Pressable>
        {onSwap && (
          <Pressable
            onClick={onSwap}
            aria-label={`${ex.name} tauschen`}
            className="flex min-h-11 items-center gap-2 rounded-pill border-dick border-rand bg-surface-1 px-4 font-display text-sm font-extrabold text-fg focus:outline-none focus-visible:ring-2 focus-visible:ring-fokus"
          >
            <ArrowLeftRight size={18} aria-hidden /> Tauschen
          </Pressable>
        )}
      </div>
      {aidNote && (
        <Pressable
          onClick={onOpenGuide}
          className="mt-1 flex min-h-11 w-full items-center gap-1.5 rounded-inner text-sm text-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-fokus"
        >
          <Wrench size={14} className="shrink-0" aria-hidden />
          <span className="min-w-0 truncate">Hilfsmittel: {aidNote}</span>
        </Pressable>
      )}
      {/* Warum diese Übung — Kontext für den Einstieg, danach nur Ballast. */}
      {item.why && done === 0 && (
        <p className="mt-2 text-sm leading-snug text-muted">{item.why}</p>
      )}

      {cardio ? (
        <div className="mt-3 rounded-card border-dick border-rand bg-surface-1 p-4">
          {ex.steps.length > 0 && (
            <ol className="mb-3 space-y-1.5">
              {ex.steps.map((st, i) => (
                <li key={i} className="flex gap-2 text-sm leading-relaxed text-muted">
                  <span className="tabular-nums text-faint">{i + 1}</span>
                  <span>{st}</span>
                </li>
              ))}
            </ol>
          )}
          <Button
            variant={cardioDone ? "secondary" : "primary"}
            size="lg"
            full
            onClick={() => onCardioToggle(!cardioDone)}
          >
            <Check size={18} strokeWidth={2.5} aria-hidden />
            {cardioDone ? "Erledigt" : "Als erledigt markieren"}
          </Button>
        </div>
      ) : (
        <div className="mt-3 space-y-2">
          {(() => {
            let workIdx = 0;
            return sets.map((s, i) => {
              const label = s.warmup ? "Aufwärmen" : `Satz ${++workIdx}`;
              const filled = s.reps !== "" && s.reps != null;
              const state: "active" | "done" | "upcoming" =
                i === effActive ? "active" : filled ? "done" : "upcoming";
              return (
                // layout="position" = reine Translation: beim Wechsel des
                // offenen Satzes gleiten die Zeilen an ihre neuen Plätze.
                <motion.div key={i} layout={reduce ? false : "position"} transition={SPRING.panel}>
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
                    vorschlag={state === "active" && !s.warmup ? vorschlag : undefined}
                    onWeight={(val) => onWeight(i, val)}
                    onReps={(oldVal, val) => onReps(i, oldVal, val)}
                    onRir={(val) => onRir(i, val)}
                    onIntensity={(val) => onIntensity(i, val)}
                    onActivate={() => setEditIdx(i)}
                    onDeactivate={() => setEditIdx((k) => (k === i ? null : k))}
                    recordLabel={recordLabel}
                    isRecord={beatsRecord(ex, s, record ?? null)}
                  />
                </motion.div>
              );
            });
          })()}
        </div>
      )}

      {/* Übung fertig → hier weiter: der Blick steht nach dem letzten
          Eintrag genau hier. */}
      {alleErledigt && (
        <Button size="lg" full onClick={onNext} className="mt-3 whitespace-nowrap">
          {nextExName ? (
            <>
              <span className="shrink-0">Nächste Übung</span>
              <span className="min-w-0 truncate font-normal">{nextExName}</span>
              <ChevronRight size={18} strokeWidth={2.5} className="shrink-0" aria-hidden />
            </>
          ) : (
            <>
              <Check size={18} strokeWidth={2.5} aria-hidden /> Zum Abschluss
            </>
          )}
        </Button>
      )}
    </section>
  );
}
