"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useId } from "react";
import type { RadarAxis } from "@/lib/balance";

const SIZE = 220;
const C = SIZE / 2;
const R = 74;
const GRID = "#2a2a30";
const GREEN = "#30d158";

export function BalanceRadar({ axes }: { axes: RadarAxis[] }) {
  const reduce = useReducedMotion();
  const uid = useId().replace(/:/g, "");
  const fillId = `radar-${uid}`;
  const n = axes.length;
  if (n < 3) return null;

  const angle = (i: number) => (-90 + (360 / n) * i) * (Math.PI / 180);
  const pt = (i: number, r: number): [number, number] => [
    C + r * Math.cos(angle(i)),
    C + r * Math.sin(angle(i)),
  ];
  const polygon = (frac: (i: number) => number) =>
    axes
      .map((_, i) => {
        const [x, y] = pt(i, R * frac(i));
        return `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`;
      })
      .join(" ") + " Z";

  const gridOuter = polygon(() => 1);
  const gridMid = polygon(() => 0.5); // = the 10-set minimum target
  const data = polygon((i) => Math.max(0, Math.min(1, axes[i].value)));

  return (
    <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="mx-auto w-full max-w-xs">
      <defs>
        <radialGradient id={fillId} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#30d158" stopOpacity={0.4} />
          <stop offset="100%" stopColor="#30d158" stopOpacity={0.08} />
        </radialGradient>
      </defs>
      <path d={gridOuter} fill="none" stroke={GRID} strokeWidth={1} />
      {/* Dashed ring marks the minimum target (10 sets). */}
      <path d={gridMid} fill="none" stroke="#3a3a44" strokeWidth={1} strokeDasharray="2 3" />
      {axes.map((a, i) => {
        const [ex, ey] = pt(i, R);
        const [lx, ly] = pt(i, R + 16);
        return (
          <g key={a.muscle}>
            <line x1={C} y1={C} x2={ex} y2={ey} stroke={GRID} strokeWidth={1} />
            <text
              x={lx}
              y={ly}
              fill="#a1a1aa"
              fontSize={9}
              textAnchor="middle"
              dominantBaseline="middle"
            >
              {a.short}
            </text>
          </g>
        );
      })}
      <motion.path
        d={data}
        fill={`url(#${fillId})`}
        stroke={GREEN}
        strokeWidth={2}
        strokeLinejoin="round"
        style={{ filter: "drop-shadow(0 0 6px rgba(48,209,88,.4))" }}
        initial={reduce ? false : { pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
      />
      {axes.map((a, i) => {
        const [x, y] = pt(i, R * Math.max(0, Math.min(1, a.value)));
        return <circle key={a.muscle} cx={x} cy={y} r={3} fill={GREEN} />;
      })}
    </svg>
  );
}
