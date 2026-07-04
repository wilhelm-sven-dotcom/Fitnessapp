"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";
import { AtlasMark } from "@/components/trainer/AtlasMark";
import { Burst } from "@/components/ui/Burst";
import { Pressable } from "@/components/ui/pressable";
import { Readout } from "@/components/ui/Readout";
import { useTraining, type SessionSummary } from "@/components/providers/TrainingProvider";
import { success } from "@/lib/haptics";
import { EASE_OUT } from "@/lib/motion";
import { speak } from "@/lib/voice";
import { cn } from "@/lib/utils";

// The stamp headline speaks each skin's voice (mirrors the Splash boots).
const HEADLINE: Record<string, string> = {
  tactile: "Stark gemacht!",
  blueprint: "EINHEIT ERFASST",
  editorial: "SCHICHT BEENDET",
};

/**
 * "Sieger-Moment" — the full-screen receipt after saving a workout. Replaces
 * the old silent teleport home: count-ups for what was achieved, the XP bar
 * filling live (with a level-up flip), a per-skin particle burst and a success
 * haptic. Reduced motion renders the final numbers as a static card.
 */
export function SessionComplete({
  summary,
  onDone,
}: {
  summary: SessionSummary;
  onDone: () => void;
}) {
  const { settings } = useTraining();
  const reduce = useReducedMotion();
  const skin = settings.skin as string;
  const levelUp = summary.levelAfter > summary.levelBefore;
  const [pct, setPct] = useState(reduce ? summary.xpPctTo : summary.xpPctFrom);
  const [lvl, setLvl] = useState(reduce || !levelUp ? summary.levelAfter : summary.levelBefore);

  useEffect(() => {
    success();
    // ATLAS spricht Zeile 1 des Debriefs (drei Zeilen wären TTS-zu-lang).
    if (settings.voiceCues) speak(summary.debrief[0] ?? "Training gespeichert. Stark!");
    if (reduce) {
      setPct(summary.xpPctTo);
      setLvl(summary.levelAfter);
      return;
    }
    const t1 = window.setTimeout(() => setPct(summary.xpPctTo), 900);
    const t2 = levelUp ? window.setTimeout(() => setLvl(summary.levelAfter), 1600) : undefined;
    return () => {
      window.clearTimeout(t1);
      if (t2) window.clearTimeout(t2);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stagger = (i: number) =>
    reduce ? undefined : { duration: 0.4, delay: 0.15 + i * 0.12, ease: EASE_OUT };

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden bg-surface-0 px-6 text-center">
      {!reduce && <Burst variant={skin as "tactile" | "blueprint" | "editorial"} />}

      <motion.p
        initial={reduce ? false : { opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={stagger(0)}
        className="mb-2 font-mono text-xs uppercase tracking-widest text-accent-2"
      >
        Training gespeichert
      </motion.p>
      <motion.h1
        initial={reduce ? false : { opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={stagger(1)}
        className={cn(
          "font-display font-semibold tracking-tight text-fg",
          skin === "editorial" ? "text-4xl uppercase" : "text-3xl",
          skin === "blueprint" && "uppercase tracking-widest",
        )}
      >
        {HEADLINE[skin] ?? HEADLINE.tactile}
      </motion.h1>
      {skin === "editorial" && (
        <motion.div
          initial={reduce ? false : { scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={stagger(2)}
          className="mt-2 h-px w-40 origin-center bg-line"
        />
      )}

      <motion.div
        initial={reduce ? false : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={stagger(3)}
        className="mt-8 flex items-start justify-center gap-8"
      >
        <Readout eyebrow="Sätze" value={summary.sets} size="md" />
        <Readout
          eyebrow="Bewegt"
          value={summary.tonnage / 1000}
          decimals={1}
          unit="t"
          size="md"
        />
        {summary.prs > 0 && (
          <Readout
            eyebrow={summary.prs === 1 ? "Rekord" : "Rekorde"}
            value={summary.prs}
            size="md"
            tone="var(--accent-ink)"
          />
        )}
      </motion.div>

      <motion.div
        initial={reduce ? false : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={stagger(4)}
        className="mt-8 w-full max-w-xs"
      >
        <div className="mb-1.5 flex items-center justify-between font-mono text-xs uppercase tracking-widest text-muted">
          <span className="flex items-center gap-1.5">
            Level
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.span
                key={lvl}
                initial={reduce ? false : { scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 1.3, opacity: 0 }}
                transition={{ type: "spring", stiffness: 400, damping: 22 }}
                className="tabular-nums text-accent-ink"
              >
                {lvl}
              </motion.span>
            </AnimatePresence>
          </span>
          {levelUp && lvl === summary.levelAfter && (
            <span className="font-semibold text-accent-ink">Level up!</span>
          )}
        </div>
        <div className="h-1.5 overflow-hidden rounded-pill bg-surface-2" aria-hidden>
          <div
            className="h-full rounded-pill bg-accent-sessions"
            style={{
              width: `${Math.round(pct * 100)}%`,
              transition: reduce ? undefined : "width 1s cubic-bezier(0.22,1,0.36,1)",
              boxShadow: "0 0 10px -1px var(--accent)",
            }}
          />
        </div>
        <p className="mt-2 text-xs text-muted">
          Diese Woche: {summary.weekSets}/{summary.weekTarget} Sätze
        </p>
      </motion.div>

      {/* Das Urteil des Trainers — wandert mit der Session ins Log (Tagebuch). */}
      {summary.debrief.length > 0 && (
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={stagger(5)}
          data-testid="session-debrief"
          className="mt-6 w-full max-w-xs rounded-card border border-line bg-surface-1 p-4 text-left shadow-card"
        >
          <p className="mb-2 flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-accent-2">
            <AtlasMark size={14} className="text-fg" /> ATLAS-Debrief
          </p>
          <div className="space-y-1.5">
            {summary.debrief.map((l, i) => (
              <p key={i} className="text-sm leading-relaxed text-fg">
                {l}
              </p>
            ))}
          </div>
        </motion.div>
      )}

      <motion.div
        initial={reduce ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={reduce ? undefined : { duration: 0.4, delay: 1.4 }}
        className="mt-10 w-full max-w-xs"
      >
        <Pressable
          onClick={onDone}
          className="w-full rounded-card bg-strong py-3.5 text-base font-semibold text-on-strong focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-sessions"
        >
          Weiter
        </Pressable>
      </motion.div>
    </div>
  );
}
