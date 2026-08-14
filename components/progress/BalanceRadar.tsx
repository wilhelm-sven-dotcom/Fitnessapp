"use client";

import { useState } from "react";
import type { RadarAxis } from "@/lib/balance";
import type { Muscle } from "@/lib/types";

const SIZE = 220;
const C = SIZE / 2;
const R = 92; // Netz füllt die viewBox — Labels sitzen bei R+12
const GRID = "var(--line)";
const GREEN = "var(--gruen)"; // Fortschritts-Grün, theme-korrekt in hell & dunkel

/** Zahl ohne unnötige Dezimale, de-DE (7.5 → „7,5", 3 → „3"). */
const fmt = (n: number) =>
  n.toLocaleString("de-DE", { maximumFractionDigits: 1 });

/**
 * Muskel-Balance-Radar. Statisches Datenbild (keine Mount-Choreografie),
 * flache Füllung statt Verlauf/Glow. Jede Achse ist antippbar (44-px-Hitbox)
 * und meldet die Auswahl nach oben — das Scoreboard der Karte zeigt Details.
 * Außenrand = oberes Wochenziel JE Muskel, gestricheltes Polygon = unteres
 * Ziel; die Wurzel-Skala macht reale Wochenwerte (wenige Sätze) sichtbar.
 */
export function BalanceRadar({
  axes,
  ghost,
  selected,
  onSelect,
}: {
  axes: RadarAxis[];
  /** Vorwoche als gestrichelte Kontur (gleiche Achsen-Reihenfolge). */
  ghost?: RadarAxis[];
  selected?: Muscle | null;
  onSelect?: (m: Muscle | null) => void;
}) {
  const [focused, setFocused] = useState<Muscle | null>(null);
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
  // Unteres Ziel je Achse — mit Wurzel-Skala ein Polygon, kein Kreisring.
  const gridMin = polygon((i) =>
    axes[i].target.max > 0 ? Math.sqrt(axes[i].target.min / axes[i].target.max) : 0,
  );
  const cap = Math.sqrt(1.15); // Skalen-Deckel — „über Ziel" ragt bis hierher
  const data = polygon((i) => Math.min(cap, Math.max(0, axes[i].value)));
  const ghostPath =
    ghost && ghost.length === n
      ? polygon((i) => Math.min(cap, Math.max(0, ghost[i].value)))
      : null;

  const toggle = (m: Muscle) => onSelect?.(selected === m ? null : m);

  return (
    <svg
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      className="mx-auto w-full max-w-sm"
      role="group"
      aria-label="Muskel-Balance-Radar — Achsen antippbar"
    >
      <path d={gridOuter} fill="none" stroke={GRID} strokeWidth={1} />
      {/* Gestrichelt = unteres Wochenziel je Muskel. */}
      <path d={gridMin} fill="none" stroke={GRID} strokeWidth={1} strokeDasharray="2 3" />
      {axes.map((a, i) => {
        const [ex, ey] = pt(i, R);
        const [lx, ly] = pt(i, R + 12);
        const active = selected === a.muscle;
        return (
          <g key={a.muscle}>
            <line x1={C} y1={C} x2={ex} y2={ey} stroke={GRID} strokeWidth={1} />
            <text
              x={lx}
              y={ly}
              fill={active ? "var(--fg)" : "var(--faint)"}
              fontSize={10}
              fontWeight={active ? 600 : 400}
              className="font-mono"
              textAnchor="middle"
              dominantBaseline="middle"
            >
              {a.short}
            </text>
          </g>
        );
      })}
      {/* Vorwoche als ruhige Kontur hinter den aktuellen Daten. */}
      {ghostPath && (
        <path
          d={ghostPath}
          fill="none"
          stroke="var(--muted)"
          strokeWidth={1}
          strokeDasharray="3 3"
          strokeLinejoin="round"
        />
      )}
      <path
        d={data}
        fill={GREEN}
        fillOpacity={0.12}
        stroke={GREEN}
        strokeWidth={2}
        strokeLinejoin="round"
      />
      {axes.map((a, i) => {
        const frac = Math.min(cap, Math.max(0, a.value));
        const [x, y] = pt(i, R * frac);
        const active = selected === a.muscle;
        return (
          <circle
            key={a.muscle}
            cx={x}
            cy={y}
            r={active ? 4.5 : 3}
            fill={GREEN}
            stroke={active ? "var(--fg)" : "none"}
            strokeWidth={active ? 1 : 0}
          />
        );
      })}
      {/* 44-px-Hitboxen + Fokus-Ring an den Achsen-Enden (über allem). */}
      {onSelect &&
        axes.map((a, i) => {
          const [lx, ly] = pt(i, R + 8);
          return (
            <g key={`hit-${a.muscle}`}>
              {focused === a.muscle && (
                <circle cx={lx} cy={ly} r={19} fill="none" stroke="var(--accent)" strokeWidth={2} />
              )}
              <circle
                cx={lx}
                cy={ly}
                r={22}
                fill="transparent"
                role="button"
                tabIndex={0}
                aria-pressed={selected === a.muscle}
                aria-label={`${a.label}: ${fmt(a.sets)} von ${a.target.min}–${a.target.max} Sätzen`}
                style={{ cursor: "pointer", outline: "none" }}
                onClick={() => toggle(a.muscle)}
                onFocus={() => setFocused(a.muscle)}
                onBlur={() => setFocused(null)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    toggle(a.muscle);
                  }
                }}
              />
            </g>
          );
        })}
    </svg>
  );
}
