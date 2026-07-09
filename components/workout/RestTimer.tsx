"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { INTENSITY_OPTIONS, RIR_OPTIONS, Scale } from "@/components/workout/Scale";
import { Pressable } from "@/components/ui/pressable";
import { SPRING } from "@/lib/motion";

const R = 26;
const CIRC = 2 * Math.PI * R;

/** Bewertung des gerade beendeten Satzes — direkt in der Pause, dem
 *  natürlichen Moment dafür (statt vom Timer-Overlay verdeckt zu werden). */
export interface RestEffort {
  /** Zeit-Übung → Intensität (1–5), sonst RIR (0–4). */
  timed: boolean;
  name: string;
  setNo: number;
  rir?: number;
  intensity?: number;
  onRir: (v: number) => void;
  onIntensity: (v: number) => void;
}

/** Bottom rest-timer as a live instrument: a depleting countdown ring with the
 *  seconds inside, a breathing accent glow while it runs (faster in the last
 *  5 s) and a spring snap (scale pop + accent flash) when it hits 0 — the
 *  parent keeps the card mounted for a beat so the snap is visible. Reduced
 *  motion drops glow and snap; the ring jumps per second. */
export function RestTimer({
  left,
  total,
  onAdd,
  onSkip,
  effort,
}: {
  left: number;
  total: number;
  onAdd: () => void;
  onSkip: () => void;
  effort?: RestEffort;
}) {
  const reduce = useReducedMotion();
  const frac = Math.max(0, Math.min(1, left / (total || 1))); // remaining
  const urgent = left <= 5 && left > 0;
  const done = left <= 0;
  return (
    <motion.div
      className="fixed inset-x-0 bottom-0 z-40"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      initial={{ y: 90, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 90, opacity: 0 }}
      transition={{ type: "spring", stiffness: 380, damping: 34 }}
    >
      <div className="mx-auto m-3 max-w-md rounded-card border border-surface-3 bg-surface-1 shadow-card p-4 backdrop-blur">
        <div className="flex items-center gap-4">
          <motion.div
            className="relative shrink-0"
            style={{ width: 64, height: 64 }}
            animate={done && !reduce ? { scale: [1, 1.16, 1] } : { scale: 1 }}
            transition={SPRING.pop}
          >
            {!reduce && !done && (
              <motion.div
                aria-hidden
                className="absolute inset-1 rounded-full"
                style={{ boxShadow: "0 0 18px 2px var(--accent)" }}
                animate={{ opacity: urgent ? [0.55, 1, 0.55] : [0.2, 0.5, 0.2] }}
                transition={{ duration: urgent ? 0.6 : 1.8, repeat: Infinity, ease: "easeInOut" }}
              />
            )}
            {/* Accent flash the moment the pause snaps to done. */}
            <AnimatePresence>
              {done && !reduce && (
                <motion.div
                  aria-hidden
                  className="pointer-events-none absolute inset-0 rounded-full"
                  style={{ background: "radial-gradient(circle, var(--accent) 0%, transparent 70%)" }}
                  initial={{ opacity: 0.6, scale: 0.7 }}
                  animate={{ opacity: 0, scale: 1.5 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.55 }}
                />
              )}
            </AnimatePresence>
            <svg width={64} height={64} viewBox="0 0 64 64" className="relative -rotate-90">
              <circle cx="32" cy="32" r={R} fill="none" stroke="var(--surface-2)" strokeWidth="4" />
              <circle
                cx="32"
                cy="32"
                r={R}
                fill="none"
                stroke="var(--accent)"
                strokeWidth="4"
                strokeLinecap="round"
                strokeDasharray={CIRC}
                strokeDashoffset={CIRC * (1 - frac)}
                style={{
                  transition: reduce ? undefined : "stroke-dashoffset 1s linear",
                  filter: "drop-shadow(0 0 5px var(--accent))",
                }}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="font-display text-xl font-semibold tabular-nums text-fg">
                {Math.max(0, left)}
              </span>
            </div>
          </motion.div>
          <div className="min-w-0 flex-1">
            <p className="mb-2 font-mono text-xs uppercase tracking-widest text-accent-ink">
              {done ? "Pause vorbei" : "Satzpause"}
            </p>
            <div className="flex items-center gap-2">
              <Pressable
                onClick={onAdd}
                className="shrink-0 rounded-card bg-surface-2 px-3 py-2 text-sm text-fg focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-sessions"
              >
                +15 s
              </Pressable>
              <Pressable
                onClick={onSkip}
                className="flex-1 rounded-card bg-accent-sessions px-3 py-2 text-sm font-medium text-on-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-sessions"
              >
                Überspringen
              </Pressable>
            </div>
          </div>
        </div>
        {/* Wie schwer war der Satz? RIR/Intensität für den eben beendeten
            Satz — hier eintragbar, ohne zur Karte zurückzuscrollen. */}
        {effort && (
          <div className="mt-3 border-t border-line pt-2.5">
            <p className="font-mono text-xs uppercase tracking-widest text-muted">
              {effort.name} · Satz {effort.setNo} — wie schwer war das?
            </p>
            {effort.timed ? (
              <Scale
                label="Int"
                options={INTENSITY_OPTIONS}
                value={effort.intensity}
                onPick={effort.onIntensity}
              />
            ) : (
              <Scale
                label="RIR"
                options={RIR_OPTIONS}
                value={effort.rir}
                onPick={effort.onRir}
              />
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}
