"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Dumbbell } from "lucide-react";
import { ActivityRings } from "@/components/rings/ActivityRings";
import { EASE_OUT } from "@/lib/motion";
import { RING, type RingMetric } from "@/lib/ring-colors";

// Three full rings — they draw themselves up on mount (charging effect).
const FULL: RingMetric[] = [
  { id: "move", value: 1, target: 1, label: "Einheiten", color: RING.move },
  { id: "exercise", value: 1, target: 1, label: "Volumen", color: RING.exercise },
  { id: "stand", value: 1, target: 1, label: "Abdeckung", color: RING.stand },
];

export function Splash() {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-neutral-950"
      style={{
        paddingTop: "env(safe-area-inset-top)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4, ease: EASE_OUT }}
    >
      <ActivityRings
        metrics={FULL}
        size={232}
        stroke={16}
        gap={8}
        center={
          <motion.span
            className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-sessions"
            initial={reduce ? false : { scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.45, delay: 0.5, ease: EASE_OUT }}
          >
            <Dumbbell size={30} className="text-neutral-950" strokeWidth={2.5} />
          </motion.span>
        }
      />
      <motion.div
        className="mt-8 flex flex-col items-center"
        initial={reduce ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.7, ease: EASE_OUT }}
      >
        <p className="font-display text-2xl font-semibold tracking-tight text-neutral-100">Training</p>
        <p className="mt-1 text-sm text-neutral-500">Bereit, wenn du es bist.</p>
      </motion.div>
    </motion.div>
  );
}
