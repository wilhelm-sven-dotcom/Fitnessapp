"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Camera, Check, Trophy } from "lucide-react";
import { TimedSet } from "./TimedSet";
import { Pressable } from "@/components/ui/pressable";
import { dumbbellHint } from "@/lib/equipment";
import { SPRING } from "@/lib/motion";
import { cn } from "@/lib/utils";
import type { SetEntry, Unit } from "@/lib/types";

export type SetState = "done" | "active" | "upcoming";

const inputClass =
  "min-w-0 flex-1 rounded-pill bg-surface-2 py-3 text-center font-mono text-2xl tabular-nums text-fg placeholder:text-faint focus:outline-none focus:ring-2 focus:ring-accent-sessions";

const RIR_OPTIONS = [0, 1, 2, 3, 4];
const INTENSITY_OPTIONS = [1, 2, 3, 4, 5];

/** Slim effort selector — RIR (0–4) or felt intensity (1–5). Rated after the set. */
function Scale({
  label,
  options,
  value,
  onPick,
}: {
  label: string;
  options: number[];
  value: number | undefined;
  onPick: (v: number) => void;
}) {
  return (
    <div className="mt-1.5 flex items-center gap-2 pl-12">
      <span className="shrink-0 font-mono text-xs uppercase tracking-widest text-faint">{label}</span>
      <div className="flex flex-1 gap-1">
        {options.map((o) => (
          <Pressable
            key={o}
            onClick={() => onPick(o)}
            className={cn(
              "flex-1 rounded-pill py-1 text-xs font-medium tabular-nums focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-sessions",
              value === o ? "bg-accent-sessions text-on-accent" : "bg-surface-2 text-muted",
            )}
          >
            {o}
          </Pressable>
        ))}
      </div>
    </div>
  );
}

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
  onWeight,
  onReps,
  onRir,
  onIntensity,
  onActivate,
  onDeactivate,
  onCamera,
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
  onWeight: (val: string) => void;
  onReps: (oldVal: string, val: string) => void;
  onRir: (val: number) => void;
  onIntensity: (val: number) => void;
  /** Focus this set (tap a collapsed line, or focus the active inputs). */
  onActivate: () => void;
  /** Commit-Release: Blur auf einem GEFÜLLTEN Satz löst den Fokus-Pin, damit
   *  der nächste leere Satz automatisch aktiv wird (Auto-Advance). */
  onDeactivate?: () => void;
  /** Open the camera to auto-count reps for this set (rep-countable lifts only). */
  onCamera?: () => void;
}) {
  const reduce = useReducedMotion();
  const timed = unit === "Sek";

  // ── DONE — compact ledger line; effort stays editable. ──
  if (state === "done") {
    const summary = timed
      ? `${set.reps} s`
      : set.weight !== "" && set.weight != null
        ? `${set.weight} kg × ${set.reps}`
        : `${set.reps} Wdh`;
    return (
      <div className="set-row">
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
              style={{ boxShadow: "0 0 12px -2px #30d158" }}
              className="flex shrink-0 items-center gap-1 rounded bg-accent-volume px-1.5 py-0.5 font-mono text-xs uppercase tracking-wider text-on-strong"
            >
              <Trophy size={11} strokeWidth={2.5} /> Rekord
            </motion.span>
          )}
        </Pressable>
        {!isWarmup &&
          (timed ? (
            <Scale label="Int" options={INTENSITY_OPTIONS} value={set.intensity} onPick={onIntensity} />
          ) : (
            <Scale label="RIR" options={RIR_OPTIONS} value={set.rir} onPick={onRir} />
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
        className="set-row flex w-full items-center gap-2 py-1.5 text-left text-faint focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-sessions"
      >
        <span aria-hidden className="h-3.5 w-3.5 shrink-0 rounded-full border border-line" />
        <span className="w-12 shrink-0 font-mono text-xs">{label}</span>
        <span className="flex-1 truncate font-mono text-sm tabular-nums">{ghost}</span>
      </Pressable>
    );
  }

  // ── ACTIVE — the instrument. ──
  const dbHint = isDumbbell && !timed ? dumbbellHint(Number(set.weight) || 0) : null;
  const showGhostFill = !timed && !!ghostWeight && (set.weight === "" || set.weight == null);
  return (
    <motion.div
      className="set-row set-active space-y-1.5 rounded-card p-2 ring-1 ring-accent-sessions"
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
      <div className="flex items-center gap-2">
        <span className="w-12 shrink-0 font-mono text-xs text-muted">{label}</span>
        {timed ? (
          <TimedSet value={set.reps} onChange={(val) => onReps(set.reps, val)} />
        ) : (
          <>
            <input
              type="number"
              inputMode="decimal"
              step="0.5"
              value={set.weight}
              onFocus={onActivate}
              onBlur={() => {
                if (set.reps !== "" && set.reps != null) onDeactivate?.();
              }}
              onChange={(e) => onWeight(e.target.value)}
              placeholder={ghostWeight ?? "kg"}
              className={inputClass}
            />
            <input
              type="number"
              inputMode="numeric"
              value={set.reps}
              onFocus={onActivate}
              onBlur={() => {
                if (set.reps !== "" && set.reps != null) onDeactivate?.();
              }}
              onChange={(e) => onReps(set.reps, e.target.value)}
              placeholder={ghostReps ?? "Wdh"}
              className={inputClass}
            />
          </>
        )}
      </div>
      {dbHint && <p className="pl-12 font-mono text-xs text-muted">{dbHint}</p>}
      {(showGhostFill || (onCamera && !timed)) && (
        <div className="flex flex-wrap items-center gap-2 pl-12">
          {showGhostFill && (
            <Pressable
              onClick={() => onWeight(ghostWeight!)}
              className="inline-flex items-center gap-1 rounded-pill bg-surface-2 px-2.5 py-1 text-xs font-medium text-accent-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-sessions"
            >
              Vorschlag {ghostWeight} kg
            </Pressable>
          )}
          {onCamera && !timed && (
            <Pressable
              onClick={onCamera}
              className="inline-flex items-center gap-1 rounded-pill bg-surface-2 px-2.5 py-1 text-xs font-medium text-accent-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-sessions"
            >
              <Camera size={12} /> Mit Kamera
            </Pressable>
          )}
        </div>
      )}
      {!isWarmup &&
        (timed ? (
          <Scale label="Int" options={INTENSITY_OPTIONS} value={set.intensity} onPick={onIntensity} />
        ) : (
          <Scale label="RIR" options={RIR_OPTIONS} value={set.rir} onPick={onRir} />
        ))}
    </motion.div>
  );
}
