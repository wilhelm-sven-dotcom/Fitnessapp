"use client";

import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

/**
 * Lade-Platzhalter. Default STATISCH (der App-Boot dauert Millisekunden —
 * ein Puls wäre Flacker-Theater); `pulse` nur dort, wo echte Wartezeit
 * entsteht (z. B. Workout-Resume). Container trägt `aria-busy`.
 */
export function Skeleton({
  className,
  pulse = false,
}: {
  className?: string;
  pulse?: boolean;
}) {
  const reduce = useReducedMotion();
  const animated = pulse && !reduce;
  return (
    <motion.div
      aria-hidden
      className={cn("rounded-card bg-surface-2", className)}
      style={{ opacity: 0.6 }}
      animate={animated ? { opacity: [0.45, 0.75, 0.45] } : undefined}
      transition={animated ? { duration: 1.6, repeat: Infinity, ease: "easeInOut" } : undefined}
    />
  );
}
