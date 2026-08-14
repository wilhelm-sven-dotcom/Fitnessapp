"use client";

import { FastForward, Plus } from "lucide-react";
import { INTENSITY_OPTIONS, RIR_OPTIONS, Scale } from "@/components/workout/Scale";
import { Pressable } from "@/components/ui/pressable";
import type { SetEntry } from "@/lib/types";

/**
 * Satzpause INLINE in der Bühne — kein Overlay, kein Dimmen, kein Scroll-
 * Hijacking. Countdown, Anstrengung des eben beendeten Satzes (RIR bzw.
 * Intensität), +15 s und Überspringen.
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
  const pct = total > 0 ? Math.max(0, Math.min(1, left / total)) : 0;
  return (
    <section className="rounded-card border border-line bg-surface-1 p-4 shadow-card">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-mono text-xs uppercase tracking-widest text-accent-2">
            Pause
          </p>
          <p className="stretch-display font-display text-5xl font-bold tabular-nums leading-none text-fg">
            {left}
            <span className="ml-1 text-base font-medium tracking-normal text-muted">s</span>
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Pressable
            onClick={onAdd}
            className="flex items-center gap-1 rounded-pill bg-surface-2 px-3 py-2 text-xs font-medium text-fg focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-ink"
          >
            <Plus size={13} /> 15 s
          </Pressable>
          <Pressable
            onClick={onSkip}
            className="flex items-center gap-1 rounded-pill bg-surface-2 px-3 py-2 text-xs font-medium text-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-ink"
          >
            <FastForward size={13} /> Weiter
          </Pressable>
        </div>
      </div>

      <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-surface-2">
        <div
          className="h-full rounded-full bg-accent-sessions transition-[width] duration-1000 ease-linear"
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
    </section>
  );
}
