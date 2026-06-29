"use client";

import { motion } from "framer-motion";
import { Pressable } from "@/components/ui/pressable";
import { fmtClock } from "@/lib/format";

export function RestTimer({
  left,
  total,
  onAdd,
  onSkip,
}: {
  left: number;
  total: number;
  onAdd: () => void;
  onSkip: () => void;
}) {
  const pct = Math.min(100, (left / (total || 1)) * 100);
  return (
    <motion.div
      className="fixed inset-x-0 bottom-0 z-40"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      initial={{ y: 90, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 90, opacity: 0 }}
      transition={{ type: "spring", stiffness: 380, damping: 34 }}
    >
      <div className="mx-auto m-3 max-w-md rounded-card border border-surface-3 bg-surface-1 shadow-card p-4 backdrop-blur">
        <div className="mb-2 flex items-end justify-between">
          <span className="font-mono text-xs uppercase tracking-widest text-accent-sessions">
            Satzpause
          </span>
          <span className="font-display text-4xl font-semibold leading-none tabular-nums text-fg">
            {fmtClock(left)}
          </span>
        </div>
        <div className="mb-3 h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
          <div
            className="h-full rounded-full bg-accent-sessions transition-all"
            style={{ width: `${pct}%`, boxShadow: "0 0 10px -1px var(--accent)" }}
          />
        </div>
        <div className="flex items-center gap-2">
          <Pressable
            onClick={onAdd}
            className="shrink-0 rounded-xl bg-surface-2 px-3 py-2 text-sm text-fg focus:outline-none"
          >
            +15 s
          </Pressable>
          <Pressable
            onClick={onSkip}
            className="flex-1 rounded-xl bg-accent-sessions px-3 py-2 text-sm font-medium text-on-strong focus:outline-none"
          >
            Überspringen
          </Pressable>
        </div>
      </div>
    </motion.div>
  );
}
