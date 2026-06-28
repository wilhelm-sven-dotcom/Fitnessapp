"use client";

import { motion, useReducedMotion } from "framer-motion";
import { EASE_OUT } from "@/lib/motion";

/**
 * Lightweight entrance wrapper: fades + lifts its content in on mount. Stagger a
 * list by passing an increasing `delay` (e.g. index * 0.06). Reduced-motion safe
 * — renders statically when the user prefers reduced motion.
 */
export function Reveal({
  children,
  delay = 0,
  y = 10,
  className,
}: {
  children: React.ReactNode;
  delay?: number;
  y?: number;
  className?: string;
}) {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: EASE_OUT, delay }}
    >
      {children}
    </motion.div>
  );
}
