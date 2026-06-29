"use client";

import { motion, useReducedMotion } from "framer-motion";

/**
 * The "Living Instrument" ambience: a slow, barely-there accent glow that
 * breathes behind the top of the screen. Uses the `bg-hero-accent` token (the
 * selectable accent's radial sheen) and animates only opacity, so it never
 * shifts layout or causes horizontal scroll. Reduced-motion safe — renders a
 * static glow with no loop.
 */
export function AmbientGlow() {
  const reduce = useReducedMotion();
  return (
    <motion.div
      aria-hidden
      className="pointer-events-none absolute inset-x-0 top-0 -z-10 bg-hero-accent"
      style={{ height: "min(70vh, 580px)" }}
      initial={false}
      animate={reduce ? { opacity: 0.85 } : { opacity: [0.5, 0.95, 0.5] }}
      transition={
        reduce ? { duration: 0 } : { duration: 9, ease: "easeInOut", repeat: Infinity }
      }
    />
  );
}
