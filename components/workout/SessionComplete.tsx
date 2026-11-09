"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";
import { PhasenFigur } from "@/components/phasen/PhasenFigur";
import { AtlasMark } from "@/components/trainer/AtlasMark";
import { Button } from "@/components/ui/Button";
import { useTraining, type SessionSummary } from "@/components/providers/TrainingProvider";
import { success } from "@/lib/haptics";
import { EASE_OUT } from "@/lib/motion";
import type { PhasenFigurDef } from "@/lib/phasen/figuren";
import type { RecordKind } from "@/lib/records";
import type { Region } from "@/lib/phasen/band";
import { renderShareCard } from "@/lib/share-card";
import { speak } from "@/lib/voice";

/** Die Rekord-Tafel des Sieger-Moments — der Runner rechnet sie VOR dem Save. */
export interface SiegerTafel {
  figur: PhasenFigurDef;
  exName: string;
  /** Rekord-Kennzahl: geschätztes 1RM (kg), Wiederholungen oder Sekunden. */
  wert: number;
  einheit: string;
  kind: RecordKind;
  /** Region der Übung — Farbe der Poster-Karte. */
  region: Region;
  /** Der gehobene Satz („25 kg × 12“) — steht groß, die Kennzahl darunter. */
  satz?: string;
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
  region,
  sieger,
  onDone,
}: {
  summary: SessionSummary;
  /** Studien-Name für das Poster („Ganzkörper A"). */
  name?: string;
  /** Phasenfigur der Hauptübung (Poster der Studie ohne Maximum). */
  figur?: PhasenFigurDef;
  /** Region der Hauptübung (Poster-Karte ohne Rekord). */
  region?: Region;
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
            region: sieger.region,
            exName: sieger.exName,
            wert: sieger.wert,
            einheit: sieger.einheit,
            rekordArt: sieger.kind,
            satz: sieger.satz,
            delta: sieger.delta,
            prevNr: sieger.prevPlattenNr,
            koerperKg,
          }
        : {
            kind: "studie",
            plattenNr,
            dateISO: new Date().toISOString(),
            figur,
            region,
            titel: name || "Einheit",
            kaderZahl: summary.sets,
            tonnage: summary.tonnage,
            dauerMin: summary.durationMin,
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
    if (sieger && settings.voiceCues) speak("Neuer Rekord. Stark.");
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
          style={{ backgroundColor: "var(--card)" }}
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
        className="my-auto flex w-full max-w-sm flex-col items-center py-8"
      >
        <motion.p
          initial={reduce ? false : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={stagger(0)}
          className="flex w-full items-baseline justify-between font-mono text-2xs font-bold"
        >
          <span className="text-fg">
            Einheit <span className="tabular-nums">{plattenNr}</span>
          </span>
          <span className={sieger ? "text-rekord" : "text-info"}>
            {sieger ? "Neuer Rekord" : "Gespeichert"}
          </span>
        </motion.p>

        {sieger ? (
          <>
            <motion.p
              initial={reduce ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={stagger(1)}
              className="mt-8 font-mono text-2xs font-bold text-rekord"
            >
              Persönlicher Rekord
            </motion.p>
            <motion.span
              initial={reduce ? false : { opacity: 0, scaleX: 0 }}
              animate={{ opacity: 1, scaleX: 1 }}
              transition={stagger(2)}
              aria-hidden
              className="mt-3 block h-px w-28 bg-rekord"
            />
            <motion.div
              initial={reduce ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={stagger(3)}
              className="mt-5 w-40 text-rekord"
            >
              <PhasenFigur figur={sieger.figur} mode="freeze" color="var(--rekord)" />
            </motion.div>
            <motion.h1
              initial={reduce ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={stagger(4)}
              className="mt-4 font-display font-bold text-3xl text-fg"
            >
              {sieger.exName}
            </motion.h1>
            <motion.p
              initial={reduce ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={stagger(5)}
              className={
                sieger.kind === "weight" && sieger.satz
                  ? "mt-2 font-display text-4xl font-extrabold leading-none tabular-nums text-rekord"
                  : "mt-2 font-display text-readout font-extrabold leading-none tabular-nums text-rekord"
              }
            >
              {sieger.kind === "weight" && sieger.satz
                ? sieger.satz
                : `${fmtDe(sieger.wert)} ${sieger.einheit}`}
            </motion.p>
            <motion.div
              initial={reduce ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={stagger(6)}
              className="mt-3 space-y-1 text-sm text-muted"
            >
              {/* Bei Gewichtsrekorden zählt die Schätzung (Epley) — sie steht
                  beschriftet unter dem echten Satz, nie als nackte Zahl. */}
              {sieger.kind === "weight" && sieger.satz && (
                <p>
                  Geschätztes 1RM{" "}
                  <span className="font-semibold tabular-nums text-fg">
                    {fmtDe(sieger.wert)} kg
                  </span>
                </p>
              )}
              <p className="tabular-nums">
                {sieger.delta != null && sieger.delta > 0
                  ? `+${fmtDe(sieger.delta)} ${sieger.einheit} über ${
                      sieger.prevPlattenNr != null
                        ? `Einheit ${sieger.prevPlattenNr}`
                        : "dem bisherigen Bestwert"
                    }`
                  : "Dein erster Wert hier"}
              </p>
            </motion.div>
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
              className="mt-4 font-display font-bold text-3xl text-fg"
            >
              {name || "Einheit"}
            </motion.h1>
          </>
        )}

        <motion.div
          initial={reduce ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={stagger(8)}
          className="mt-8 w-full"
        >
          <div className="mb-1.5 flex items-center justify-between font-mono text-3xs font-medium text-muted">
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
              className="h-full bg-accent"
              style={{
                width: `${Math.round(pct * 100)}%`,
                transition: reduce ? undefined : "width 1s cubic-bezier(0.22,1,0.36,1)",
              }}
            />
          </div>
          <p className="mt-2 font-mono text-3xs text-muted">
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
            className="mt-6 w-full rounded-card border-dick border-rand bg-surface-1 p-3.5 text-left"
          >
            <p className="mb-2 flex items-center gap-2 font-mono text-3xs font-bold text-muted">
              <AtlasMark size={14} className="text-fg" /> ATLAS
            </p>
            <div className="space-y-1.5">
              {summary.debrief.map((l, i) => (
                <p key={i} className="text-base leading-relaxed text-fg">
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
          {shareFile && (
            <Button variant="secondary" size="lg" onClick={share} className="w-32 flex-none">
              Teilen
            </Button>
          )}
          <Button size="lg" onClick={onDone} className="flex-1">
            Weiter
          </Button>
        </motion.div>
      </motion.div>
    </div>
  );
}
