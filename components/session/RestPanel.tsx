"use client";

import { motion, useReducedMotion } from "framer-motion";
import { FastForward, Plus } from "lucide-react";
import { INTENSITY_OPTIONS, RIR_OPTIONS, Scale } from "@/components/workout/Scale";
import { Pressable } from "@/components/ui/pressable";
import { cn } from "@/lib/utils";
import type { SetEntry } from "@/lib/types";

/**
 * Satzpause als festes Dock am unteren Rand — bleibt beim Scrollen im Blick,
 * kein Overlay, kein Dimmen. Die letzten 5 s wechseln Zahl und Balken auf
 * Gelb; bei 0 steht „Pause vorbei" (einmaliger Puls), bis der Nutzer
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
  // Gelb bleibt auch im „vorbei"-Zustand stehen — bis zur Interaktion.
  const finale = left <= 5;
  const pct = total > 0 ? Math.max(0, Math.min(1, left / total)) : 0;

  return (
    <section aria-label="Satzpause" className="fixed inset-x-0 bottom-0 z-30">
      <div
        className="mx-auto max-w-md px-5"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 0.75rem)" }}
      >
        <div className="rounded-card border border-line bg-surface-1 p-4 shadow-card-lg">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p
                className={cn(
                  "font-mono text-xs uppercase tracking-widest",
                  over ? "text-status-over" : "text-accent-2",
                )}
              >
                {over ? "Pause vorbei" : "Pause"}
              </p>
              <motion.p
                animate={over && !reduce ? { scale: [1, 1.04, 1] } : undefined}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className={cn(
                  "origin-left stretch-display font-display text-5xl font-bold tabular-nums leading-none transition-colors",
                  finale ? "text-status-over" : "text-fg",
                )}
              >
                {over ? (
                  "Los"
                ) : (
                  <>
                    {left}
                    <span className="ml-1 text-base font-medium tracking-normal text-muted">
                      s
                    </span>
                  </>
                )}
              </motion.p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Pressable
                onClick={onAdd}
                className="flex min-h-11 items-center gap-1 rounded-pill bg-surface-2 px-4 text-xs font-medium text-fg focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-ink"
              >
                <Plus size={13} /> 15 s
              </Pressable>
              <Pressable
                onClick={onSkip}
                className={cn(
                  "flex min-h-11 items-center gap-1 rounded-pill px-4 text-xs font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-ink",
                  over ? "bg-strong text-on-strong" : "bg-surface-2 text-muted",
                )}
              >
                <FastForward size={13} /> Weiter
              </Pressable>
            </div>
          </div>

          <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-surface-2">
            <div
              className={cn(
                "h-full rounded-full transition-[width,background-color] duration-1000 ease-linear",
                finale ? "bg-status-over" : "bg-accent-sessions",
              )}
              style={{ width: `${pct * 100}%` }}
            />
          </div>

          {set && !set.warmup && (
            <div className="mt-3">
              <p className="mb-1 text-xs text-muted">
                Satz {setNo} — wie schwer war&apos;s?
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
