"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Check, Minus, Plus, Trophy } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { INTENSITY_OPTIONS, RIR_OPTIONS, Scale } from "./Scale";
import { TimedSet } from "./TimedSet";
import { Button } from "@/components/ui/Button";
import { Pressable } from "@/components/ui/pressable";
import { dumbbellHint } from "@/lib/equipment";
import { tick } from "@/lib/haptics";
import { SPRING } from "@/lib/motion";
import type { SetEntry, Unit } from "@/lib/types";

/** Stepper-Taste des Instruments — 44-px-Ziel, ohne Tastatur bedienbar. */
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
      className="flex h-11 w-11 shrink-0 touch-manipulation items-center justify-center rounded-card bg-surface-2 text-fg focus:outline-none"
    >
      {dir === 1 ? <Plus size={18} strokeWidth={2.5} /> : <Minus size={18} strokeWidth={2.5} />}
    </Pressable>
  );
}

export type SetState = "done" | "active" | "upcoming";

const inputClass =
  "min-w-0 flex-1 rounded-pill bg-surface-2 py-3 text-center font-mono text-2xl tabular-nums text-fg placeholder:text-faint focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-sessions";

/** One logged set in three states — the focus-logbook: a done set is a compact
 *  ledger line (effort still editable), the active set is the big instrument
 *  with the suggestion ghosted in, an upcoming set is a quiet ghost line. */
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
  /** All-time best to beat ("60 × 8") — shown as a target on the active set. */
  recordLabel?: string;
  /** This logged set beats the all-time best → celebrate with a "Rekord" badge. */
  isRecord?: boolean;
  /** Suggested weight (autoregulation / carried from the last set) — ghosted in. */
  ghostWeight?: string;
  /** Target reps / hold — ghosted in. */
  ghostReps?: string;
  /** Schrittweite der Gewichts-Stepper (settings.weightStep, z. B. 1,25/2,5/5). */
  weightStep?: number;
  onWeight: (val: string) => void;
  onReps: (oldVal: string, val: string) => void;
  onRir: (val: number) => void;
  onIntensity: (val: number) => void;
  /** Focus this set (tap a collapsed line, or focus the active inputs). */
  onActivate: () => void;
  /** Commit-Release: Blur auf einem GEFÜLLTEN Satz löst den Fokus-Pin, damit
   *  der nächste leere Satz automatisch aktiv wird (Auto-Advance). */
  onDeactivate?: () => void;
}) {
  const reduce = useReducedMotion();
  const timed = unit === "Sek";

  // Eingaben sind LOKAL gepuffert und werden erst beim Verlassen des Felds
  // (Blur/Enter) in den Provider committet. Vorher löste jeder einzelne
  // Tastendruck einen App-weiten Re-Render samt Gewichts-Kaskade aus — das
  // war der „Ladebildschirm nach jedem Tastendruck".
  const [w, setW] = useState(set.weight);
  const [r, setR] = useState(set.reps);
  useEffect(() => setW(set.weight), [set.weight]);
  useEffect(() => setR(set.reps), [set.reps]);
  // Stepper-Ticks werden lokal gesammelt und erst nach kurzer Ruhe committet —
  // schnelles Durchsteppen erzeugt so EINEN Storage-Write statt vieler.
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
  // bestehenden Erst-Fill-Pfad aus (Pause, Feier, Coach) — 1 Berührung statt 5.
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

  // ── DONE — compact ledger line; effort stays editable. ──
  if (state === "done") {
    const summary = timed
      ? `${set.reps} s`
      : set.weight !== "" && set.weight != null
        ? `${set.weight} kg × ${set.reps}`
        : `${set.reps} Wdh`;
    return (
      <div>
        <Pressable
          onClick={onActivate}
          aria-label={`${label} bearbeiten`}
          className="flex w-full items-center gap-2 py-1.5 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-sessions"
        >
          <Check size={15} strokeWidth={2.5} className="shrink-0 text-accent-2" />
          <span className="w-12 shrink-0 font-mono text-xs text-faint">{label}</span>
          <span className="min-w-0 flex-1 truncate font-mono text-sm tabular-nums text-fg">{summary}</span>
          {isRecord && (
            <motion.span
              initial={reduce ? false : { scale: 0.7, opacity: 0 }}
              animate={reduce ? undefined : { scale: [0.7, 1.2, 1], opacity: 1 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="flex shrink-0 items-center gap-1 rounded-sm bg-accent-volume px-1.5 py-0.5 font-mono text-xs uppercase tracking-wider text-on-color"
            >
              <Trophy size={11} strokeWidth={2.5} /> Rekord
            </motion.span>
          )}
        </Pressable>
        {!isWarmup &&
          (timed ? (
            <Scale className="pl-12" label="Int" options={INTENSITY_OPTIONS} value={set.intensity} onPick={onIntensity} />
          ) : (
            <Scale className="pl-12" label="RIR" options={RIR_OPTIONS} value={set.rir} onPick={onRir} />
          ))}
      </div>
    );
  }

  // ── UPCOMING — quiet ghost line; tap to jump here. ──
  if (state === "upcoming") {
    const ghost = timed
      ? ghostReps
        ? `${ghostReps} s`
        : "—"
      : ghostWeight
        ? `${ghostWeight} × ${ghostReps ?? ""}`.trim()
        : (ghostReps ?? "—");
    return (
      <Pressable
        onClick={onActivate}
        aria-label={`${label} starten`}
        className="flex w-full items-center gap-2 py-1.5 text-left text-faint focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-sessions"
      >
        <span aria-hidden className="h-3.5 w-3.5 shrink-0 rounded-full border border-line" />
        <span className="w-12 shrink-0 font-mono text-xs">{label}</span>
        <span className="flex-1 truncate font-mono text-sm tabular-nums">{ghost}</span>
      </Pressable>
    );
  }

  // ── ACTIVE — the instrument. ──
  const dbHint = isDumbbell && !timed ? dumbbellHint(Number(w) || 0) : null;
  const oneTapReady = !timed && oneTapValues() != null && (set.reps === "" || set.reps == null);
  return (
    <motion.div
      className="set-active space-y-1.5 rounded-card p-2 ring-1 ring-accent-sessions"
      initial={reduce ? false : { opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={SPRING.panel}
    >
      {!isWarmup && isRecord ? (
        <motion.p
          initial={reduce ? false : { scale: 0.9, opacity: 0 }}
          animate={reduce ? undefined : { scale: [0.9, 1.08, 1], opacity: 1 }}
          transition={{ duration: 0.45, ease: "easeOut" }}
          className="flex items-center gap-1.5 font-mono text-xs font-semibold uppercase tracking-wider text-accent-volume"
        >
          <Trophy size={12} className="shrink-0" /> Neuer Rekord!
        </motion.p>
      ) : !isWarmup && recordLabel ? (
        <p className="flex items-center gap-1.5 font-mono text-xs text-accent-2">
          <Trophy size={12} className="shrink-0" /> Bestmarke {recordLabel} schlagen
        </p>
      ) : null}
      {timed ? (
        <div className="flex items-center gap-2">
          <span className="w-12 shrink-0 font-mono text-xs text-muted">{label}</span>
          <TimedSet value={set.reps} onChange={(val) => onReps(set.reps, val)} />
        </div>
      ) : (
        <>
          {/* Gewicht: ±Stepper in weightStep-Schritten — Tastatur nur bei
              direktem Tap ins Feld (Fokus selektiert den Inhalt komplett). */}
          <div className="flex items-center gap-2">
            <span className="w-12 shrink-0 font-mono text-xs text-muted">{label}</span>
            <StepBtn dir={-1} label={`Gewicht ${weightStep} kg weniger`} onStep={() => stepWeight(-1)} />
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
              placeholder={ghostWeight ?? "kg"}
              aria-label="Gewicht in kg"
              className={inputClass}
            />
            <StepBtn dir={1} label={`Gewicht ${weightStep} kg mehr`} onStep={() => stepWeight(1)} />
          </div>
          {/* Wiederholungen: ±1-Stepper, Basis ist die Zielvorgabe. */}
          <div className="flex items-center gap-2">
            <span aria-hidden className="w-12 shrink-0" />
            <StepBtn dir={-1} label="Eine Wiederholung weniger" onStep={() => stepReps(-1)} />
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
              placeholder={ghostReps ?? "Wdh"}
              aria-label="Wiederholungen"
              className={inputClass}
            />
            <StepBtn dir={1} label="Eine Wiederholung mehr" onStep={() => stepReps(1)} />
          </div>
        </>
      )}
      {dbHint && <p className="pl-12 font-mono text-xs text-muted">{dbHint}</p>}
      {oneTapReady && (
        <Button size="sm" full onClick={oneTap} className="min-h-11 touch-manipulation">
          <Check size={16} strokeWidth={2.5} />
          {(() => {
            const v = oneTapValues();
            if (!v) return null;
            return v.weight ? `Satz erledigt · ${v.weight} kg × ${v.reps}` : `Satz erledigt · ${v.reps} Wdh`;
          })()}
        </Button>
      )}
      {!isWarmup &&
        (timed ? (
          <Scale className="pl-12" label="Int" options={INTENSITY_OPTIONS} value={set.intensity} onPick={onIntensity} />
        ) : (
          <Scale className="pl-12" label="RIR" options={RIR_OPTIONS} value={set.rir} onPick={onRir} />
        ))}
    </motion.div>
  );
}
