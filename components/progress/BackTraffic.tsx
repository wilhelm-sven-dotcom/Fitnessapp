"use client";

import { motion } from "framer-motion";
import { fmtDateShort } from "@/lib/format";
import type { LoggedSession, TrafficLight } from "@/lib/types";

const dotColor: Record<TrafficLight, string> = {
  green: "bg-emerald-400",
  yellow: "bg-amber-400",
  red: "bg-rose-500",
};
const dotLabel: Record<TrafficLight, string> = {
  green: "gut",
  yellow: "mittel",
  red: "gereizt",
};

export function BackTraffic({ log }: { log: LoggedSession[] }) {
  const points = log.filter((s) => s.backTraffic).slice(-16);
  if (!points.length) return null;
  return (
    <div className="mb-3 rounded-2xl bg-neutral-900 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-semibold leading-tight">Rücken</h3>
        <span className="text-xs text-neutral-500">Ampel nach jeder Einheit</span>
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        {points.map((s, i) => (
          <motion.span
            key={s.date + i}
            initial={{ opacity: 0, scale: 0.4 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.04, type: "spring", stiffness: 500, damping: 30 }}
            className={`h-3 w-3 rounded-full ${dotColor[s.backTraffic!]}`}
            title={`${fmtDateShort(s.date)} — ${dotLabel[s.backTraffic!]}`}
          />
        ))}
      </div>
    </div>
  );
}
