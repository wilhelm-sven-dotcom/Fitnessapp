"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Check, Minus, Plus, Trophy } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { INTENSITY_OPTIONS, RIR_OPTIONS, Scale } from "./Scale";
import { TimedSet } from "./TimedSet";
import { useDockSlot } from "@/components/session/DockSlot";
import { Button } from "@/components/ui/Button";
import { Pressable } from "@/components/ui/pressable";
import { dumbbellHint } from "@/lib/equipment";
import { fmtSatz } from "@/lib/format";
import { tick } from "@/lib/haptics";
import { SPRING } from "@/lib/motion";
import { REGION_AUF, REGION_FLAECHE, REGION_VAR, type Region } from "@/lib/phasen/band";
import type { SetEntry, Unit } from "@/lib/types";

/** Stepper-Taste in der Kachel — 44 px hoch, weiße Fläche auf der Spur. */
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
      className="flex h-11 touch-manipulation items-center justify-center rounded-inner bg-surface-1 text-fg focus:outline-none focus-visible:ring-2 focus-visible:ring-fokus"
    >
      {dir === 1 ? <Plus size={20} strokeWidth={2.5} /> : <Minus size={20} strokeWidth={2.5} />}
    </Pressable>
  );
}

export type SetState = "done" | "active" | "upcoming";

const inputClass =
  "mt-0.5 w-full min-w-0 rounded-inner bg-transparent text-center font-display text-4xl font-extrabold leading-tight tabular-nums text-fg placeholder:text-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-fokus";

/** Ein Satz in drei Zuständen: eingetragen (Zeile mit gefülltem Kreis in der
 *  Regionsfarbe, Antippen = korrigieren), offen (die Satzkarte mit Kacheln
 *  für Gewicht und Wiederholungen), kommend (Zeile mit leerem Kreis).
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
  region,
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
  /** Körperregion der Übung — färbt Kreis, Satz-Marke und Kartenrand. */
  region: Region;
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
  const mark = REGION_VAR[region];
  const flaeche = REGION_FLAECHE[region];
  const auf = REGION_AUF[region];

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
    "flex min-h-12 w-full items-center gap-3 rounded-inner bg-surface-1 px-3 py-2 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-fokus";

  // ── Eingetragen: Zeile mit gefülltem Kreis in der Regionsfarbe. ──
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
      <Pressable onClick={onActivate} aria-label={`${label} bearbeiten`} className={zeile}>
        <span
          aria-hidden
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-pill"
          style={{ backgroundColor: flaeche, color: auf }}
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
            className="flex shrink-0 items-center gap-1 rounded-pill border border-rekord px-2 py-0.5 text-3xs font-semibold text-rekord"
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
      <Pressable onClick={onActivate} aria-label={`${label} starten`} className={zeile}>
        <span aria-hidden className="h-6 w-6 shrink-0 rounded-pill border-2 border-line" />
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
        className="touch-manipulation whitespace-nowrap"
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
      className="set-active space-y-3 rounded-card p-4"
      style={{ boxShadow: `inset 0 0 0 2px ${mark}` }}
      initial={reduce ? false : { opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={SPRING.panel}
    >
      <div className="flex items-center justify-between gap-2">
        <span
          className="rounded-pill px-3 py-1 text-sm font-bold"
          style={{ backgroundColor: flaeche, color: auf }}
        >
          {label}
        </span>
        {zielLabel && !isWarmup && (
          <span className="text-sm tabular-nums text-muted">{zielLabel}</span>
        )}
      </div>
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
          <div className="rounded-inner bg-surface-2 p-2.5">
            <p className="text-center text-3xs font-semibold uppercase tracking-label text-muted">
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
            <div className="mt-2 grid grid-cols-2 gap-2">
              <StepBtn dir={-1} label={`Gewicht ${weightStep} kg weniger`} onStep={() => stepWeight(-1)} />
              <StepBtn dir={1} label={`Gewicht ${weightStep} kg mehr`} onStep={() => stepWeight(1)} />
            </div>
          </div>
          {/* Wiederholungen: ±1, Basis ist der Vorschlag. */}
          <div className="rounded-inner bg-surface-2 p-2.5">
            <p className="text-center text-3xs font-semibold uppercase tracking-label text-muted">
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
            <div className="mt-2 grid grid-cols-2 gap-2">
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
