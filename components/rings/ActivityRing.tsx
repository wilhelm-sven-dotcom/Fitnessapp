"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useId } from "react";
import { EASE_OUT } from "@/lib/motion";
import { RING_TRACK } from "@/lib/ring-colors";

/** Mix a hex color toward white for the gradient's bright end. */
function lighten(hex: string, amt = 0.4): string {
  if (!hex.startsWith("#") || hex.length < 7) return hex;
  const n = parseInt(hex.slice(1, 7), 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  const mix = (c: number) => Math.round(c + (255 - c) * amt);
  return `rgb(${mix(r)}, ${mix(g)}, ${mix(b)})`;
}

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
  const uid = useId().replace(/:/g, "");
  const r = (size - stroke) / 2;
  const c = size / 2;
  const p = Math.max(0, Math.min(1, progress));
  const gradId = `ringgrad-${uid}`;
  const glowId = `ringglow-${uid}`;
  const anim = {
    initial: { pathLength: reduce ? p : 0 },
    animate: { pathLength: p },
    transition: reduce ? { duration: 0 } : { duration: 0.9, ease: EASE_OUT, delay },
  };
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ display: "block" }}>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={lighten(color)} />
          <stop offset="100%" stopColor={color} />
        </linearGradient>
        <filter id={glowId} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation={Math.max(1.5, stroke * 0.35)} />
        </filter>
      </defs>
      <g transform={`rotate(-90 ${c} ${c})`}>
        <circle cx={c} cy={c} r={r} fill="none" stroke={trackColor} strokeWidth={stroke} />
        {p > 0 && (
          <motion.circle
            cx={c}
            cy={c}
            r={r}
            fill="none"
            stroke={color}
            strokeWidth={stroke}
            strokeLinecap={rounded ? "round" : "butt"}
            filter={`url(#${glowId})`}
            opacity={0.55}
            {...anim}
          />
        )}
        <motion.circle
          cx={c}
          cy={c}
          r={r}
          fill="none"
          stroke={`url(#${gradId})`}
          strokeWidth={stroke}
          strokeLinecap={rounded ? "round" : "butt"}
          {...anim}
        />
      </g>
    </svg>
  );
}
