"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";
import { PhasenFigur } from "@/components/phasen/PhasenFigur";
import { AtlasMark } from "@/components/trainer/AtlasMark";
import { Button } from "@/components/ui/Button";
import { Sprechblase } from "@/components/ui/Sprechblase";
import { Sticker } from "@/components/ui/Sticker";
import { useTraining, type SessionSummary } from "@/components/providers/TrainingProvider";
import { success } from "@/lib/haptics";
import { EASE_OUT } from "@/lib/motion";
import type { PhasenFigurDef } from "@/lib/phasen/figuren";
import type { RecordKind } from "@/lib/records";
import type { Region } from "@/lib/phasen/band";
import { renderShareCard } from "@/lib/share-card";
import { speak } from "@/lib/voice";
import { APP_SLUG } from "@/lib/marke";
import { cn } from "@/lib/utils";

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
        setShareFile(new File([blob], `${APP_SLUG}-${plattenNr}-${day}.png`, { type: "image/png" }));
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
    if (sieger && settings.voiceCues) speak("Einheit gespeichert. Mit neuem Rekord.");
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

  // Auf der orangen Rekord-Fläche trägt alles die Schrift der Fläche (Tinte);
  // Blau und Grautöne hätten dort zu wenig Kontrast.
  const tonFg = sieger ? "text-rekord-auf" : "text-fg";
  const tonMuted = sieger ? "text-rekord-auf" : "text-muted";

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 flex flex-col items-center overflow-y-auto px-6 text-center",
        sieger ? "bg-rekord-flaeche text-rekord-auf" : "bg-surface-0",
      )}
      style={{
        paddingTop: "env(safe-area-inset-top)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      <motion.div
        initial={reduce ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={reduce ? undefined : { duration: 0.01, delay: 0.1 }}
        // my-auto statt justify-center am Parent: bei überlaufendem Inhalt
        // bliebe der Anfang sonst unscrollbar abgeschnitten (Flexbox-Falle).
        className="my-auto flex w-full max-w-sm flex-col items-center py-8"
      >
        <motion.p
          initial={reduce ? false : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={stagger(0)}
          className={cn("flex w-full items-baseline justify-between text-sm font-bold", tonFg)}
        >
          <span>
            Einheit <span className="tabular-nums">{plattenNr}</span>
          </span>
          <span className={sieger ? undefined : "text-info"}>
            {sieger ? "Neuer Rekord" : "Gespeichert"}
          </span>
        </motion.p>

        {sieger ? (
          <>
            {/* Der EINE gefeierte Moment: die PR-Karte springt auf. */}
            <div className="relative mt-8 w-full">
              <motion.div
                initial={reduce ? false : { opacity: 0, scale: 0.4, rotate: -20 }}
                animate={{ opacity: 1, scale: 1, rotate: -6 }}
                transition={
                  reduce
                    ? undefined
                    : { type: "spring", stiffness: 380, damping: 14, delay: 0.15 }
                }
                className="mx-auto flex w-60 items-center gap-2 rounded-card border-dick border-rand bg-surface-1 px-4 py-4 text-left shadow-hart"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-display text-7xl font-extrabold leading-none text-accent-ink">
                    PR!
                  </p>
                  <p className="mt-1.5 text-sm font-bold leading-snug text-fg">{sieger.exName}</p>
                </div>
                <div aria-hidden className="w-16 shrink-0">
                  <PhasenFigur figur={sieger.figur} mode="freeze" color="var(--fg)" />
                </div>
              </motion.div>
              {sieger.delta != null && sieger.delta > 0 && (
                <Sticker drehung={-10} className="absolute -top-4 left-2 text-base">
                  +{fmtDe(sieger.delta)} {sieger.einheit}
                </Sticker>
              )}
            </div>

            <motion.p
              initial={reduce ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={stagger(4)}
              className="mt-10 font-display text-5xl font-extrabold leading-none tabular-nums"
            >
              {sieger.kind === "weight" && sieger.satz
                ? sieger.satz
                : `${fmtDe(sieger.wert)} ${sieger.einheit}`}
            </motion.p>
            <motion.div
              initial={reduce ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={stagger(5)}
              className="mt-3 space-y-1 text-base font-semibold"
            >
              {/* Bei Gewichtsrekorden zählt die Schätzung (Epley) — sie steht
                  beschriftet unter dem echten Satz, nie als nackte Zahl. */}
              {sieger.kind === "weight" && sieger.satz && (
                <p>
                  Geschätztes 1RM <span className="tabular-nums">{fmtDe(sieger.wert)} kg</span>
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
            <motion.div
              initial={reduce ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={stagger(2)}
              className="mt-4 flex flex-col items-center gap-3"
            >
              <Sticker ton="blau" drehung={-4} className="text-base">
                Erledigt!
              </Sticker>
              <h1 className="font-display text-3xl font-extrabold text-fg">{name || "Einheit"}</h1>
            </motion.div>
          </>
        )}

        <motion.div
          initial={reduce ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={stagger(8)}
          className="mt-8 w-full"
        >
          <div className={cn("mb-1.5 flex items-center justify-between text-sm font-bold", tonFg)}>
            <span className="flex items-center gap-1.5">
              Level
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.span
                  key={lvl}
                  initial={reduce ? false : { scale: 0.6, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 1.3, opacity: 0 }}
                  transition={{ type: "spring", stiffness: 400, damping: 22 }}
                  className="font-display font-extrabold tabular-nums"
                >
                  {lvl}
                </motion.span>
              </AnimatePresence>
            </span>
            {levelUp && lvl === summary.levelAfter && <Sticker drehung={3}>Level up!</Sticker>}
          </div>
          <div
            className="h-4 overflow-hidden rounded-pill border-dick border-rand bg-surface-1"
            aria-hidden
          >
            <div
              className="h-full bg-accent"
              style={{
                width: `${Math.round(pct * 100)}%`,
                transition: reduce ? undefined : "width 1s cubic-bezier(0.22,1,0.36,1)",
              }}
            />
          </div>
          <p className={cn("mt-2 text-sm font-semibold", tonMuted)}>
            Diese Woche: {summary.weekSets}/{summary.weekTarget} Sätze
          </p>
        </motion.div>

        {/* ATLAS fasst die Einheit zusammen — als Sprechblase. */}
        {summary.debrief.length > 0 && (
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={stagger(9)}
            data-testid="session-debrief"
            className="mt-6 w-full text-left"
          >
            <Sprechblase blaseClassName="flex-1 space-y-1.5 font-medium">
              <p className="flex items-center gap-1.5 text-3xs font-bold text-muted">
                <AtlasMark size={12} /> ATLAS
              </p>
              {summary.debrief.map((l, i) => (
                <p key={i} className="text-base leading-snug text-fg">
                  {l}
                </p>
              ))}
            </Sprechblase>
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
          <Button size="lg" variant={sieger ? "strong" : "primary"} onClick={onDone} className="flex-1">
            Weiter
          </Button>
        </motion.div>
      </motion.div>
    </div>
  );
}
