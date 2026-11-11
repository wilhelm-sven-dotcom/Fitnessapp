"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useState } from "react";
import { Marke } from "@/components/brand/Marke";
import { Button } from "@/components/ui/Button";
import { ChipToggle } from "@/components/ui/ChipToggle";
import { Segment } from "@/components/ui/Segment";
import { useTraining } from "@/components/providers/TrainingProvider";
import { EASE_OUT } from "@/lib/motion";
import type { Experience, TrainingGoal } from "@/lib/types";
import { MARKE } from "@/lib/grundfarben";
import { APP_NAME } from "@/lib/marke";
import { momentUrl } from "@/lib/momente";

// Die Stufe steuert die Startgewichte (lib/start-weight.ts, EXP_MULT 0,7 ·
// 1,0 · 1,25) und steht im Profil, das ATLAS bekommt.
const EXP: { v: Experience; label: string; satz: string }[] = [
  {
    v: "anfänger",
    label: "Anfänger",
    satz: "Neu im Krafttraining oder nach langer Pause. Startgewichte rund 30 % leichter.",
  },
  {
    v: "fortgeschritten",
    label: "Mittel",
    satz: "Du trainierst regelmäßig und kennst die Grundübungen. Startgewichte normal.",
  },
  {
    v: "erfahren",
    label: "Erfahren",
    satz: "Jahre am Eisen, saubere Technik auch bei schweren Sätzen. Startgewichte rund 25 % höher.",
  },
];
const GOALS: { v: TrainingGoal; label: string }[] = [
  { v: "aufbau", label: "Muskelaufbau" },
  { v: "optik", label: "Optik" },
  { v: "kraft", label: "Kraft" },
];

/**
 * Erster Start: App-Zeichen, ein Absatz, was die App tut, dann Name,
 * Erfahrung (mit einem erklärenden Satz je Stufe) und Ziel.
 */
export function Welcome() {
  const { completeOnboarding } = useTraining();
  const reduce = useReducedMotion();
  const [name, setName] = useState("");
  const [exp, setExp] = useState<Experience | undefined>(undefined);
  const [goals, setGoals] = useState<TrainingGoal[]>(["aufbau", "optik"]);
  const toggleGoal = (v: TrainingGoal) =>
    setGoals((cur) => (cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v]));

  const fieldLabel = "text-3xs font-bold text-muted";

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
          {/* Nachbildung des App-Icons: Sprechblase auf Elektroblau in jedem
              Modus, deshalb die feste Markenfarbe und der Icon-Radius; Rand
              und harter Schatten wie jede wichtige Karte. */}
          <span
            aria-hidden
            className="relative flex items-center justify-center overflow-hidden border-dick border-rand shadow-hart"
            style={{
              width: 88,
              height: 88,
              borderRadius: 20,
              backgroundColor: MARKE.blau,
            }}
          >
            <Marke size={62} />
          </span>

          <p className="mt-7 text-3xs font-bold text-muted">
            Krafttraining mit ATLAS
          </p>
          <h1 className="mt-2 font-display text-4xl font-extrabold text-fg">{APP_NAME}</h1>
          <p className="mt-4 max-w-xs text-base leading-relaxed text-fg">
            Du trainierst, ATLAS steht neben dir, schaut auf deine Sätze und
            stellt die nächste Einheit zusammen. Jede Körperregion hat ihre
            Kachel: Beine Orange, Druck Blau, Zug Gelb, Rumpf Weiß.
          </p>
          {/* Der Name als Bild: der Spotter an der Bank sichert die Stange. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={momentUrl("begruessung")}
            alt="Zwei Trainingspartner an der Hantelbank: einer drückt, der andere sichert die Stange."
            draggable={false}
            className="mt-6 aspect-bild w-full rounded-card border-dick border-rand object-cover"
          />
        </motion.div>

        <motion.div
          className="mt-auto pt-10"
          initial={reduce ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.25, ease: EASE_OUT }}
        >
          <p className={`mb-1.5 px-1 ${fieldLabel}`}>Dein Name</p>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="z. B. J. Weber"
            aria-label="Dein Name"
            className="mb-4 min-h-12 w-full rounded-inner border-dick border-rand bg-surface-1 px-3 py-3 text-base text-fg placeholder:text-faint focus:outline-none focus-visible:ring-2 focus-visible:ring-fokus"
          />

          <p className={`mb-1.5 px-1 ${fieldLabel}`}>Erfahrung</p>
          <Segment
            label="Erfahrung"
            options={EXP.map((x) => ({ value: x.v, label: x.label }))}
            value={exp}
            onChange={setExp}
          />
          {/* Eine Zeile zur gewählten Stufe — vorher standen die Stufen ohne
              Erklärung da. */}
          <p className="mb-4 mt-2 min-h-10 px-1 text-sm leading-snug text-muted" aria-live="polite">
            {exp
              ? EXP.find((x) => x.v === exp)?.satz
              : "Ohne Wahl rechnet die App mit „Mittel“."}
          </p>

          <p className={`mb-1.5 px-1 ${fieldLabel}`}>Ziel</p>
          <div className="mb-6 flex flex-wrap gap-2">
            {GOALS.map((g) => (
              <ChipToggle key={g.v} onClick={() => toggleGoal(g.v)} active={goals.includes(g.v)}>
                {g.label}
              </ChipToggle>
            ))}
          </div>

          <Button
            onClick={() => completeOnboarding(name, { experience: exp, goals })}
            size="lg"
            full
            className=""
          >
            Los geht’s
          </Button>
          <p className="mt-3 text-center text-sm text-muted">
            Alles bleibt auf dem Gerät, kein Konto nötig.
          </p>
        </motion.div>
      </div>
    </motion.div>
  );
}
