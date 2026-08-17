"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";
import { PhasenFigur } from "@/components/phasen/PhasenFigur";
import { AtlasMark } from "@/components/trainer/AtlasMark";
import { Button } from "@/components/ui/Button";
import { Readout } from "@/components/ui/Readout";
import { useTraining, type SessionSummary } from "@/components/providers/TrainingProvider";
import { success } from "@/lib/haptics";
import { EASE_OUT } from "@/lib/motion";
import type { PhasenFigurDef } from "@/lib/phasen/figuren";
import { renderShareCard } from "@/lib/share-card";
import { speak } from "@/lib/voice";

/** Die Rekord-Tafel des Sieger-Moments — der Runner rechnet sie VOR dem Save. */
export interface SiegerTafel {
  figur: PhasenFigurDef;
  exName: string;
  wert: number;
  einheit: string;
  delta?: number;
  prevPlattenNr?: number;
}

const fmtDe = (n: number) =>
  n.toLocaleString("de-DE", { maximumFractionDigits: 1 });

/**
 * Sieger-Moment (läuft im Atelier — der Theme-Lock des Fokus-Modus steht
 * noch): mit Maximum die TAFEL DES MAXIMUMS in Messing (Doppelblitz →
 * gestaffelte Zeilen — Motion-Handoff, die eine ~900-ms-Ausnahme), ohne
 * Maximum die nüchterne belichtete Platte. Count-ups/XP bleiben Bestand.
 */
