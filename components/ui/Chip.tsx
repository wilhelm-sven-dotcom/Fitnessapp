"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { ChipTone } from "@/lib/coaching";

const toneClass: Record<ChipTone, string> = {
  amber: "bg-amber-950 text-amber-300",
  emerald: "bg-emerald-950 text-emerald-300",
  info: "bg-neutral-800 text-neutral-300",
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
        "inline-block rounded-lg px-2.5 py-1 text-xs font-medium",
        toneClass[tone],
      )}
    >
      {children}
    </motion.span>
  );
}
