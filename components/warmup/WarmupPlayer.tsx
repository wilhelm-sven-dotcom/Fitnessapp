"use client";

import { ChevronRight, Pause, Play, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Pressable } from "@/components/ui/pressable";
import { speak } from "@/lib/voice";
import { cn } from "@/lib/utils";
import type { WarmupDrill } from "@/lib/warmup";

function vibrate(p: number | number[]) {
  if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(p);
}

export function WarmupPlayer({
  drills,
  voiceOn,
  onClose,
}: {
  drills: WarmupDrill[];
  voiceOn: boolean;
  onClose: () => void;
}) {
  const total = drills.length;
  const [index, setIndex] = useState(0);
  const [left, setLeft] = useState(drills[0]?.durationSec ?? 0);
  const [paused, setPaused] = useState(false);
  const [done, setDone] = useState(false);

  const current = drills[index];

  // Announce + (re)start the timer whenever the drill changes.
  useEffect(() => {
    if (done) return;
    const d = drills[index];
    if (!d) return;
    setLeft(d.durationSec);
    vibrate(50);
    if (voiceOn) speak(d.name, { interrupt: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, done]);

  // Countdown for the current drill; auto-advance at zero.
  useEffect(() => {
    if (paused || done) return;
    if (left <= 0) {
      if (index + 1 < total) {
        setIndex((i) => i + 1);
      } else {
        setDone(true);
        vibrate([60, 40, 60]);
        if (voiceOn) speak("Aufgewärmt. Los geht's.", { interrupt: true });
      }
      return;
    }
    const t = setTimeout(() => setLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [left, paused, done, index, total, voiceOn]);

  const skip = () => {
    if (index + 1 < total) setIndex((i) => i + 1);
    else setDone(true);
  };

  if (done) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-neutral-950 px-8 text-center">
        <p className="text-4xl font-semibold tracking-tight text-neutral-100">Aufgewärmt 💪</p>
        <p className="max-w-xs text-sm text-neutral-400">
          Gelenke warm, Rücken aktiviert. Jetzt sauber und kontrolliert trainieren.
        </p>
        <Pressable
          onClick={onClose}
          className="mt-2 rounded-2xl bg-neutral-100 px-6 py-3 text-base font-semibold text-neutral-950 focus:outline-none"
        >
          Los geht&apos;s
        </Pressable>
      </div>
    );
  }

  if (!current) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-950">
        <Pressable
          onClick={onClose}
          className="rounded-2xl bg-neutral-100 px-6 py-3 text-base font-semibold text-neutral-950 focus:outline-none"
        >
          Zurück
        </Pressable>
      </div>
    );
  }

  const pct = current.durationSec > 0 ? (left / current.durationSec) * 100 : 0;
  const isMobility = current.kind === "mobility";

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-neutral-950"
      style={{
        paddingTop: "calc(env(safe-area-inset-top) + 0.5rem)",
        paddingBottom: "calc(env(safe-area-inset-bottom) + 0.75rem)",
      }}
    >
      {/* top bar */}
      <div className="flex items-center justify-between px-5">
        <Pressable
          onClick={onClose}
          aria-label="Aufwärmen beenden"
          className="flex items-center gap-1 rounded-md px-1 py-1 text-sm text-neutral-400 focus:outline-none"
        >
          <X size={18} /> Beenden
        </Pressable>
        <span className="font-mono text-xs tabular-nums text-neutral-500">
          {index + 1}/{total} · Aufwärmen
        </span>
      </div>

      {/* progress dots */}
      <div className="mt-3 flex justify-center gap-1.5 px-5">
        {drills.map((d, i) => (
          <span
            key={d.id}
            className={cn(
              "h-1.5 rounded-full transition-all",
              i < index ? "w-4 bg-neutral-500" : i === index ? "w-8 bg-accent-sessions" : "w-4 bg-neutral-800",
            )}
          />
        ))}
      </div>

      {/* drill */}
      <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
        <span
          className={cn(
            "mb-4 rounded-full px-3 py-1 text-xs font-medium",
            isMobility ? "bg-accent-coverage text-neutral-950" : "bg-accent-volume text-neutral-950",
          )}
        >
          {isMobility ? "Mobilität" : "Aktivierung"}
        </span>
        <h2 className="text-4xl font-semibold tracking-tight text-neutral-100">{current.name}</h2>
        <p className="mt-3 max-w-sm text-sm leading-relaxed text-neutral-400">{current.cue}</p>
        <p className="mt-8 font-mono text-7xl font-semibold tabular-nums text-neutral-50">{left}</p>
        <div className="mt-4 h-1.5 w-48 overflow-hidden rounded-full bg-neutral-800">
          <div
            className="h-full rounded-full bg-accent-sessions transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* controls */}
      <div className="flex items-center gap-2 px-5">
        <Pressable
          onClick={() => setPaused((p) => !p)}
          className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-neutral-800 py-3.5 text-sm font-medium text-neutral-100 focus:outline-none"
        >
          {paused ? <Play size={16} /> : <Pause size={16} />} {paused ? "Weiter" : "Pause"}
        </Pressable>
        <Pressable
          onClick={skip}
          className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-neutral-100 py-3.5 text-sm font-semibold text-neutral-950 focus:outline-none"
        >
          Nächste <ChevronRight size={16} strokeWidth={2.5} />
        </Pressable>
      </div>
    </div>
  );
}
