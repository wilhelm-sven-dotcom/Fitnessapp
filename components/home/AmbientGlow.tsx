"use client";

import { motion, useReducedMotion } from "framer-motion";

/**
 * The "Living Instrument" ambience: a slow accent glow that breathes behind the
 * top of the screen. Uses the per-skin `--hero-glow` token (amber on tactile, red
 * otherwise) and animates only opacity, so it never shifts layout or causes
 * horizontal scroll. Reduced-motion safe — renders a steady, still-visible glow.
 */
export function AmbientGlow() {
  const reduce = useReducedMotion();
  return (
    <motion.div
      aria-hidden
      className="pointer-events-none absolute inset-x-0 top-0 -z-10"
      style={{ height: "min(70vh, 580px)", background: "var(--hero-glow)" }}
      initial={false}
      animate={reduce ? { opacity: 0.9 } : { opacity: [0.55, 1, 0.55] }}
      transition={
        reduce ? { duration: 0 } : { duration: 9, ease: "easeInOut", repeat: Infinity }
      }
    />
  );
}