export function SessionComplete({
  summary,
  name,
  figur,
  sieger,
  onDone,
}: {
  summary: SessionSummary;
  /** Studien-Name für das Poster („Ganzkörper A"). */
  name?: string;
  /** Phasenfigur der Hauptübung (Poster der Studie ohne Maximum). */
  figur?: PhasenFigurDef;
  /** Rekord-Tafel, wenn diese Platte ein Maximum enthält. */
  sieger?: SiegerTafel;
  onDone: () => void;
}) {
  const { settings, log, body } = useTraining();
  const reduce = useReducedMotion();
  const levelUp = summary.levelAfter > summary.levelBefore;
  const [pct, setPct] = useState(reduce ? summary.xpPctTo : summary.xpPctFrom);
  const [lvl, setLvl] = useState(reduce || !levelUp ? summary.levelAfter : summary.levelBefore);
  const plattenNr = log.length;
  const koerperKg = [...body].reverse().find((b) => b.weightKg != null)?.weightKg;

  // Share-Poster VORAB rendern: iOS verlangt navigator.share({files}) direkt
  // in der Klick-Geste — mit fertigem File klappt das ohne await-Umweg.
  const [shareFile, setShareFile] = useState<File | null>(null);
  useEffect(() => {
    let alive = true;
    renderShareCard(
      sieger
        ? {
            kind: "maximum",
            plattenNr,
            dateISO: new Date().toISOString(),
            figur: sieger.figur,
            exName: sieger.exName,
            wert: sieger.wert,
            einheit: sieger.einheit,
            koerperKg,
          }
        : {
            kind: "studie",
            plattenNr,
            dateISO: new Date().toISOString(),
            figur,
            titel: name || "Studie",
            kaderZahl: summary.sets,
            tonnage: summary.tonnage,
            koerperKg,
          },
    )
      .then((blob) => {
        if (!alive) return;
        const day = new Date().toISOString().slice(0, 10);
        setShareFile(new File([blob], `platte-${plattenNr}-${day}.png`, { type: "image/png" }));
      })
      .catch(() => {
        /* ohne Poster einfach kein Teilen-Knopf */
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
        /* Abbruch ist ok */
      }
      return;
    }
    const url = URL.createObjectURL(shareFile);
    const a = document.createElement("a");
    a.href = url;
    a.download = shareFile.name;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Sieger-Haptik + gesprochene Zeile + XP-Füllung (Bestand).
  useEffect(() => {
    success();
    if (sieger && settings.voiceCues) speak("Neues Maximum. Auf die Tafel damit.");
    const t1 = setTimeout(() => setPct(summary.xpPctTo), reduce ? 0 : 350);
    const t2 = levelUp
      ? setTimeout(() => setLvl(summary.levelAfter), reduce ? 0 : 1100)
      : undefined;
    return () => {
      clearTimeout(t1);
      if (t2) clearTimeout(t2);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stagger = (i: number) =>
    reduce ? undefined : { duration: 0.24, delay: 0.28 + i * 0.08, ease: EASE_OUT };

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center overflow-y-auto bg-surface-0 px-6 text-center"
      style={{
        paddingTop: "env(safe-area-inset-top)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      {/* Doppelblitz: 2 × 1 Kreide-Frame, ~80 ms Abstand (Motion-Handoff). */}
      {sieger && !reduce && (
        <motion.div
          aria-hidden
          className="pointer-events-none fixed inset-0"
          style={{ backgroundColor: "#f4f9fc" }}
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0.85, 0, 0, 0.85, 0] }}
          transition={{ duration: 0.26, times: [0, 0.06, 0.3, 0.55, 0.6, 0.85], ease: "linear" }}
        />
      )}

      <motion.div
        initial={reduce ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={reduce ? undefined : { duration: 0.01, delay: 0.26 }}
        // my-auto statt justify-center am Parent: bei überlaufendem Inhalt
        // bliebe der Anfang sonst unscrollbar abgeschnitten (Flexbox-Falle).
        className="my-auto flex w-full max-w-xs flex-col items-center py-8"
      >
        <motion.p
          initial={reduce ? false : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={stagger(0)}
          className="flex w-full items-baseline justify-between font-mono text-2xs font-semibold uppercase tracking-gesperrt"
        >
          <span className="text-fg">
            Studie Nr. <span className="tabular-nums">{plattenNr}</span>
          </span>
          <span className={sieger ? "text-messing" : "text-cyanotypie"}>
            {sieger ? "Neues Maximum" : "Platte belichtet"}
          </span>
        </motion.p>

        {sieger ? (
          <>
            <motion.p
              initial={reduce ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={stagger(1)}
              className="mt-8 font-mono text-2xs font-semibold uppercase tracking-gesperrt-4 text-messing"
            >
              Tafel des Maximums
            </motion.p>
            <motion.span
              initial={reduce ? false : { opacity: 0, scaleX: 0 }}
              animate={{ opacity: 1, scaleX: 1 }}
              transition={stagger(2)}
              aria-hidden
              className="mt-3 block h-px w-28 bg-messing"
            />
            <motion.div
              initial={reduce ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={stagger(3)}
              className="mt-5 w-40 text-messing"
            >
              <PhasenFigur figur={sieger.figur} mode="freeze" color="var(--messing)" raster />
            </motion.div>
            <motion.h1
              initial={reduce ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={stagger(4)}
              className="mt-4 font-display text-3xl italic text-fg"
            >
              {sieger.exName}
            </motion.h1>
            <motion.p
              initial={reduce ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={stagger(5)}
              className="mt-2 font-mono text-readout-lg font-bold leading-none tabular-nums text-messing"
            >
              {fmtDe(sieger.wert)}
              <span className="ml-1.5 align-middle text-sm font-medium tracking-widest">
                {sieger.einheit.toUpperCase()}
              </span>
            </motion.p>
            <motion.p
              initial={reduce ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={stagger(6)}
              className="mt-3 font-mono text-3xs font-medium uppercase tracking-gesperrt text-muted"
            >
              {sieger.delta != null && sieger.delta > 0
                ? `+${fmtDe(sieger.delta)} ${sieger.einheit} über ${
                    sieger.prevPlattenNr != null
                      ? `Platte Nr. ${sieger.prevPlattenNr}`
                      : "der bisherigen Tafel"
                  }`
                : "Erster Eintrag auf der Tafel"}
            </motion.p>
          </>
        ) : (
          <>
            {figur && (
              <motion.div
                initial={reduce ? false : { opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={stagger(1)}
                className="mt-8 w-24"
              >
                <PhasenFigur figur={figur} mode="freeze" color="var(--fg)" />
              </motion.div>
            )}
            <motion.h1
              initial={reduce ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={stagger(2)}
              className="mt-4 font-display text-3xl italic text-fg"
            >
              {name || "Studie"}
            </motion.h1>
          </>
        )}

        <motion.div
          initial={reduce ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={stagger(7)}
          className="mt-8 flex items-start justify-center gap-8"
        >
          <Readout eyebrow="Kader" value={summary.sets} size="md" />
          <Readout
            eyebrow="Bewegt"
            value={summary.tonnage / 1000}
            decimals={1}
            unit="t"
            size="md"
          />
          {summary.prs > 0 && (
            <Readout
              eyebrow={summary.prs === 1 ? "Maximum" : "Maxima"}
              value={summary.prs}
              size="md"
              tone="var(--messing)"
            />
          )}
        </motion.div>

        <motion.div
          initial={reduce ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={stagger(8)}
          className="mt-8 w-full"
        >
          <div className="mb-1.5 flex items-center justify-between font-mono text-3xs font-medium uppercase tracking-gesperrt text-muted">
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
          <div className="h-1.5 overflow-hidden rounded-xs bg-surface-2" aria-hidden>
            <div
              className="h-full bg-accent-sessions"
              style={{
                width: `${Math.round(pct * 100)}%`,
                transition: reduce ? undefined : "width 1s cubic-bezier(0.22,1,0.36,1)",
              }}
            />
          </div>
          <p className="mt-2 font-mono text-3xs uppercase tracking-gesperrt text-muted">
            Diese Woche: {summary.weekSets}/{summary.weekTarget} Sätze
          </p>
        </motion.div>

        {/* Das Protokoll des Studienleiters — wandert mit der Platte ins Archiv. */}
        {summary.debrief.length > 0 && (
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={stagger(9)}
            data-testid="session-debrief"
            className="mt-6 w-full rounded-card border border-line-card bg-surface-1 p-3.5 text-left"
          >
            <p className="mb-2 flex items-center gap-2 font-mono text-3xs font-semibold uppercase tracking-gesperrt text-muted">
              <AtlasMark size={14} className="text-fg" /> ATLAS · Protokoll
            </p>
            <div className="space-y-1.5">
              {summary.debrief.map((l, i) => (
                <p key={i} className="font-display text-base leading-relaxed text-fg">
                  {l}
                </p>
              ))}
            </div>
          </motion.div>
        )}

        <motion.div
          initial={reduce ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={reduce ? undefined : { duration: 0.24, delay: 1.1 }}
          className="mb-4 mt-10 flex w-full items-stretch gap-2.5"
        >
          <Button
            variant="secondary"
            size="lg"
            onClick={onDone}
            className={shareFile ? "w-28 flex-none" : "flex-1"}
          >
            Weiter
          </Button>
          {shareFile && (
            <Button
              size="lg"
              onClick={share}
              className="flex-1 whitespace-nowrap tracking-gesperrt"
            >
              Als Platte teilen
            </Button>
          )}
        </motion.div>
      </motion.div>
    </div>
  );
}
