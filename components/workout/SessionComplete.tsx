"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Share2 } from "lucide-react";
import { useEffect, useState } from "react";
import { AtlasMark } from "@/components/trainer/AtlasMark";
import { Burst } from "@/components/ui/Burst";
import { Button } from "@/components/ui/Button";
import { Pressable } from "@/components/ui/pressable";
import { Readout } from "@/components/ui/Readout";
import { useTraining, type SessionSummary } from "@/components/providers/TrainingProvider";
import { success } from "@/lib/haptics";
import { EASE_OUT } from "@/lib/motion";
import { renderShareCard } from "@/lib/share-card";
import { speak } from "@/lib/voice";

/**
 * "Sieger-Moment" — the full-screen receipt after saving a workout. Replaces
 * the old silent teleport home: count-ups for what was achieved, the XP bar
 * filling live (with a level-up flip), a particle burst and a success haptic.
 * Reduced motion renders the final numbers as a static card.
 */
export function SessionComplete({
  summary,
  name,
  onDone,
}: {
  summary: SessionSummary;
  /** Session-Name für die Share-Card („Ganzkörper A"). */
  name?: string;
  onDone: () => void;
}) {
  // muscleVolumes ist hier frisch: der Sieger-Moment mountet NACH dem Save,
  // der Provider hat die eben gespeicherte Einheit bereits eingerechnet.
  const { settings, muscleVolumes } = useTraining();
  const reduce = useReducedMotion();
  const levelUp = summary.levelAfter > summary.levelBefore;
  const [pct, setPct] = useState(reduce ? summary.xpPctTo : summary.xpPctFrom);
  const [lvl, setLvl] = useState(reduce || !levelUp ? summary.levelAfter : summary.levelBefore);

  // Share-Card VORAB rendern: iOS verlangt navigator.share({files}) direkt in
  // der Klick-Geste — mit fertigem File klappt das ohne await-Umweg.
  const [shareFile, setShareFile] = useState<File | null>(null);
  useEffect(() => {
    let alive = true;
    renderShareCard({
      name: name || "Training",
      dateISO: new Date().toISOString(),
      sets: summary.sets,
      tonnage: summary.tonnage,
      prs: summary.prs,
      weekSets: summary.weekSets,
      weekTarget: summary.weekTarget,
      muscleVolumes,
    })
      .then((blob) => {
        if (!alive) return;
        const day = new Date().toISOString().slice(0, 10);
        setShareFile(new File([blob], `training-${day}.png`, { type: "image/png" }));
      })
      .catch(() => {
        /* ohne Card einfach kein Teilen-Knopf */
      });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const share = async () => {
    if (!shareFile) return;
    if (navigator.canShare?.({ files: [shareFile] }) && navigator.share) {
      try {
        await navigator.share({ files: [shareFile] });
      } catch {
        /* Abbruch im Share-Sheet ist kein Fehler */
      }
    } else {
      const url = URL.createObjectURL(shareFile);
      const a = document.createElement("a");
      a.href = url;
      a.download = shareFile.name;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

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
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden bg-surface-0 px-6 text-center"
      style={{
        paddingTop: "env(safe-area-inset-top)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      {!reduce && <Burst />}

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
        className="font-display text-3xl font-semibold tracking-tight text-fg"
      >
        Stark gemacht!
      </motion.h1>

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
        className="mt-10 flex w-full max-w-xs items-stretch gap-2"
      >
        {shareFile && (
          <Button
            variant="secondary"
            onClick={share}
            className="flex-1 rounded-card py-3.5 text-base font-semibold"
          >
            <Share2 size={17} strokeWidth={2.5} /> Teilen
          </Button>
        )}
        <Pressable
          onClick={onDone}
          className="flex-1 rounded-card bg-strong py-3.5 text-base font-semibold text-on-strong focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-sessions"
        >
          Weiter
        </Pressable>
      </motion.div>
    </div>
  );
}
