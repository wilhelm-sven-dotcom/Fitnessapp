"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useState } from "react";
import { MareySpur } from "@/components/brand/MareySpur";
import { Button } from "@/components/ui/Button";
import { ChipToggle } from "@/components/ui/ChipToggle";
import { Segment } from "@/components/ui/Segment";
import { useTraining } from "@/components/providers/TrainingProvider";
import { EASE_OUT } from "@/lib/motion";
import type { Experience, TrainingGoal } from "@/lib/types";
import { GRUND_DUNKEL, TINTE_DUNKEL } from "@/lib/grundfarben";

const EXP: { v: Experience; label: string }[] = [
  { v: "anfänger", label: "Anfänger" },
  { v: "fortgeschritten", label: "Mittel" },
  { v: "erfahren", label: "Erfahren" },
];
const GOALS: { v: TrainingGoal; label: string }[] = [
  { v: "aufbau", label: "Muskelaufbau" },
  { v: "optik", label: "Optik" },
  { v: "kraft", label: "Kraft" },
];

/**
 * Erster Start — das Frontispiz des Labors (Onboarding.dc): Icon-Platte,
 * Muybridge-Buchsatz, Name + Erfahrung/Ziel, dann ist die
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
    "font-mono text-3xs font-medium uppercase tracking-label text-muted";

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
          {/* Icon-Platte: die Nachbildung des App-Icons (I1 „Marey-Spur") —
              Kollodium-dunkel auch im Archiv, deshalb die feste Farbe und der
              weiche Icon-Radius. Die Hairline fasst die Platte, im Atelier
              wäre sie sonst grundgleich. Raster und Signatur führt I1 nicht. */}
          <span
            aria-hidden
            className="relative block overflow-hidden border border-line"
            style={{
              width: 84,
              height: 84,
              borderRadius: 18,
              backgroundColor: GRUND_DUNKEL,
              color: TINTE_DUNKEL,
            }}
          >
            <MareySpur size={84} />
          </span>

          <p className="mt-7 font-mono text-3xs font-semibold uppercase tracking-label text-muted">
            Das Bewegungslabor
          </p>
          <h1 className="mt-2 font-display font-bold text-4xl text-fg">Platte 311</h1>
          <p className="mt-4 max-w-xs text-base leading-relaxed text-fg">
            1887 zerlegte Muybridge Bewegung in Einzelbilder — Platte 311 zeigt
            einen Gewichtheber. Diese App führt die Reihe fort: Du trainierst,
            ATLAS schaut zu und stellt die nächste Einheit zusammen.
          </p>
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
            className="mb-4 w-full rounded-pill border border-line bg-transparent px-3 py-3 text-base text-fg placeholder:text-faint focus:outline-none focus-visible:ring-2 focus-visible:ring-fokus"
          />

          <p className={`mb-1.5 px-1 ${fieldLabel}`}>Erfahrung</p>
          <Segment
            label="Erfahrung"
            options={EXP.map((x) => ({ value: x.v, label: x.label }))}
            value={exp}
            onChange={setExp}
            className="mb-4"
          />

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
            Los geht&apos;s
          </Button>
          <p className="mt-3 text-center font-mono text-4xs font-medium uppercase tracking-label text-muted">
            Alles bleibt auf dem Gerät · Kein Konto nötig
          </p>
        </motion.div>
      </div>
    </motion.div>
  );
}
