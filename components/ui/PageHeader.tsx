"use client";

import { motion } from "framer-motion";
import { EASE_OUT } from "@/lib/motion";

/**
 * Consistent, animated page header: an optional accent eyebrow, a display-font
 * title and an optional subtitle. Slides in on mount for a premium feel.
 */
export function PageHeader({
  title,
  eyebrow,
  subtitle,
}: {
  title: string;
  eyebrow?: string;
  subtitle?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: EASE_OUT }}
      className="mb-5"
    >
      {eyebrow && (
        <p className="mb-1 font-mono text-xs uppercase tracking-widest text-accent-2">
          {eyebrow}
        </p>
      )}
      <h2 className="font-display text-2xl font-semibold tracking-tight text-fg">{title}</h2>
      {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
    </motion.div>
  );
}
