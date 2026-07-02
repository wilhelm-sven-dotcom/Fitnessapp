"use client";

import { motion } from "framer-motion";
import { Dumbbell, Sparkles, TrendingUp } from "lucide-react";
import { useState } from "react";
import { BrandMark } from "@/components/brand/BrandMark";
import { Pressable } from "@/components/ui/pressable";
import { useTraining } from "@/components/providers/TrainingProvider";
import { greeting } from "@/lib/coaching";
import { EASE_OUT } from "@/lib/motion";
import type { Experience, TrainingGoal } from "@/lib/types";

const FEATURES = [
  {
    icon: Dumbbell,
    title: "Plan, der sich anpasst",
    body: "Gewicht und Sätze steigen autoreguliert über Tagesform und RIR.",
  },
  {
    icon: Sparkles,
    title: "KI-Coach, der mitdenkt",
    body: "Plant dein Cardio ein, erkennt Plateaus und schützt deinen Rücken.",
  },
  {
    icon: TrendingUp,
    title: "Fortschritt sichtbar",
    body: "Rekorde, Kurven und Muskel-Balance auf einen Blick.",
  },
];

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

/** First-run welcome screen. Greets, pitches the app, captures name + a quick profile. */
export function Welcome() {
  const { completeOnboarding } = useTraining();
  const [name, setName] = useState("");
  const [exp, setExp] = useState<Experience | undefined>(undefined);
  const [goals, setGoals] = useState<TrainingGoal[]>(["aufbau", "optik"]);
  const toggleGoal = (v: TrainingGoal) =>
    setGoals((cur) => (cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v]));

  return (
    <motion.div
      className="fixed inset-0 z-40 overflow-y-auto bg-base"
      style={{
        paddingTop: "env(safe-area-inset-top)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4, ease: EASE_OUT }}
    >
      <div className="mx-auto flex min-h-full max-w-md flex-col px-6 py-10">
        <motion.div
          className="relative flex flex-col items-center pt-6 text-center"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: EASE_OUT }}
        >
          <span
            className="absolute -top-2 h-40 w-40 rounded-full"
            style={{
              background: "radial-gradient(circle, var(--accent) 0%, rgba(0,0,0,0) 70%)",
              opacity: 0.25,
            }}
          />
          <BrandMark size={72} className="rounded-md" />
          <p className="mt-6 font-display text-3xl font-semibold tracking-tight text-fg">
            {greeting()}
          </p>
          <p className="mt-2 max-w-xs text-sm leading-relaxed text-muted">
            Dein persönlicher Trainingsplan für Muskelaufbau — 3× pro Woche, in 20–30 Minuten.
          </p>
        </motion.div>

        <div className="mt-10 space-y-3">
          {FEATURES.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.15 + i * 0.1, ease: EASE_OUT }}
              className="flex items-start gap-3 rounded-card border border-line bg-panel p-4 shadow-card"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-card bg-surface-2">
                <f.icon size={20} style={{ color: "var(--accent)" }} />
              </span>
              <div className="min-w-0">
                <p className="font-medium text-fg">{f.title}</p>
                <p className="mt-0.5 text-sm leading-relaxed text-muted">{f.body}</p>
              </div>
            </motion.div>
          ))}
        </div>

        <motion.div
          className="mt-auto pt-10"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.5, ease: EASE_OUT }}
        >
          <p className="mb-2 px-1 text-sm font-medium text-fg">Wie sollen wir dich nennen?</p>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Dein Name (optional)"
            className="mb-4 w-full rounded-pill bg-surface-2 px-4 py-3 text-sm text-fg placeholder:text-faint focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-sessions"
          />

          <p className="mb-1.5 px-1 text-sm font-medium text-fg">Dein Level</p>
          <div className="mb-4 flex gap-1 rounded-pill bg-surface-2 p-1">
            {EXP.map((x) => (
              <Pressable
                key={x.v}
                onClick={() => setExp(x.v)}
                className={
                  "flex-1 rounded-pill py-2 text-sm font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-sessions " +
                  (exp === x.v ? "bg-strong text-on-strong" : "text-muted")
                }
              >
                {x.label}
              </Pressable>
            ))}
          </div>

          <p className="mb-1.5 px-1 text-sm font-medium text-fg">Dein Ziel</p>
          <div className="mb-5 flex flex-wrap gap-2">
            {GOALS.map((g) => (
              <Pressable
                key={g.v}
                onClick={() => toggleGoal(g.v)}
                className={
                  "rounded-pill px-3 py-1.5 text-sm font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-sessions " +
                  (goals.includes(g.v) ? "bg-strong text-on-strong" : "bg-surface-2 text-muted")
                }
              >
                {g.label}
              </Pressable>
            ))}
          </div>

          <Pressable
            onClick={() => completeOnboarding(name, { experience: exp, goals })}
            className="flex w-full items-center justify-center rounded-card bg-accent-sessions py-4 text-lg font-semibold text-on-accent shadow-card-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-sessions"
          >
            Los geht&rsquo;s
          </Pressable>
        </motion.div>
      </div>
    </motion.div>
  );
}
