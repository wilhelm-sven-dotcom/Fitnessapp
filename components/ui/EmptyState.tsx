"use client";

import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { PLATE_INK, PlateFrame } from "@/components/flipbook/PlateFrame";
import { EASE_OUT } from "@/lib/motion";

/**
 * Branded empty / not-configured state: eine kleine Tafel im Stil des
 * Daumenkinos (Papier, Doppelrahmen, „Taf."-Ecke) mit dem Icon in Tinte —
 * die „eingeklebte Karte" gilt in allen drei Skins. Dazu Titel, optionale
 * Beschreibung und Call-to-Action.
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
      <PlateFrame mark="Taf." className="mb-5 w-24" aria-hidden>
        <div className="flex justify-center" style={{ padding: "20px 0 16px" }}>
          <Icon size={30} style={{ color: PLATE_INK }} />
        </div>
      </PlateFrame>
      <h3 className="font-display text-lg font-semibold tracking-tight text-fg">{title}</h3>
      {description && (
        <p className="mt-2 max-w-xs text-sm leading-relaxed text-muted">{description}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </motion.div>
  );
}
