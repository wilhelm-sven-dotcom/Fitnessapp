"use client";

import { useRef, useState } from "react";
import { fmtDateShort } from "@/lib/format";

const W = 300;
const H = 56;
const pad = 6;
const GRID = "var(--line-card)"; // Faden auf der Kartenfläche
const LINIE = "var(--cyanotypie)"; // Messkurven sprechen Cyanotypie

export interface TrendPoint {
  /** ISO-Datum — tragen ALLE Punkte eins, wird die x-Achse zeitproportional. */
  date?: string;
  value: number;
  /** Fertiger Readout-Text („60 × 8", „87,5 kg") — sonst de-DE-Zahl. */
  label?: string;
}

/**
 * Statisches Datenbild „Platte 311": der Befund liegt vor, er tritt nicht
 * auf (Motion-Handoff: Chart-Einstieg bewusst statisch). Kurvenform =
 * TREPPENSTUFEN (step-after, H/V-Segmente — nie interpolierte Kurven: eine
 * Messung gilt, bis die nächste sie ablöst), Endpunkt als Kreis.
 * x zeitproportional (Trainingslücken ehrlich sichtbar; Fallback Index);
 * mehrere Messungen desselben Tages verschmelzen zur letzten (Dedupe —
 * sonst stapeln sich Stufen auf einer Senkrechten). Finger-Scrubbing liest
 * Wert + Datum im festen Slot ab; `touch-pan-y` lässt das Scrollen in Ruhe.
 */
export function TrendChart({
  points,
  values,
}: {
  points?: TrendPoint[];
  /** Alt-API (nur Werte, Index-Achse) — Aufrufer nutzen `points`. */
  values?: number[];
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [sel, setSel] = useState<number | null>(null);

  const roh: TrendPoint[] = points ?? (values ?? []).map((v) => ({ value: v }));
  // Tages-Dedupe: gleicher Kalendertag → die letzte Messung zählt.
  const pts: TrendPoint[] = [];
  for (const p of roh) {
    const prev = pts[pts.length - 1];
    if (p.date && prev?.date && p.date.slice(0, 10) === prev.date.slice(0, 10)) {
      pts[pts.length - 1] = p;
    } else {
      pts.push(p);
    }
  }
  const n = pts.length;
  if (n === 0) return null;

  const vals = pts.map((p) => p.value);
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const span = max - min || 1;

  // Zeitachse nur mit vollständigen, aufsteigenden Daten — sonst Index-Achse.
  const ts = pts.map((p) => (p.date ? new Date(p.date).getTime() : NaN));
  const timeOk =
    n > 1 &&
    ts.every((t) => Number.isFinite(t)) &&
    ts.every((t, i) => i === 0 || t >= ts[i - 1]) &&
    ts[n - 1] > ts[0];
  const xs = pts.map((_, i) => {
    if (n === 1) return W / 2;
    const f = timeOk ? (ts[i] - ts[0]) / (ts[n - 1] - ts[0]) : i / (n - 1);
    return pad + f * (W - 2 * pad);
  });
  const ys = vals.map((v) =>
    n === 1 ? H / 2 : H - pad - ((v - min) / span) * (H - 2 * pad),
  );

  // Treppenpfad: waagerecht bis zur nächsten Messung, dann senkrecht.
  const line = xs
    .map((xx, i) =>
      i === 0
        ? `M${xx.toFixed(1)} ${ys[0].toFixed(1)}`
        : `H${xx.toFixed(1)} V${ys[i].toFixed(1)}`,
    )
    .join(" ");
  const rows = [pad, H / 2, H - pad];

  // Scrub: nächstliegender Punkt zur Finger-x (Zeitachse kann clustern).
  const pick = (clientX: number) => {
    const el = wrapRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    if (r.width <= 0) return;
    const px = ((clientX - r.left) / r.width) * W;
    let best = 0;
    let dist = Infinity;
    xs.forEach((xx, i) => {
      const d = Math.abs(xx - px);
      if (d < dist) {
        dist = d;
        best = i;
      }
    });
    setSel(best);
  };

  const selPt = sel != null ? pts[Math.min(sel, n - 1)] : null;
  const fmtVal = (v: number) => v.toLocaleString("de-DE", { maximumFractionDigits: 1 });

  return (
    <div>
      {/* Fester Readout-Slot: Höhe reserviert, damit der erste Scrub das
          Layout unterm Finger nicht verschiebt. */}
      <div className="flex h-4 items-baseline justify-between gap-2 font-mono text-xs tabular-nums text-muted">
        {selPt && (
          <>
            <span className="min-w-0 truncate text-fg">{selPt.label ?? fmtVal(selPt.value)}</span>
            {selPt.date && <span className="shrink-0">{fmtDateShort(selPt.date)}</span>}
          </>
        )}
      </div>
      <div
        ref={wrapRef}
        className="touch-pan-y select-none"
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          pick(e.clientX);
        }}
        onPointerMove={(e) => {
          if (e.buttons > 0) pick(e.clientX);
        }}
      >
        <svg
          viewBox={`0 0 ${W} ${H}`}
          style={{ display: "block", width: "100%", height: "auto" }}
          aria-hidden
        >
          {/* Faint reference gridlines. */}
          {rows.map((ry) => (
            <line key={ry} x1={pad} y1={ry} x2={W - pad} y2={ry} stroke={GRID} strokeWidth={1} />
          ))}
          {n > 1 && (
            <path
              d={line}
              fill="none"
              stroke={LINIE}
              strokeWidth={2}
              strokeLinejoin="miter"
              strokeLinecap="butt"
              vectorEffect="non-scaling-stroke"
            />
          )}
          {/* Endpunkt-Kreis: der aktuelle Messwert. */}
          <circle cx={xs[n - 1]} cy={ys[n - 1]} r={3.5} fill={LINIE} />
          {/* Scrub-Marker: leise Senkrechte + Ring am gewählten Sample. */}
          {sel != null && (
            <>
              <line
                x1={xs[sel]}
                y1={pad}
                x2={xs[sel]}
                y2={H - pad}
                stroke="var(--fg)"
                strokeWidth={1}
                opacity={0.35}
              />
              <circle
                cx={xs[sel]}
                cy={ys[sel]}
                r="3.5"
                fill="none"
                stroke="var(--fg)"
                strokeWidth={1.5}
              />
            </>
          )}
        </svg>
      </div>
    </div>
  );
}
