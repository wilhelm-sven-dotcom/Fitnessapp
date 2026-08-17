"use client";

import { motion, useReducedMotion } from "framer-motion";
import { FastForward, Plus } from "lucide-react";
import { INTENSITY_OPTIONS, RIR_OPTIONS, Scale } from "@/components/workout/Scale";
import { Pressable } from "@/components/ui/pressable";
import { cn } from "@/lib/utils";
import type { SetEntry } from "@/lib/types";

/** m:ss — die Verschlusszeit zählt wie eine Belichtungsuhr. */
function fmtRest(sec: number): string {
  const s = Math.max(0, sec);
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

const STRICHE = 24;

/**
 * Verschlusszeit — die Satzpause als festes Dock am unteren Rand (Fokus.dc):
 * 24 vertikale Striche, pro Sekunde fällt einer TOT um (steps(1), 14 %
 * Opazität — kein kriechender Balken), die letzten 3 stehenden tragen
 * Siegellack. Bei 0 steht „Los" (einmaliger Puls), bis der Nutzer
 * weitermacht. Anstrengung des eben beendeten Satzes wird hier erfasst.
 */
export function RestPanel({
  left,
  total,
  set,
  timed,
  setNo,
  onRir,
  onIntensity,
  onAdd,
  onSkip,
}: {
  left: number;
  total: number;
  set: SetEntry | undefined;
  timed: boolean;
  setNo: number;
  onRir: (v: number) => void;
  onIntensity: (v: number) => void;
  onAdd: () => void;
  onSkip: () => void;
}) {
  const reduce = useReducedMotion();
  const over = left <= 0;
  const finale = left <= 5;
  const stehend =
    total > 0 ? Math.max(0, Math.min(STRICHE, Math.ceil((left / total) * STRICHE))) : 0;
  const gefallen = STRICHE - stehend;

  return (
    <section aria-label="Satzpause" className="fixed inset-x-0 bottom-0 z-30">
      <div
        className="mx-auto max-w-md px-5"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 0.75rem)" }}
      >
        <div className="rounded-card border border-line-card bg-surface-1 p-3.5">
          <div className="flex items-baseline justify-between gap-3">
            <p
              className={cn(
                "min-w-0 font-mono text-3xs font-medium uppercase tracking-gesperrt",
                over ? "text-accent-ink" : "text-muted",
              )}
            >
              {over ? "Verschlusszeit · Vorbei" : "Verschlusszeit · Pause"}
            </p>
            <motion.p
              animate={over && !reduce ? { scale: [1, 1.04, 1] } : undefined}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className={cn(
                "shrink-0 origin-right font-mono text-titel font-bold leading-none tabular-nums",
                finale ? "text-accent-ink" : "text-fg",
              )}
            >
              {over ? "Los" : fmtRest(left)}
            </motion.p>
          </div>

          {/* 24 Striche — harter Fall, kein Übergang (Filmtransport). */}
          <div className="mt-3 flex items-end gap-0.5" aria-hidden="true">
            {Array.from({ length: STRICHE }, (_, i) => {
              const istGefallen = i < gefallen;
              const siegellack = !istGefallen && i >= STRICHE - 3;
              return (
                <div
                  key={i}
                  className={cn("h-7 flex-1", siegellack ? "bg-accent-sessions" : "bg-fg")}
                  style={istGefallen ? { opacity: 0.14 } : undefined}
                />
              );
            })}
          </div>
          <div className="mt-2 flex justify-between font-mono text-4xs font-medium uppercase tracking-gesperrt text-muted">
            <span>
              <span className="tabular-nums">{STRICHE}</span> Striche · 1/s
            </span>
            <span className="tabular-nums">Pause {total} s</span>
          </div>

          <div className="mt-3 flex items-center gap-2">
            <Pressable
              onClick={onAdd}
              className="flex min-h-11 flex-1 items-center justify-center gap-1 rounded-pill border border-strong px-4 font-mono text-xs font-semibold uppercase tracking-gesperrt-2 text-fg focus:outline-none focus-visible:ring-2 focus-visible:ring-cyanotypie"
            >
              <Plus size={13} /> 15 s
            </Pressable>
            <Pressable
              onClick={onSkip}
              className={cn(
                "flex min-h-11 flex-1 items-center justify-center gap-1 rounded-pill px-4 font-mono text-xs font-semibold uppercase tracking-gesperrt-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyanotypie",
                over
                  ? "bg-accent-sessions text-on-accent active:bg-accent-press"
                  : "border border-line text-muted",
              )}
            >
              <FastForward size={13} /> Weiter
            </Pressable>
          </div>

          {set && !set.warmup && (
            <div className="mt-3">
              <p className="mb-1 font-mono text-3xs font-medium uppercase tracking-gesperrt text-muted">
                Kader {setNo} — wie schwer war&apos;s?
              </p>
              {timed ? (
                <Scale
                  label="Int"
                  options={INTENSITY_OPTIONS}
                  value={set.intensity}
                  onPick={onIntensity}
                />
              ) : (
                <Scale label="RIR" options={RIR_OPTIONS} value={set.rir} onPick={onRir} />
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
