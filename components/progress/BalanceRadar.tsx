"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { RadarAxis } from "@/lib/balance";

const SIZE = 220;
const C = SIZE / 2;
const R = 74;
const GRID = "#2a2a30";
const GREEN = "#30d158";

export function BalanceRadar({ axes }: { axes: RadarAxis[] }) {
  const reduce = useReducedMotion();
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
      <path d={gridOuter} fill="none" stroke={GRID} strokeWidth={1} />
      <path d={gridMid} fill="none" stroke={GRID} strokeWidth={1} />
      {axes.map((a, i) => {
        const [ex, ey] = pt(i, R);
        const [lx, ly] = pt(i, R + 16);
        return (
          <g key={a.muscle}>
            <line x1={C} y1={C} x2={ex} y2={ey} stroke={GRID} strokeWidth={1} />
            <text
              x={lx}
              y={ly}
              fill="#9ca3af"
              fontSize={8}
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
        fill={GREEN}
        fillOpacity={0.18}
        stroke={GREEN}
        strokeWidth={2}
        strokeLinejoin="round"
        initial={reduce ? false : { pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
      />
      {axes.map((a, i) => {
        const [x, y] = pt(i, R * Math.max(0, Math.min(1, a.value)));
        return <circle key={a.muscle} cx={x} cy={y} r={2.5} fill={GREEN} />;
      })}
    </svg>
  );
}
