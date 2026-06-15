"use client";

import { motion, useReducedMotion } from "framer-motion";
import { EASE_OUT } from "@/lib/motion";
import { RING_TRACK } from "@/lib/ring-colors";

export function ActivityRing({
  progress,
  color,
  size,
  stroke,
  trackColor = RING_TRACK,
  delay = 0,
  rounded = true,
}: {
  progress: number;
  color: string;
  size: number;
  stroke: number;
  trackColor?: string;
  delay?: number;
  rounded?: boolean;
}) {
  const reduce = useReducedMotion();
  const r = (size - stroke) / 2;
  const c = size / 2;
  const p = Math.max(0, Math.min(1, progress));
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ display: "block" }}>
      <g transform={`rotate(-90 ${c} ${c})`}>
        <circle cx={c} cy={c} r={r} fill="none" stroke={trackColor} strokeWidth={stroke} />
        <motion.circle
          cx={c}
          cy={c}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap={rounded ? "round" : "butt"}
          initial={{ pathLength: reduce ? p : 0 }}
          animate={{ pathLength: p }}
          transition={reduce ? { duration: 0 } : { duration: 0.9, ease: EASE_OUT, delay }}
        />
      </g>
    </svg>
  );
}
