"use client";

import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { EASE_OUT } from "@/lib/motion";

/**
 * Branded empty / not-configured state: an accent-glowing icon, a title, an
 * optional description and an optional call-to-action. Replaces the bare
 * "Noch nichts…" cards so first impressions feel intentional.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: EASE_OUT }}
      className="flex flex-col items-center px-6 py-12 text-center"
    >
      <div className="relative mb-5 flex h-16 w-16 items-center justify-center">
        <span
          className="absolute inset-0 rounded-full"
          style={{
            background: "radial-gradient(circle, var(--accent) 0%, rgba(0,0,0,0) 70%)",
            opacity: 0.22,
          }}
        />
        <span className="flex h-16 w-16 items-center justify-center rounded-card border border-surface-3 bg-surface-2">
          <Icon size={28} style={{ color: "var(--accent)" }} />
        </span>
      </div>
      <h3 className="font-display text-lg font-semibold tracking-tight text-fg">{title}</h3>
      {description && (
        <p className="mt-2 max-w-xs text-sm leading-relaxed text-muted">{description}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </motion.div>
  );
}
