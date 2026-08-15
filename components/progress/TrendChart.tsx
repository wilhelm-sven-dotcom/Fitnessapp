"use client";

import { useId, useRef, useState } from "react";
import { fmtDateShort } from "@/lib/format";

const W = 300;
const H = 56;
const pad = 6;
const GRID = "var(--line)"; // theme-aware — the old fixed dark grey vanished on light
const GREEN = "var(--gruen)"; // Fortschritts-Grün (== accent-volume token)

export interface TrendPoint {
  /** ISO-Datum — tragen ALLE Punkte eins, wird die x-Achse zeitproportional. */
  date?: string;
  value: number;
  /** Fertiger Readout-Text („60 × 8", „87,5 kg") — sonst de-DE-Zahl. */
  label?: string;
}

/**
 * Statisches Datenbild — kein Einzeichnen beim Mounten: die Kurve ist
 * Information, keine Choreografie (Frequenz-Regel: wird oft gesehen).
 * v2: x zeitproportional (Trainingslücken werden ehrlich sichtbar; Fallback
 * Index-Achse ohne lückenlose Daten) und Finger-Scrubbing — horizontal ziehen
 * liest Wert + Datum im festen Slot über der Kurve ab; `touch-pan-y` lässt
 * das vertikale Scrollen der Seite in Ruhe.
 */
export function TrendChart({
  points,
  values,
}: {
  points?: TrendPoint[];
  /** Alt-API (nur Werte, Index-Achse) — Aufrufer nutzen `points`. */
  values?: number[];
}) {
  const uid = useId().replace(/:/g, "");
  const wrapRef = useRef<HTMLDivElement>(null);
  const [sel, setSel] = useState<number | null>(null);

  const pts: TrendPoint[] = points ?? (values ?? []).map((v) => ({ value: v }));
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

  const line = xs.map((xx, i) => `${i ? "L" : "M"}${xx.toFixed(1)} ${ys[i].toFixed(1)}`).join(" ");
  const area = `${line} L${xs[n - 1].toFixed(1)} ${H - pad} L${xs[0].toFixed(1)} ${H - pad} Z`;
  const maxIdx = vals.indexOf(max);
  const gradId = `trend-${uid}`;
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
          {n > 1 && (
            <defs>
              <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={GREEN} stopOpacity={0.3} />
                <stop offset="55%" stopColor={GREEN} stopOpacity={0.1} />
                <stop offset="100%" stopColor={GREEN} stopOpacity={0} />
              </linearGradient>
            </defs>
          )}
          {/* Faint reference gridlines. */}
          {rows.map((ry) => (
            <line key={ry} x1={pad} y1={ry} x2={W - pad} y2={ry} stroke={GRID} strokeWidth={1} />
          ))}
          {n > 1 && <path d={area} fill={`url(#${gradId})`} />}
          {n > 1 && (
            <path
              d={line}
              fill="none"
              stroke={GREEN}
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
          )}
          {/* Small dot at every sample point. */}
          {pts.map((_, i) => (
            <circle key={i} cx={xs[i]} cy={ys[i]} r="1.6" fill={GREEN} opacity={0.85} />
          ))}
          {n > 1 && <circle cx={xs[maxIdx]} cy={ys[maxIdx]} r="3.5" fill={GREEN} />}
          <circle cx={xs[n - 1]} cy={ys[n - 1]} r={n > 1 ? 3 : 3.5} fill={n > 1 ? "var(--fg)" : GREEN} />
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
