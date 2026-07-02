"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { ChipTone } from "@/lib/coaching";

// Token-based tones — the old raw amber/emerald tints were dark-only and
// turned into heavy blocks on the light themes.
const toneClass: Record<ChipTone, string> = {
  amber: "bg-surface-2 text-status-over",
  emerald: "bg-surface-2 text-status-in",
  info: "bg-surface-2 text-muted",
};

export function Chip({
  tone,
  children,
}: {
  tone: ChipTone;
  children: React.ReactNode;
}) {
  return (
    <motion.span
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={cn(
        "inline-block rounded-pill px-2.5 py-1 text-xs font-medium",
        toneClass[tone],
      )}
    >
      {children}
    </motion.span>
  );
}
