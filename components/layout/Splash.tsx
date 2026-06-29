"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";
import { BrandMark } from "@/components/brand/BrandMark";
import { ActivityRings } from "@/components/rings/ActivityRings";
import { EASE_OUT } from "@/lib/motion";
import type { RingMetric } from "@/lib/ring-colors";

// Skin ring palette (accent · accent-2 · faint) as hex — ActivityRing lightens
// the colour for its gradient, so a CSS var won't do. Read from data-skin.
const SKIN_RINGS: Record<string, [string, string, string]> = {
  blueprint: ["#ff375f", "#6e90be", "#566173"],
  tactile: ["#ff9f0a", "#9aa1ac", "#5e626b"],
  editorial: ["#ff375f", "#b9b2a4", "#6e695f"],
};

export function Splash() {
  const reduce = useReducedMotion();
  // Resolve the skin after mount (data-skin is set pre-paint). Gating on null
  // means the rings render exactly once, in the right colours — no default-skin
  // flash and no SSR/client hydration mismatch.
  const [skin, setSkin] = useState<string | null>(null);
  useEffect(() => {
    const s = document.documentElement.dataset.skin;
    setSkin(s && SKIN_RINGS[s] ? s : "tactile");
  }, []);
  const palette = skin ? SKIN_RINGS[skin] : null;

  // Three full rings — they draw themselves up on mount (charging effect).
  const full: RingMetric[] | null = palette
    ? [
        { id: "move", value: 1, target: 1, label: "Einheiten", color: palette[0] },
        { id: "exercise", value: 1, target: 1, label: "Volumen", color: palette[1] },
        { id: "stand", value: 1, target: 1, label: "Abdeckung", color: palette[2] },
      ]
    : null;

  return (
    <motion.div
      className="app-bg fixed inset-0 z-50 flex flex-col items-center justify-center"
      style={{
        paddingTop: "env(safe-area-inset-top)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4, ease: EASE_OUT }}
    >
      {full && (
        <ActivityRings
          metrics={full}
          size={232}
          stroke={16}
          gap={8}
          center={
            <motion.span
              initial={reduce ? false : { scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.45, delay: 0.5, ease: EASE_OUT }}
            >
              <BrandMark size={56} className="rounded-card" />
            </motion.span>
          }
        />
      )}
      <motion.div
        className="mt-8 flex flex-col items-center"
        initial={reduce ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.7, ease: EASE_OUT }}
      >
        <p className="font-display text-2xl font-semibold tracking-tight text-fg">Training</p>
        <p className="mt-1 text-sm text-muted">Bereit, wenn du es bist.</p>
      </motion.div>
    </motion.div>
  );
}
