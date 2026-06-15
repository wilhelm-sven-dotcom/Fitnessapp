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
      <div className="mx-auto m-3 max-w-md rounded-2xl bg-neutral-900 p-3 backdrop-blur">
        <div className="mb-2 flex items-center justify-between">
          <span className="font-mono text-xs uppercase tracking-widest text-amber-400">
            Satzpause
          </span>
          <span className="font-mono text-2xl tabular-nums text-neutral-100">
            {fmtClock(left)}
          </span>
        </div>
        <div className="mb-3 h-1 w-full overflow-hidden rounded-full bg-neutral-800">
          <div
            className="h-full rounded-full bg-amber-400 transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="flex items-center gap-2">
          <Pressable
            onClick={onAdd}
            className="shrink-0 rounded-xl bg-neutral-800 px-3 py-2 text-sm text-neutral-200 focus:outline-none"
          >
            +15 s
          </Pressable>
          <Pressable
            onClick={onSkip}
            className="flex-1 rounded-xl bg-amber-400 px-3 py-2 text-sm font-medium text-neutral-950 focus:outline-none"
          >
            Überspringen
          </Pressable>
        </div>
      </div>
    </motion.div>
  );
}
