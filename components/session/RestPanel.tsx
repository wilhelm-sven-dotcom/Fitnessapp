"use client";

import { motion, useReducedMotion } from "framer-motion";
import { INTENSITY_OPTIONS, RIR_OPTIONS, Scale } from "@/components/workout/Scale";
import { Pressable } from "@/components/ui/pressable";
import type { NextSetPreview } from "@/lib/active-session";
import { fmtClock, fmtSatz } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { SetEntry } from "@/lib/types";

const ZAHLWORT = ["keine", "eine", "zwei", "drei", "vier"];

/** Was die gewählte Stufe bedeutet — steht immer da (feste Dock-Höhe). */
function skalaHinweis(timed: boolean, set: SetEntry): string {
  if (timed) return "1 heißt leicht, 5 heißt am Limit.";
  const v = set.rir;
  if (v == null) return "Wie viele Wiederholungen wären noch gegangen?";
  if (v === 0) return "0 heißt: keine Wiederholung mehr möglich.";
  return `${v} heißt: ${ZAHLWORT[v] ?? v} ${v === 1 ? "Wiederholung wäre" : "Wiederholungen wären"} noch gegangen.`;
}

/** Linke und rechte Hälfte der „Als Nächstes“-Zeile. */
function naechstesTeile(n: NextSetPreview): { was: string; werte: string } {
  if (n.kind === "abschluss") return { was: "Abschluss", werte: "" };
  if (n.kind === "cardio")
    return { was: n.exName, werte: `${n.minLow}–${n.minHigh} Min` };
  const werte = fmtSatz(n.weight, n.reps, n.timed);
  if (n.gleich) return { was: `Satz ${n.setNo}`, werte };
  return { was: n.setNo > 1 ? `${n.exName} · Satz ${n.setNo}` : n.exName, werte };
}

/**
 * Die Satzpause im Dock „spotter“: Restzeit groß (Bricolage), dicker blauer
 * Balken mit Tinte-Rand, was als Nächstes kommt (gestrichelt), ±15 s,
 * „Pause beenden“ und die EINE Frage nach dem eben eingetragenen Satz. Bei 0 steht „Los“, bis der Nutzer weitermacht (die
 * Bewertung soll nicht mit dem Timer verschwinden).
 */
export function RestPanel({
  left,
  total,
  set,
  timed,
  setNo,
  next,
  markVar,
  onRir,
  onIntensity,
  onAdd,
  onSub,
  onSkip,
}: {
  left: number;
  total: number;
  set: SetEntry | undefined;
  timed: boolean;
  setNo: number;
  /** Was nach der Pause kommt (null: unbekannt → Zeile entfällt). */
  next: NextSetPreview | null;
  /** Farbe des Balkens (Hauptaktion Blau). */
  markVar: string;
  onRir: (v: number) => void;
  onIntensity: (v: number) => void;
  onAdd: () => void;
  onSub: () => void;
  onSkip: () => void;
}) {
  const reduce = useReducedMotion();
  const over = left <= 0;
  const anteil = total > 0 ? Math.max(0, Math.min(1, left / total)) : 0;
  const teile = next ? naechstesTeile(next) : null;
  // Für Screenreader: einmal beim Start, einmal beim Ende — nicht jede Sekunde.
  const ansage = teile
    ? `${over ? "Pause vorbei." : `Pause ${fmtClock(total)}.`} Als Nächstes: ${teile.was}${teile.werte ? `, ${teile.werte}` : ""}.`
    : over
      ? "Pause vorbei."
      : `Pause ${fmtClock(total)}.`;

  return (
    <section
      aria-label="Satzpause"
      className="rounded-t-card border-dick border-b-0 border-rand bg-surface-1"
    >
      <div
        className="mx-auto max-w-md px-5 pt-4"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 0.75rem)" }}
      >
        <p className="sr-only" aria-live="polite">
          {ansage}
        </p>
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-sm font-bold text-muted">
              {over ? "Pause vorbei" : "Pause"}
            </p>
            <motion.p
              animate={over && !reduce ? { scale: [1, 1.04, 1] } : undefined}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="mt-1 origin-left font-display text-readout font-extrabold leading-none tabular-nums text-fg"
              aria-hidden
            >
              {over ? "Los" : fmtClock(left)}
            </motion.p>
          </div>
          <p className="pb-1 text-sm font-bold tabular-nums text-muted">
            von {fmtClock(total)}
          </p>
        </div>
        <div
          className="mt-3 h-4 overflow-hidden rounded-pill border-dick border-rand bg-surface-1"
          aria-hidden
        >
          <div
            className="h-full"
            style={{
              width: `${Math.round(anteil * 1000) / 10}%`,
              backgroundColor: markVar,
              transition: reduce ? undefined : "width 1s linear",
            }}
          />
        </div>

        {teile && (
          <div className="mt-3 flex min-h-11 items-center gap-3 rounded-inner border-dick border-dashed border-rand px-3 py-2">
            <span className="shrink-0 text-sm text-muted">Als Nächstes</span>
            <span className="min-w-0 flex-1 truncate text-right text-base font-semibold text-fg">
              {teile.was}
            </span>
            {teile.werte && (
              <span className="shrink-0 text-base font-bold tabular-nums text-fg">{teile.werte}</span>
            )}
          </div>
        )}

        <div className="mt-3 flex gap-2">
          <Pressable
            onClick={onSub}
            aria-label="Pause 15 Sekunden kürzer"
            disabled={over}
            className="flex min-h-11 shrink-0 items-center justify-center rounded-pill border-dick border-rand bg-surface-1 px-4 font-display text-base font-extrabold tabular-nums text-fg focus:outline-none focus-visible:ring-2 focus-visible:ring-fokus disabled:opacity-40"
          >
            −15 s
          </Pressable>
          <Pressable
            onClick={onAdd}
            aria-label="Pause 15 Sekunden länger"
            className="flex min-h-11 shrink-0 items-center justify-center rounded-pill border-dick border-rand bg-surface-1 px-4 font-display text-base font-extrabold tabular-nums text-fg focus:outline-none focus-visible:ring-2 focus-visible:ring-fokus"
          >
            +15 s
          </Pressable>
          <Pressable
            onClick={onSkip}
            className={cn(
              "flex min-h-11 flex-1 items-center justify-center whitespace-nowrap rounded-pill border-dick border-rand px-4 font-display text-base font-extrabold focus:outline-none focus-visible:ring-2 focus-visible:ring-fokus",
              over
                ? "bg-accent text-on-accent shadow-hart-sm active:bg-accent-press"
                : "bg-surface-1 text-fg",
            )}
          >
            Pause beenden
          </Pressable>
        </div>

        {set && !set.warmup && (
          <div className="mt-3">
            <p className="text-sm font-semibold text-fg">Wie schwer war Satz {setNo}?</p>
            {timed ? (
              <Scale label="" options={INTENSITY_OPTIONS} value={set.intensity} onPick={onIntensity} />
            ) : (
              <Scale label="" options={RIR_OPTIONS} value={set.rir} onPick={onRir} />
            )}
            <p className="mt-1.5 text-3xs text-muted">{skalaHinweis(timed, set)}</p>
          </div>
        )}
      </div>
    </section>
  );
}
