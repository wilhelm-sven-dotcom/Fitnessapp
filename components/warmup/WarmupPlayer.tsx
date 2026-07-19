"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ChevronRight, Pause, Play, Volume2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { FigurePanel } from "@/components/figures/FigurePanel";
import { FIG } from "@/components/figures/figureData";
import { Pressable } from "@/components/ui/pressable";
import { useTraining } from "@/components/providers/TrainingProvider";
import { EASE_OUT } from "@/lib/motion";
import { beep, beepEnd, beepStart, primeAudio, setCueVolume as setBeepCueVolume } from "@/lib/beep";
import { speak } from "@/lib/voice";
import { cn } from "@/lib/utils";
import type { WarmupDrill } from "@/lib/warmup";

const SWITCH_SEC = 5;
/** Umschaltbare Signalton-Stufen (zyklisch per Tap im Player). */
const VOL_LEVELS = [0.5, 1, 2, 3];
const VOL_LABEL: Record<number, string> = { 0.5: "Leise", 1: "Normal", 2: "Laut", 3: "Max" };

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
  const { settings, setCueVolume } = useTraining();
  const cueVol = settings.cueVolume ?? 1;

  // Signalton-Lautstärke direkt im Player durchschalten — mit sofortigem
  // Ton-Feedback in der NEUEN Lautstärke (Modul direkt setzen, dann persistieren).
  const cycleCueVolume = () => {
    primeAudio();
    const i = VOL_LEVELS.indexOf(cueVol);
    const next = VOL_LEVELS[(i + 1) % VOL_LEVELS.length];
    setBeepCueVolume(next);
    setCueVolume(next);
    beep();
  };

  // Deep-Link / PWA-Relaunch auf /warmup/[key]: kein Button hat primeAudio()
  // aufgerufen → der AudioContext ist suspended und tone() no-opt still.
  // Der ERSTE Tap irgendwo (auch neben den Buttons) entsperrt Audio + Speech.
  useEffect(() => {
    const prime = () => {
      primeAudio();
      try {
        window.speechSynthesis?.resume();
      } catch {
        /* Speech optional */
      }
      document.removeEventListener("pointerdown", prime);
      document.removeEventListener("keydown", prime);
    };
    document.addEventListener("pointerdown", prime);
    document.addEventListener("keydown", prime);
    return () => {
      document.removeEventListener("pointerdown", prime);
      document.removeEventListener("keydown", prime);
    };
  }, []);

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

  // Akustik: Drill — Tick in den letzten 5 s, gesprochenes „drei/zwei/eins"
  // (Gym-Modus), Doppelton abwärts am Ende. Wechsel — Tick in den letzten
  // 3 s, Doppelton AUFWÄRTS bei 0: die nächste Übung startet, ohne aufs
  // Display zu schauen. Beeps bewusst ungated, nur die Stimme hängt an
  // voiceOn. Der beepStart hängt am beobachtbaren left===0-Render der
  // Wechsel-Phase — der Transition-Effekt unten schaltet erst danach um.
  useEffect(() => {
    if (paused || done) return;
    if (phase === "drill") {
      if (left <= 5 && left > 0) beep();
      if (voiceOn && left <= 3 && left >= 1) speak(["", "eins", "zwei", "drei"][left]);
      if (left === 0) beepEnd();
    } else {
      if (left <= 3 && left > 0) beep();
      if (left === 0) beepStart();
    }
  }, [left, paused, done, phase, voiceOn]);

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
        <div className="flex items-center gap-3">
          <Pressable
            onClick={cycleCueVolume}
            aria-label={`Signalton-Lautstärke: ${VOL_LABEL[cueVol] ?? "Normal"} — tippen zum Ändern`}
            className="flex items-center gap-1 rounded-pill px-2 py-1 text-muted focus:outline-none"
          >
            <Volume2 size={16} />
            <span className="font-mono text-xs tabular-nums">{VOL_LABEL[cueVol] ?? "Normal"}</span>
          </Pressable>
          <span className="font-mono text-xs tabular-nums text-muted">
            {index + 1}/{total} · Aufwärmen
          </span>
        </div>
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
