"use client";

import { motion } from "framer-motion";

/**
 * One-shot celebration burst, voiced per skin (mirrors the Splash boots):
 * tactile = amber sparks rising, blueprint = radial measurement ticks,
 * editorial = thin rules wiping across. Deterministic (indexed, no RNG),
 * token-colored only, pointer-transparent. Parents skip rendering it under
 * reduced motion.
 */
export function Burst({ variant }: { variant: "tactile" | "blueprint" | "editorial" }) {
  if (variant === "editorial") {
    return (
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        {[0.28, 0.5, 0.72].map((top, i) => (
          <motion.div
            key={i}
            className="absolute left-0 right-0 origin-left bg-accent-sessions"
            style={{ top: `${top * 100}%`, height: 2 }}
            initial={{ scaleX: 0, opacity: 0.9 }}
            animate={{ scaleX: 1, opacity: 0 }}
            transition={{ duration: 0.9, delay: i * 0.12, ease: [0.22, 1, 0.36, 1] }}
          />
        ))}
      </div>
    );
  }

  const N = 12;
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden"
    >
      {Array.from({ length: N }, (_, i) => {
        const angle = (i / N) * Math.PI * 2;
        if (variant === "blueprint") {
          const dist = 130;
          return (
            <motion.span
              key={i}
              className="absolute bg-accent-sessions"
              style={{ width: 2, height: 14, rotate: `${(angle * 180) / Math.PI + 90}deg` }}
              initial={{ x: 0, y: 0, opacity: 1 }}
              animate={{ x: Math.cos(angle) * dist, y: Math.sin(angle) * dist, opacity: 0 }}
              transition={{ duration: 0.8, delay: 0.1 + i * 0.02, ease: "easeOut" }}
            />
          );
        }
        const dx = (i - N / 2) * 18 + (i % 2 ? 8 : -8);
        return (
          <motion.span
            key={i}
            className="absolute h-1.5 w-1.5 rounded-full bg-accent-sessions"
            initial={{ x: dx * 0.2, y: 50, opacity: 0, scale: 0.6 }}
            animate={{ x: dx, y: -100 - (i % 3) * 26, opacity: [0, 1, 0], scale: 1 }}
            transition={{ duration: 1.1, delay: 0.08 + (i % 5) * 0.07, ease: "easeOut" }}
          />
        );
      })}
    </div>
  );
}
