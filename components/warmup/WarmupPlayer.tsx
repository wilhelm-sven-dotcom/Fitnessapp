"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Pause, Play, Volume2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { FigurePanel } from "@/components/figures/FigurePanel";
import { FIG } from "@/components/figures/figureData";
import { Pressable } from "@/components/ui/pressable";
import { useTraining } from "@/components/providers/TrainingProvider";
import { EASE_OUT } from "@/lib/motion";
import { beep, beepEnd, beepStart, primeAudio, setCueVolume as setBeepCueVolume } from "@/lib/beep";
import { useOffline } from "@/lib/use-offline";
import { speak } from "@/lib/voice";
import { cn } from "@/lib/utils";
import { youtubeEmbedUrl } from "@/lib/youtube";
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
  onCountdown,
}: {
  drills: WarmupDrill[];
  voiceOn: boolean;
  onClose: () => void;
  /** Reached the done screen and confirmed — a completed warm-up, unlike
   *  an early exit via „Beenden" (which stays plain onClose). */
  onFinished?: () => void;
  /** Feuert am Anfang des Schluss-Countdowns (Drill: 5 s, Wechsel: 3 s) —
   *  der Runner senkt darüber die Musik (Spotify-Ducking). */
  onCountdown?: (kind: "drill" | "switch") => void;
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
  const { settings, setCueVolume, warmupVideos } = useTraining();
  const cueVol = settings.cueVolume ?? 1;
  const offline = useOffline();

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

  // Deep-Link / PWA-Relaunch mitten ins Training: kein Button hat primeAudio()
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
      if (left === 5) onCountdown?.("drill");
      if (left <= 5 && left > 0) beep();
      if (voiceOn && left <= 3 && left >= 1) speak(["", "eins", "zwei", "drei"][left]);
      if (left === 0) beepEnd();
    } else {
      if (left === 3) onCountdown?.("switch");
      if (left <= 3 && left > 0) beep();
      if (left === 0) beepStart();
    }
  }, [left, paused, done, phase, voiceOn, onCountdown]);

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
          if (voiceOn) speak("Aufwärmen fertig. Los geht's.", { interrupt: true });
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
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 app-bg px-8 text-center">
        <p className="font-display text-4xl italic text-fg">Aufgewärmt.</p>
        <p className="max-w-xs font-mono text-2xs uppercase tracking-gesperrt text-muted">
          Jetzt kann es losgehen.
        </p>
        <Pressable
          onClick={onFinished ?? onClose}
          className="mt-2 rounded-pill bg-accent-sessions px-6 py-3 font-mono text-sm font-semibold uppercase tracking-gesperrt-3 text-on-accent active:bg-accent-press focus:outline-none"
        >
          Zur ersten Übung
        </Pressable>
      </div>
    );
  }

  if (!current) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center app-bg">
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
  // RAMP-Etikett: Puls / Mobilität / Aktivierung — als Katalogschild.
  const badge =
    showing.phase === "raise"
      ? { label: "Puls" }
      : showing.phase === "mobilise"
        ? { label: "Mobilität" }
        : { label: "Aktivierung" };
  const fig = FIG[showing.figure ?? showing.id];
  // Eigenes Drill-Video (stumm, loopend): Countdown-Töne und Spotify-Ducking
  // bleiben by construction hörbar (mute=1). Offline → Figur-Fallback.
  const embed = offline
    ? null
    : youtubeEmbedUrl(warmupVideos[showing.id], { autoplay: !reduce, loop: true });

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col app-bg"
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
          className="-ml-2 flex min-h-11 items-center gap-1 rounded-card px-2 py-2 text-sm text-muted focus:outline-none"
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
            {index + 1}/{total}
          </span>
        </div>
      </div>

      <p className="mt-2 px-5 text-center font-mono text-3xs font-semibold uppercase tracking-gesperrt-2 text-muted">
        Aufwärmen
      </p>

      {/* progress dots — ab >8 Drills kompakt, damit die Reihe auf 320 px trägt */}
      <div className={cn("mt-3 flex justify-center px-5", total > 8 ? "gap-1" : "gap-1.5")}>
        {drills.map((d, i) => (
          <span
            key={d.id}
            className={cn(
              "rounded-xs",
              total > 8 ? "h-1.5 w-1.5" : "h-2 w-2",
              i === index
                ? "bg-accent-sessions"
                : i < index
                  ? "bg-fg"
                  : "border border-line bg-transparent",
            )}
          />
        ))}
      </div>

      {/* drill */}
      <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
        {/* Media-Bühne mit EIGENEM Key (Drill-Id): weil `showing` in der
            Wechsel-Phase schon der NÄCHSTE Drill ist, mountet das iframe im
            5-s-Fenster (Preload) und remountet beim Drill-Start NICHT. */}
        <motion.div
          key={`media:${showing.id}`}
          initial={reduce ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, ease: EASE_OUT }}
        >
          {embed ? (
            <div
              className="mb-3 overflow-hidden rounded-card border border-line-card bg-surface-0"
              style={{ height: "min(32vh, 300px)", aspectRatio: "9 / 16" }}
            >
              <iframe
                src={embed}
                title={`YouTube-Video: ${showing.name}`}
                className="h-full w-full"
                style={{ border: 0 }}
                referrerPolicy="strict-origin-when-cross-origin"
                allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
              />
            </div>
          ) : fig ? (
            <div className="mb-3 w-72 rounded-card border border-line-card bg-surface-1 p-2">
              <p className="px-1 pt-0.5 text-left font-mono text-3xs font-medium uppercase tracking-gesperrt text-muted">
                Übung {index + (switching ? 2 : 1)}
              </p>
              <FigurePanel
                label=""
                fig={fig}
                viewKey="side"
                periodMs={showing.periodMs}
                color="var(--accent)"
                raster
              />
            </div>
          ) : null}
        </motion.div>
        <motion.div
          key={`${index}:${phase}`}
          className="flex flex-col items-center"
          initial={reduce ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: EASE_OUT }}
        >
          <span className="mb-4 rounded-pill border border-line px-2.5 py-1 font-mono text-3xs font-semibold uppercase tracking-gesperrt text-muted">
            {switching ? "Wechsel" : badge.label}
          </span>
          <h2 className="font-display text-2xl italic text-fg">
            {switching ? `Gleich: ${showing.name}` : showing.name}
          </h2>
          <p className="mt-3 max-w-sm font-mono text-3xs font-medium uppercase leading-relaxed tracking-gesperrt text-muted">
            {switching ? "Position wechseln — gleich weiter" : showing.cue}
          </p>
        </motion.div>
        <p className="mt-8 font-mono text-readout-lg font-bold tabular-nums text-fg">{left}</p>
      </div>

      {/* controls */}
      <div className="flex items-center gap-2 px-5">
        <Pressable
          onClick={skip}
          className="flex flex-1 items-center justify-center gap-2 rounded-pill border border-line py-3.5 font-mono text-xs font-semibold uppercase tracking-gesperrt-2 text-muted focus:outline-none"
        >
          Überspringen
        </Pressable>
        <Pressable
          onClick={() => {
            primeAudio();
            setPaused((p) => !p);
          }}
          className="flex flex-1 items-center justify-center gap-2 rounded-pill border border-strong py-3.5 font-mono text-xs font-semibold uppercase tracking-gesperrt-2 text-fg focus:outline-none"
        >
          {paused ? <Play size={16} /> : <Pause size={16} />} {paused ? "Weiter" : "Pause"}
        </Pressable>
      </div>
    </div>
  );
}
