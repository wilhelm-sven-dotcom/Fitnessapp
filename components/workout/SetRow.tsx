"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Check, Minus, Plus, Trophy } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { INTENSITY_OPTIONS, RIR_OPTIONS, Scale } from "./Scale";
import { TimedSet } from "./TimedSet";
import { useDockSlot } from "@/components/session/DockSlot";
import { Button } from "@/components/ui/Button";
import { Sticker } from "@/components/ui/Sticker";
import { Pressable } from "@/components/ui/pressable";
import { dumbbellHint } from "@/lib/equipment";
import { fmtGewicht, fmtSatz } from "@/lib/format";
import { tick } from "@/lib/haptics";
import { SPRING } from "@/lib/motion";
import { cn } from "@/lib/utils";
import type { SetEntry, Unit } from "@/lib/types";

/** Stepper-Taste „spotter“: rund, 44 px, Tinte-Rand; Minus weiß, Plus Sonne. */
function StepBtn({
  dir,
  label,
  onStep,
}: {
  dir: 1 | -1;
  label: string;
  onStep: () => void;
}) {
  return (
    <Pressable
      onClick={onStep}
      aria-label={label}
      className={cn(
        "flex h-11 w-11 touch-manipulation items-center justify-center rounded-pill border-dick border-rand focus:outline-none focus-visible:ring-2 focus-visible:ring-fokus",
        dir === 1 ? "bg-sonne text-sonne-auf" : "bg-surface-1 text-fg",
      )}
    >
      {dir === 1 ? <Plus size={20} strokeWidth={2.5} /> : <Minus size={20} strokeWidth={2.5} />}
    </Pressable>
  );
}

export type SetState = "done" | "active" | "upcoming";

const inputClass =
  "mt-0.5 w-full min-w-0 rounded-inner bg-transparent text-center font-display text-5xl font-extrabold leading-tight tabular-nums text-fg placeholder:text-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-fokus";

/** Ein Satz in drei Zuständen: eingetragen (Pille mit blauem Haken,
 *  Antippen = korrigieren), offen (die Satzkarte mit großen Zahlen und runden
 *  Tasten, oben der Sticker „Satz 2“), kommend (gestrichelte Pille).
 *
 *  „Wie schwer war's?“ fragt EINMAL: im Pausenfeld direkt nach dem Satz. Hier
 *  erscheint die Skala nur, wenn ein schon eingetragener Satz korrigiert wird.
 *  „Satz eintragen“ wandert per Portal ins Dock des Trainings. */
