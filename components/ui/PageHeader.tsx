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
      {/* Editorial: Tafel-Kopfzeile — Doppellinie mit rotem Diamant, wie die
          Rahmen der Archiv-Tafeln (in den anderen Skins unsichtbar). */}
      <div className="only-editorial mb-2" aria-hidden>
        <div className="flex items-center gap-2">
          <span className="h-px flex-1 bg-fg" />
          <span className="h-1.5 w-1.5 rotate-45" style={{ background: "var(--accent)" }} />
          <span className="h-px flex-1 bg-fg" />
        </div>
        <div className="mt-0.5 h-px w-full bg-line" />
      </div>
      {eyebrow && (
        <p className="mb-1 font-mono text-xs uppercase tracking-widest text-accent-2">
          {eyebrow}
        </p>
      )}
      <h2 className="font-display text-2xl font-semibold tracking-tight text-fg">{title}</h2>
      {subtitle && <p className="page-subtitle mt-1 text-sm text-muted">{subtitle}</p>}
    </motion.div>
  );
}
