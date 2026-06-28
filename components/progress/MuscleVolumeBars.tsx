"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Card } from "@/components/ui/Card";
import { EASE_OUT } from "@/lib/motion";
import { MUSCLE_LABEL, VOLUME_TARGET, type MuscleVolume } from "@/lib/volume";

const SCALE_MAX = 24;
const HIGHLIGHT = "linear-gradient(180deg, rgba(255,255,255,.22), rgba(255,255,255,0))";
const statusHex: Record<MuscleVolume["status"], string> = {
  under: "#0a84ff",
  in: "#30d158",
  over: "#ff9f0a",
};

export function MuscleVolumeBars({ data }: { data: MuscleVolume[] }) {
  const reduce = useReducedMotion();
  return (
    <Card className="mb-3">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-semibold leading-tight">Wochen-Volumen</h3>
        <span className="text-xs text-muted">
          Sätze · Ziel {VOLUME_TARGET.min}–{VOLUME_TARGET.max}
        </span>
      </div>
      <div className="space-y-2">
        {data.map((m, i) => {
          const hex = statusHex[m.status];
          const pct = Math.min(100, (m.sets / SCALE_MAX) * 100);
          return (
            <div key={m.muscle} className="flex items-center gap-3">
              <span className="w-24 shrink-0 text-xs text-muted">
                {MUSCLE_LABEL[m.muscle]}
              </span>
              <div className="relative h-2.5 flex-1 overflow-hidden rounded-full bg-surface-2">
                <div
                  className="absolute inset-y-0"
                  style={{
                    left: `${(VOLUME_TARGET.min / SCALE_MAX) * 100}%`,
                    width: `${((VOLUME_TARGET.max - VOLUME_TARGET.min) / SCALE_MAX) * 100}%`,
                    backgroundColor: "#2a2a30",
                  }}
                />
                <motion.div
                  className="absolute inset-y-0 left-0 rounded-full"
                  style={{
                    backgroundColor: hex,
                    backgroundImage: HIGHLIGHT,
                    boxShadow: `0 0 8px -2px ${hex}`,
                  }}
                  initial={reduce ? false : { width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.6, delay: i * 0.05, ease: EASE_OUT }}
                />
              </div>
              <span className="w-7 shrink-0 text-right font-mono text-xs tabular-nums text-muted">
                {m.sets}
              </span>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
