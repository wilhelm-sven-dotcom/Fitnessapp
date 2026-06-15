"use client";

import { motion } from "framer-motion";

const W = 300;
const H = 56;
const pad = 6;

export function TrendChart({ values }: { values: number[] }) {
  if (!values || values.length === 0) return null;

  if (values.length === 1) {
    return (
      <svg viewBox={`0 0 ${W} ${H}`} style={{ display: "block", width: "100%", height: "auto" }}>
        <circle cx={W / 2} cy={H / 2} r="3.5" fill="#30d158" />
      </svg>
    );
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const n = values.length;
  const x = (i: number) => pad + (i / (n - 1)) * (W - 2 * pad);
  const y = (v: number) => H - pad - ((v - min) / span) * (H - 2 * pad);
  const line = values
    .map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(v).toFixed(1)}`)
    .join(" ");
  const area = `${line} L${x(n - 1).toFixed(1)} ${H - pad} L${x(0).toFixed(1)} ${H - pad} Z`;
  const maxIdx = values.indexOf(max);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ display: "block", width: "100%", height: "auto" }}>
      <motion.path
        d={area}
        fill="#14532d"
        fillOpacity={0.3}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      />
      <motion.path
        d={line}
        fill="none"
        stroke="#30d158"
        strokeWidth={2}
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.9, ease: "easeOut" }}
      />
      <circle cx={x(maxIdx)} cy={y(max)} r="3.5" fill="#30d158" />
      <circle cx={x(n - 1)} cy={y(values[n - 1])} r="3" fill="#e5e5e5" />
    </svg>
  );
}
