"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useState } from "react";
import { LiftMark } from "@/components/brand/LiftMark";
import { Button } from "@/components/ui/Button";
import { Pressable } from "@/components/ui/pressable";
import { useTraining } from "@/components/providers/TrainingProvider";
import { EASE_OUT } from "@/lib/motion";
import type { Experience, TrainingGoal } from "@/lib/types";

const EXP: { v: Experience; label: string }[] = [
  { v: "anfänger", label: "Anfänger" },
  { v: "fortgeschritten", label: "Mittel" },
  { v: "erfahren", label: "Erfahren" },
];
const GOALS: { v: TrainingGoal; label: string }[] = [
  { v: "aufbau", label: "Aufbau" },
  { v: "optik", label: "Optik" },
  { v: "kraft", label: "Kraft" },
];

/** Feines Kreide-Raster der Icon-Platte (0,5 px alle 10 px, wie das App-Icon). */
const PLATTE_RASTER =
  "repeating-linear-gradient(to right, rgba(233,225,206,.2) 0, rgba(233,225,206,.2) 0.5px, transparent 0.5px, transparent 10px)," +
  "repeating-linear-gradient(to bottom, rgba(233,225,206,.2) 0, rgba(233,225,206,.2) 0.5px, transparent 0.5px, transparent 10px)";

/**
 * Erster Start — das Frontispiz des Labors (Onboarding.dc): Icon-Platte,
 * Muybridge-Buchsatz, Name des Athleten + Level/Ziel, dann ist die
 * Apparatur eingerichtet. Der Eintritts-Stagger bleibt als dokumentierte
 * Bestands-Ausnahme neben dem Filmtransport.
 */
export function Welcome() {
  const { completeOnboarding } = useTraining();
  const reduce = useReducedMotion();
  const [name, setName] = useState("");
  const [exp, setExp] = useState<Experience | undefined>(undefined);
  const [goals, setGoals] = useState<TrainingGoal[]>(["aufbau", "optik"]);
  const toggleGoal = (v: TrainingGoal) =>
    setGoals((cur) => (cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v]));

  const fieldLabel =
    "font-mono text-3xs font-medium uppercase tracking-gesperrt-2 text-muted";

  return (
    <motion.div
      className="fixed inset-0 z-40 overflow-y-auto app-bg"
      style={{
        paddingTop: "env(safe-area-inset-top)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
      initial={reduce ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4, ease: EASE_OUT }}
    >
      <div className="mx-auto flex min-h-full max-w-md flex-col px-6 py-10">
        <motion.div
          className="flex flex-col items-center pt-8 text-center"
          initial={reduce ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: EASE_OUT }}
        >
          {/* Icon-Platte: Kollodium-dunkel auch im Archiv (Handoff-Regel) —
              die Nachbildung des App-Icons, deshalb der weiche Icon-Radius. */}
          {/* Hairline fasst die Platte — im Atelier wäre sie sonst grundgleich. */}
          <span
            aria-hidden
            className="relative block overflow-hidden border border-line"
            style={{
              width: 84,
              height: 84,
              borderRadius: 18,
              backgroundColor: "#141210",
              color: "#e9e1ce",
            }}
          >
            <span className="absolute inset-0" style={{ backgroundImage: PLATTE_RASTER }} />
            <span className="absolute" style={{ inset: "8px 12px 4px" }}>
              <LiftMark size={60} />
            </span>
            <span
              className="absolute font-mono"
              style={{ right: 6, bottom: 4, fontSize: 7, letterSpacing: ".12em", opacity: 0.7 }}
            >
              311
            </span>
          </span>

          <p className="mt-7 font-mono text-3xs font-semibold uppercase tracking-gesperrt-4 text-muted">
            Das Bewegungslabor
          </p>
          <h1 className="mt-2 font-display text-4xl italic text-fg">Platte 311</h1>
          <p className="mt-4 max-w-xs font-display text-base leading-relaxed text-fg">
            1887 zerlegte Muybridge den Gewichtheber in Einzelbilder. Dieses
            Labor setzt die Reihe fort: Jede Wiederholung ein Kader, jede
            Einheit eine Platte — und ATLAS führt das Protokoll.
          </p>
        </motion.div>

        <motion.div
          className="mt-auto pt-10"
          initial={reduce ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.25, ease: EASE_OUT }}
        >
          <p className={`mb-1.5 px-1 ${fieldLabel}`}>Name des Athleten</p>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="z. B. J. Weber"
            className="mb-4 w-full rounded-pill border border-line bg-transparent px-3 py-3 text-base text-fg placeholder:text-faint focus:outline-none focus-visible:ring-2 focus-visible:ring-cyanotypie"
          />

          <p className={`mb-1.5 px-1 ${fieldLabel}`}>Level</p>
          <div className="mb-4 flex gap-1 rounded-pill border border-line-card bg-surface-1 p-1">
            {EXP.map((x) => (
              <Pressable
                key={x.v}
                onClick={() => setExp(x.v)}
                aria-pressed={exp === x.v}
                className={
                  "flex-1 rounded-pill py-2 font-mono text-3xs uppercase tracking-gesperrt focus:outline-none focus-visible:ring-2 focus-visible:ring-cyanotypie " +
                  (exp === x.v ? "bg-strong text-on-strong" : "text-muted")
                }
              >
                {x.label}
              </Pressable>
            ))}
          </div>

          <p className={`mb-1.5 px-1 ${fieldLabel}`}>Ziel</p>
          <div className="mb-6 flex flex-wrap gap-2">
            {GOALS.map((g) => (
              <Pressable
                key={g.v}
                onClick={() => toggleGoal(g.v)}
                aria-pressed={goals.includes(g.v)}
                className={
                  "rounded-pill border px-3.5 py-1.5 font-mono text-3xs uppercase tracking-gesperrt focus:outline-none focus-visible:ring-2 focus-visible:ring-cyanotypie " +
                  (goals.includes(g.v)
                    ? "border-strong bg-strong text-on-strong"
                    : "border-line text-muted")
                }
              >
                {g.label}
              </Pressable>
            ))}
          </div>

          <Button
            onClick={() => completeOnboarding(name, { experience: exp, goals })}
            size="lg"
            full
            className="tracking-gesperrt-3"
          >
            Apparatur einrichten
          </Button>
          <p className="mt-3 text-center font-mono text-4xs font-medium uppercase tracking-gesperrt-2 text-muted">
            Lokales Archiv · Kein Konto nötig
          </p>
        </motion.div>
      </div>
    </motion.div>
  );
}
