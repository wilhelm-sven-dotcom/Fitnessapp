"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ChevronRight, Pause, Play, X } from "lucide-react";
import { useEffect, useState } from "react";
import { FigurePanel } from "@/components/figures/FigurePanel";
import { FIG } from "@/components/figures/figureData";
import { Pressable } from "@/components/ui/pressable";
import { EASE_OUT } from "@/lib/motion";
import { beep, beepEnd, primeAudio } from "@/lib/beep";
import { speak } from "@/lib/voice";
import { cn } from "@/lib/utils";
import type { WarmupDrill } from "@/lib/warmup";

const SWITCH_SEC = 5;

function vibrate(p: number | number[]) {
  if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(p);
}

export function WarmupPlayer({
  drills,
  voiceOn,
  onClose,
  onFinished,
}: {
  drills: WarmupDrill[];
  voiceOn: boolean;
  onClose: () => void;
  /** Reached the done screen and confirmed — a completed warm-up, unlike
   *  an early exit via „Beenden" (which stays plain onClose). */
  onFinished?: () => void;
}) {
  const total = drills.length;
  const [index, setIndex] = useState(0);
  const [left, setLeft] = useState(drills[0]?.durationSec ?? 0);
  /** "drill" = Übung läuft; "switch" = 5-s-Wechselpause vor der nächsten. */
  const [phase, setPhase] = useState<"drill" | "switch">("drill");
  const [paused, setPaused] = useState(false);
  const [done, setDone] = useState(false);

  const current = drills[index];
  const reduce = useReducedMotion();

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

  // Akustik: Tick in den letzten 5 s einer Übung, Doppelton am Ende —
  // hörbar ohne aufs Display zu schauen. (Nur im Drill, nicht im Wechsel.)
  useEffect(() => {
    if (paused || done || phase !== "drill") return;
    if (left <= 5 && left > 0) beep();
    if (left === 0) beepEnd();
  }, [left, paused, done, phase]);

  // Countdown; bei 0: Drill → 5-s-Wechselpause → nächster Drill (bzw. Done).
  useEffect(() => {
    if (paused || done) return;
    if (left <= 0) {
      if (phase === "drill") {
        if (index + 1 < total) {
          setPhase("switch");
          setLeft(SWITCH_SEC);
        } else {
          setDone(true);
          vibrate([60, 40, 60]);
          if (voiceOn) speak("Aufgewärmt. Los geht's.", { interrupt: true });
        }
      } else {
        // Atomar in den nächsten Drill: left SOFORT mitsetzen — sonst sieht
        // dieser Effekt einen Zwischen-Render mit left=0 im Drill-Zustand
        // und pendelt zurück in einen neuen Wechsel (der Drill startet nie).
        setPhase("drill");
        setIndex((i) => i + 1);
        setLeft(drills[index + 1]?.durationSec ?? 0);
      }
      return;
    }
    const t = setTimeout(() => setLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [left, paused, done, index, total, voiceOn, phase, drills]);

  const skip = () => {
    primeAudio();
    if (index + 1 < total) {
      setPhase("drill");
      setIndex((i) => i + 1);
      setLeft(drills[index + 1]?.durationSec ?? 0);
    } else {
      setDone(true);
    }
  };

  if (done) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-base px-8 text-center">
        <p className="text-4xl font-semibold tracking-tight text-fg">Aufgewärmt 💪</p>
        <p className="max-w-xs text-sm text-muted">
          Gelenke warm, Rücken aktiviert. Jetzt sauber und kontrolliert trainieren.
        </p>
        <Pressable
          onClick={onFinished ?? onClose}
          className="mt-2 rounded-card bg-strong px-6 py-3 text-base font-semibold text-on-strong focus:outline-none"
        >
          Los geht&apos;s
        </Pressable>
      </div>
    );
  }

  if (!current) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-base">
        <Pressable
          onClick={onClose}
          className="rounded-card bg-strong px-6 py-3 text-base font-semibold text-on-strong focus:outline-none"
        >
          Zurück
        </Pressable>
      </div>
    );
  }

  const switching = phase === "switch";
  const next = drills[index + 1];
  const showing = switching && next ? next : current;
  const phaseTotal = switching ? SWITCH_SEC : current.durationSec;
  const pct = phaseTotal > 0 ? (left / phaseTotal) * 100 : 0;
  const isMobility = showing.kind === "mobility";
  const fig = FIG[showing.figure ?? showing.id];

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-base"
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
          className="flex items-center gap-1 rounded-card px-1 py-1 text-sm text-muted focus:outline-none"
        >
          <X size={18} /> Beenden
        </Pressable>
        <span className="font-mono text-xs tabular-nums text-muted">
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
              i < index ? "w-4 bg-faint" : i === index ? "w-8 bg-accent-sessions" : "w-4 bg-surface-2",
            )}
          />
        ))}
      </div>

      {/* drill */}
      <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
        <motion.div
          key={`${index}:${phase}`}
          className="flex flex-col items-center"
          initial={reduce ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: EASE_OUT }}
        >
          <span
            className={cn(
              "mb-4 rounded-full px-3 py-1 text-xs font-medium",
              isMobility ? "bg-accent-coverage text-on-strong" : "bg-accent-volume text-on-strong",
            )}
          >
            {switching ? "Wechsel" : isMobility ? "Mobilität" : "Aktivierung"}
          </span>
          {fig && (
            <div className="mb-3 w-44 rounded-card border border-surface-3 bg-surface-1 p-2 shadow-card">
              <FigurePanel label="" fig={fig} viewKey="side" />
            </div>
          )}
          <h2 className="font-display text-4xl font-semibold tracking-tight text-fg">
            {switching ? `Gleich: ${showing.name}` : showing.name}
          </h2>
          <p className="mt-3 max-w-sm text-sm leading-relaxed text-muted">
            {switching ? "Position wechseln — es geht gleich weiter." : showing.cue}
          </p>
        </motion.div>
        <p className="mt-8 font-display text-7xl font-semibold tabular-nums text-neutral-50">{left}</p>
        <div className="mt-4 h-1.5 w-48 overflow-hidden rounded-full bg-surface-2">
          <div
            className="h-full rounded-full bg-accent-sessions transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* controls */}
      <div className="flex items-center gap-2 px-5">
        <Pressable
          onClick={() => {
            primeAudio();
            setPaused((p) => !p);
          }}
          className="flex flex-1 items-center justify-center gap-2 rounded-card bg-surface-2 py-3.5 text-sm font-medium text-fg focus:outline-none"
        >
          {paused ? <Play size={16} /> : <Pause size={16} />} {paused ? "Weiter" : "Pause"}
        </Pressable>
        <Pressable
          onClick={skip}
          className="flex flex-1 items-center justify-center gap-2 rounded-card bg-strong py-3.5 text-sm font-semibold text-on-strong focus:outline-none"
        >
          Nächste <ChevronRight size={16} strokeWidth={2.5} />
        </Pressable>
      </div>
    </div>
  );
}
