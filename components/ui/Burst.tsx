"use client";

import { motion } from "framer-motion";

// Das München-’72-Quartett — aufsteigende Farbbalken statt Funken.
const TONES = ["var(--accent)", "var(--gruen)", "var(--orange)", "var(--gelb)"];

/**
 * One-shot celebration burst: Farbbalken des Wegleitsystems steigen auf.
 * Deterministic (indexed, no RNG), token-colored only, pointer-transparent.
 * Parents skip rendering it under reduced motion.
 */
export function Burst() {
  const N = 12;
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden"
    >
      {Array.from({ length: N }, (_, i) => {
        const dx = (i - N / 2) * 18 + (i % 2 ? 8 : -8);
        return (
          <motion.span
            key={i}
            className="absolute h-4 w-1.5"
            style={{ backgroundColor: TONES[i % TONES.length] }}
            initial={{ x: dx * 0.2, y: 50, opacity: 0, scaleY: 0.5 }}
            animate={{ x: dx, y: -100 - (i % 3) * 26, opacity: [0, 1, 0], scaleY: 1 }}
            transition={{ duration: 1.1, delay: 0.08 + (i % 5) * 0.07, ease: "easeOut" }}
          />
        );
      })}
    </div>
  );
}
