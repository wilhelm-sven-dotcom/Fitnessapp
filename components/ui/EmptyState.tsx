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
      {/* Standard-Kachel (Blueprint/Tactile): Akzent-Glow. */}
      <div className="not-editorial relative mb-5 flex h-16 w-16 items-center justify-center">
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
      {/* Editorial: Mini-Tafel wie im Daumenkino — Papier, Doppelrahmen, Tinte.
          Bewusst festes Papier/Tinte (Kunstobjekt, wie die Boot-Tafeln). */}
      <div className="only-editorial relative mb-5" aria-hidden>
        <div style={{ background: "#EFE8D6", border: "1.5px solid #29231B", padding: 5, width: 96 }}>
          <div
            style={{
              border: "0.5px solid #29231B",
              padding: "20px 0 16px",
              display: "flex",
              justifyContent: "center",
            }}
          >
            <Icon size={30} style={{ color: "#29231B" }} />
          </div>
        </div>
        <span
          style={{
            position: "absolute",
            top: 8,
            right: 10,
            fontFamily: "var(--font-newsreader), Georgia, serif",
            fontStyle: "italic",
            fontSize: 10,
            color: "#8A7D66",
          }}
        >
          Taf.
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