export function SetRow({
  label,
  isWarmup,
  unit,
  set,
  isDumbbell,
  state,
  ghostWeight,
  ghostReps,
  weightStep = 2.5,
  zielLabel,
  lastLabel,
  vorschlag,
  onWeight,
  onReps,
  onRir,
  onIntensity,
  onActivate,
  onDeactivate,
  recordLabel,
  isRecord,
}: {
  label: string;
  isWarmup: boolean;
  unit: Unit;
  set: SetEntry;
  isDumbbell?: boolean;
  state: SetState;
  /** Bisheriger Bestwert („20 kg × 8“) — Rekord-Zeile in der offenen Karte. */
  recordLabel?: string;
  /** Dieser Satz schlägt den Bestwert → „Rekord“. */
  isRecord?: boolean;
  /** Vorgeschlagenes Gewicht (Tagesform / zuletzt bewegt) — als Platzhalter. */
  ghostWeight?: string;
  /** Ziel-Wiederholungen / Haltezeit — als Platzhalter. */
  ghostReps?: string;
  /** Schrittweite der Gewichts-Stepper (settings.weightStep, z. B. 1,25/2,5/5). */
  weightStep?: number;
  /** Plan-Bereich rechts oben in der Karte: „Ziel 10–15 Wdh“. */
  zielLabel?: string;
  /** „20 kg × 12 · RIR 2“ — bester Satz vom letzten Mal. */
  lastLabel?: string | null;
  /** Vorschlag mit Grund („Vorschlag 22,5 kg × 9 · mehr als letztes Mal“). */
  vorschlag?: string;
  onWeight: (val: string) => void;
  onReps: (oldVal: string, val: string) => void;
  onRir: (val: number) => void;
  onIntensity: (val: number) => void;
  /** Diesen Satz öffnen (Zeile antippen oder Feld fokussieren). */
  onActivate: () => void;
  /** Blur auf einem EINGETRAGENEN Satz löst den Fokus-Pin, damit der nächste
   *  offene Satz automatisch aktiv wird. */
  onDeactivate?: () => void;
}) {
  const reduce = useReducedMotion();
  const slot = useDockSlot();
  const timed = unit === "Sek";

  // Eingaben sind LOKAL gepuffert und werden erst beim Verlassen des Felds
  // (Blur/Enter) in den Provider committet — sonst löste jeder Tastendruck
  // einen App-weiten Re-Render samt Gewichts-Kaskade aus.
  const [w, setW] = useState(set.weight);
  const [r, setR] = useState(set.reps);
  useEffect(() => setW(set.weight), [set.weight]);
  useEffect(() => setR(set.reps), [set.reps]);
  // Stepper-Ticks sammeln und erst nach kurzer Ruhe committen — schnelles
  // Durchsteppen erzeugt so EINEN Storage-Write statt vieler.
  const commitTimerW = useRef<number | undefined>(undefined);
  const commitTimerR = useRef<number | undefined>(undefined);
  useEffect(
    () => () => {
      window.clearTimeout(commitTimerW.current);
      window.clearTimeout(commitTimerR.current);
    },
    [],
  );
  const commitWeight = () => {
    window.clearTimeout(commitTimerW.current);
    if (w !== set.weight) onWeight(w);
  };
  const commitReps = () => {
    window.clearTimeout(commitTimerR.current);
    if (r !== set.reps) onReps(set.reps, r);
  };
  const blurOnEnter = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") e.currentTarget.blur();
  };

  const num = (s: string | undefined | null) => {
    const n = parseFloat(String(s ?? "").replace(",", "."));
    return Number.isFinite(n) ? n : null;
  };
  const stepWeight = (dir: 1 | -1) => {
    const base = num(w) ?? num(ghostWeight) ?? 0;
    const next = String(Math.max(0, Math.round((base + dir * weightStep) * 100) / 100));
    setW(next);
    tick();
    window.clearTimeout(commitTimerW.current);
    commitTimerW.current = window.setTimeout(() => {
      if (next !== set.weight) onWeight(next);
    }, 350);
  };
  const stepReps = (dir: 1 | -1) => {
    const base = Math.round(num(r) ?? num(ghostReps) ?? 0);
    const next = String(Math.max(0, base + dir));
    setR(next);
    tick();
    window.clearTimeout(commitTimerR.current);
    commitTimerR.current = window.setTimeout(() => {
      if (next !== set.reps) onReps(set.reps, next);
    }, 350);
  };
  // Ein-Tap-Commit: übernimmt Vorschlag (bzw. bereits Getipptes) und löst den
  // bestehenden Erst-Eintrag aus (Pause, Feier, ATLAS) — 1 Berührung statt 5.
  const oneTapValues = (): { weight: string; reps: string } | null => {
    const reps = r !== "" && r != null ? r : (ghostReps ?? "");
    if (reps === "") return null;
    return { weight: w !== "" && w != null ? w : (ghostWeight ?? ""), reps };
  };
  const oneTap = () => {
    const v = oneTapValues();
    if (!v) return;
    window.clearTimeout(commitTimerW.current);
    window.clearTimeout(commitTimerR.current);
    if (v.weight !== set.weight) onWeight(v.weight);
    setW(v.weight);
    setR(v.reps);
    onReps(set.reps, v.reps);
  };

  const zeile =
    "flex min-h-12 w-full items-center gap-3 rounded-pill border-dick px-3 py-2 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-fokus";

  // ── Eingetragen: Pille mit blauem Haken. ──
  if (state === "done") {
    const summary = fmtSatz(set.weight, set.reps, timed);
    const anstrengung = isWarmup
      ? null
      : timed
        ? set.intensity != null
          ? `Int ${set.intensity}`
          : null
        : set.rir != null
          ? `RIR ${set.rir}`
          : null;
    return (
      <Pressable
        onClick={onActivate}
        aria-label={`${label} bearbeiten`}
        className={cn(zeile, "border-rand bg-surface-1")}
      >
        <span
          aria-hidden
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-pill bg-accent text-on-accent"
        >
          <Check size={14} strokeWidth={3} />
        </span>
        <span className="shrink-0 text-sm text-muted">{label}</span>
        <span className="min-w-0 flex-1 truncate text-right text-base font-semibold tabular-nums text-fg">
          {summary}
          {anstrengung && <span className="font-normal text-muted"> · {anstrengung}</span>}
        </span>
        {isRecord && (
          <motion.span
            initial={reduce ? false : { scale: 0.7, opacity: 0 }}
            animate={reduce ? undefined : { scale: [0.7, 1.15, 1], opacity: 1 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="flex shrink-0 items-center gap-1 rounded-kachel border-dick border-rand bg-rekord-flaeche px-2 py-0.5 font-display text-3xs font-extrabold text-rekord-auf"
          >
            <Trophy size={12} strokeWidth={2.5} aria-hidden /> Rekord
          </motion.span>
        )}
      </Pressable>
    );
  }

  // ── Kommend: Zeile mit leerem Kreis; Antippen öffnet den Satz. ──
  if (state === "upcoming") {
    const ghost =
      fmtSatz(set.weight || ghostWeight, ghostReps, timed) || (ghostReps ?? "–");
    return (
      <Pressable
        onClick={onActivate}
        aria-label={`${label} starten`}
        className={cn(zeile, "border-dashed border-rand bg-transparent")}
      >
        <span aria-hidden className="h-6 w-6 shrink-0 rounded-pill border-2 border-rand" />
        <span className="shrink-0 text-sm text-muted">{label}</span>
        <span className="min-w-0 flex-1 truncate text-right text-base font-semibold tabular-nums text-muted">
          {ghost}
        </span>
      </Pressable>
    );
  }

  // ── Offen: die Satzkarte. ──
  const dbHint = isDumbbell && !timed ? dumbbellHint(Number(w) || 0) : null;
  const oneTapReady = !timed && oneTapValues() != null && (set.reps === "" || set.reps == null);
  const v = oneTapValues();
  const knopf =
    oneTapReady && v ? (
      <Button
        data-testid="satz-protokollieren"
        size="lg"
        full
        onClick={oneTap}
        className="touch-manipulation whitespace-nowrap text-lg"
      >
        <Check size={20} strokeWidth={2.5} className="shrink-0" aria-hidden />
        {/* Wird es eng, kürzt sich das Wort, nie die Werte. */}
        <span className="min-w-0 truncate">Satz eintragen</span>
        <span className="shrink-0 tabular-nums">· {fmtSatz(v.weight, v.reps, false)}</span>
      </Button>
    ) : null;

  return (
    <motion.div
      data-testid="satz-aktiv"
      className="set-active relative mt-5 space-y-3 rounded-card p-4 pt-5"
      initial={reduce ? false : { opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={SPRING.panel}
    >
      <Sticker
        ton={isWarmup ? "sonne" : "orange"}
        drehung={-3}
        className="absolute -top-3.5 left-3.5"
      >
        {label}
      </Sticker>
      {zielLabel && !isWarmup && (
        <p className="text-right text-sm font-semibold tabular-nums text-muted">{zielLabel}</p>
      )}
      {isRecord && !isWarmup && (
        <motion.p
          initial={reduce ? false : { scale: 0.9, opacity: 0 }}
          animate={reduce ? undefined : { scale: [0.9, 1.06, 1], opacity: 1 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="flex items-center gap-1.5 text-sm font-semibold text-rekord"
        >
          <Trophy size={14} className="shrink-0" aria-hidden /> Neuer Rekord
        </motion.p>
      )}
      {timed ? (
        <TimedSet value={set.reps} onChange={(val) => onReps(set.reps, val)} />
      ) : (
        <div className="grid grid-cols-2 gap-2.5">
          {/* Gewicht: ± in weightStep-Schritten — Tastatur nur bei direktem
              Tipp ins Feld (Fokus markiert den Inhalt komplett). */}
          <div className="rounded-inner p-1">
            <p className="text-center text-sm font-bold text-muted">
              Gewicht kg
            </p>
            <input
              type="number"
              inputMode="decimal"
              step={String(weightStep)}
              value={w}
              onFocus={(e) => {
                onActivate();
                e.currentTarget.select();
              }}
              onBlur={() => {
                commitWeight();
                if (r !== "" && r != null) onDeactivate?.();
              }}
              onKeyDown={blurOnEnter}
              onChange={(e) => setW(e.target.value)}
              placeholder={ghostWeight ?? "–"}
              aria-label="Gewicht in kg"
              className={inputClass}
            />
            <div className="mt-2 flex justify-center gap-2.5">
              <StepBtn dir={-1} label={`Gewicht ${fmtGewicht(weightStep)} kg weniger`} onStep={() => stepWeight(-1)} />
              <StepBtn dir={1} label={`Gewicht ${fmtGewicht(weightStep)} kg mehr`} onStep={() => stepWeight(1)} />
            </div>
          </div>
          {/* Wiederholungen: ±1, Basis ist der Vorschlag. */}
          <div className="rounded-inner p-1">
            <p className="text-center text-sm font-bold text-muted">
              Wiederholungen
            </p>
            <input
              type="number"
              inputMode="numeric"
              value={r}
              onFocus={(e) => {
                onActivate();
                e.currentTarget.select();
              }}
              onBlur={() => {
                commitReps();
                if (r !== "" && r != null) onDeactivate?.();
              }}
              onKeyDown={blurOnEnter}
              onChange={(e) => setR(e.target.value)}
              placeholder={ghostReps ?? "–"}
              aria-label="Wiederholungen"
              className={inputClass}
            />
            <div className="mt-2 flex justify-center gap-2.5">
              <StepBtn dir={-1} label="Eine Wiederholung weniger" onStep={() => stepReps(-1)} />
              <StepBtn dir={1} label="Eine Wiederholung mehr" onStep={() => stepReps(1)} />
            </div>
          </div>
        </div>
      )}
      {/* Bezug: Letztes Mal · Rekord. */}
      {!isWarmup && (lastLabel || recordLabel) && (
        <div className="flex flex-wrap justify-between gap-x-3 gap-y-1 text-sm">
          <span className="text-muted">
            {lastLabel ? (
              <>
                Letztes Mal{" "}
                <span className="font-semibold tabular-nums text-fg">{lastLabel}</span>
              </>
            ) : (
              "Erstes Mal"
            )}
          </span>
          {recordLabel && !isRecord && (
            <span className="text-rekord">
              Rekord <span className="font-semibold tabular-nums">{recordLabel}</span>
            </span>
          )}
        </div>
      )}
      {vorschlag && !isWarmup && (
        <p className="text-sm leading-snug text-muted">{vorschlag}</p>
      )}
      {dbHint && <p className="text-sm text-muted">{dbHint}</p>}
      {/* Satz-Knopf: im Dock, solange der Trainings-Wirt eins anbietet. */}
      {slot === undefined
        ? knopf
        : slot && knopf
          ? createPortal(<div className="mx-auto max-w-md">{knopf}</div>, slot)
          : null}
      {/* Skala nur beim KORRIGIEREN eines eingetragenen Satzes — frische
          Sätze bewertet das Pausenfeld (eine Frage, eine Stelle). */}
      {!isWarmup &&
        set.reps !== "" &&
        set.reps != null &&
        (timed ? (
          <Scale label="Int" options={INTENSITY_OPTIONS} value={set.intensity} onPick={onIntensity} />
        ) : (
          <Scale label="RIR" options={RIR_OPTIONS} value={set.rir} onPick={onRir} />
        ))}
    </motion.div>
  );
}
