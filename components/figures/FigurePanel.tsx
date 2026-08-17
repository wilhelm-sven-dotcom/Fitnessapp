"use client";

import { useEffect, useRef, useState } from "react";
import {
  boneWidth,
  frameAt,
  framesOf,
  lerpPts,
  SB,
  SP,
  type Bone,
  type EquipDef,
  type FigureDef,
  type Frame,
} from "./figureData";

function Equip({ P, eq, color }: { P: Frame; eq?: EquipDef; color: string }) {
  if (!eq) return null;
  const e: React.ReactNode[] = [];
  const g = (n: string) => P[n];
  if (eq.kind === "db") {
    (eq.hands || []).forEach((h, i) => {
      const p = g(h);
      if (p) e.push(<rect key={"db" + i} x={p[0] - 5} y={p[1] - 9} width="10" height="18" rx="2" fill={color} />);
    });
  } else if (eq.kind === "band") {
    const t = eq.to ? g(eq.to) : undefined;
    if (t && eq.from) e.push(<line key="bd" x1={eq.from[0]} y1={eq.from[1]} x2={t[0]} y2={t[1]} stroke={color} strokeWidth="3" strokeDasharray="6 5" />);
  } else if (eq.kind === "band2") {
    // Band zwischen BEIDEN Händen (z. B. Pull-Apart) — spannt sich mit.
    const [h1, h2] = (eq.hands || []).map(g);
    if (h1 && h2) e.push(<line key="b2" x1={h1[0]} y1={h1[1]} x2={h2[0]} y2={h2[1]} stroke={color} strokeWidth="3" strokeDasharray="6 5" />);
  }
  return <>{e}</>;
}

/** Fadenraster der Aufwärm-Bühne — 200×165-Zeichenfläche, Teilung 20. */
const RASTER_200 =
  "M20 0V165M40 0V165M60 0V165M80 0V165M100 0V165M120 0V165M140 0V165M160 0V165M180 0V165" +
  "M0 20H200M0 40H200M0 60H200M0 80H200M0 100H200M0 120H200M0 140H200M0 160H200";

/**
 * Animated body figure (filled "capsule" limbs over the shared pose engine).
 * Konsumenten: Muskel-Heatmap (frozen + boneTint) und Aufwärm-Player (Loop mit
 * `periodMs` je Drill). Colours are tokens, so the figure adapts to skin +
 * theme. prefers-reduced-motion freezes on pose 0 (= charakteristische Pose).
 */
export function FigurePanel({
  label,
  fig,
  viewKey,
  boneTint,
  freeze,
  periodMs,
  color = "var(--fg)",
  raster = false,
}: {
  label: string;
  fig: FigureDef;
  viewKey: "side" | "front";
  /** Per-bone colour override ("a>b" → CSS colour) — the muscle heatmap tint.
   *  Unlisted bones keep the figure colour. */
  boneTint?: Record<string, string>;
  /** Render one static phase (0..1) instead of looping. */
  freeze?: number;
  /** Loop-Tempo in ms je Zyklus (Drill-Semantik) — Default 2600. */
  periodMs?: number;
  /** DIE eine Farbe der Figur (Platte 311, Regel 6) — Tinte oder Siegellack. */
  color?: string;
  /** Fadenraster hinterlegen (Aufwärm-Bühne). */
  raster?: boolean;
}) {
  const v = fig[viewKey];
  const [animF, setAnimF] = useState(0);
  const f = freeze ?? animF;

  // Pause the rAF loop while scrolled offscreen — a looping figure otherwise
  // burns ~60 state updates/s for something nobody sees (Warmup-Player, Sheets).
  const svgRef = useRef<SVGSVGElement>(null);
  const [inView, setInView] = useState(true);
  useEffect(() => {
    const el = svgRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const obs = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      { rootMargin: "80px" },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const cycle = !!fig.cycle;
  useEffect(() => {
    if (freeze != null) return; // static pose — no animation loop
    if (!inView) return; // offscreen — loop paused, resumes on re-entry
    if (typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      setAnimF(0);
      return;
    }
    let raf = 0;
    let st = 0;
    const per = periodMs ?? 2600;
    const loop = (ts: number) => {
      if (!st) st = ts;
      const ph = ((ts - st) % per) / per;
      // cycle = geschlossener Kreis (Sägezahn), sonst Ping-Pong (Cosinus).
      setAnimF(cycle ? ph : (1 - Math.cos(ph * 2 * Math.PI)) / 2);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [freeze, inView, periodMs, cycle]);

  if (!v) return null;
  const base = framesOf(v);
  if (!base.length) return null;
  // Kreis-Loop: letzten→ersten Frame nahtlos interpolieren.
  const frames = cycle && base.length > 1 ? [...base, base[0]] : base;
  const { i, next, t } = frameAt(frames.length, f);
  const P = lerpPts(frames[i], frames[next], t);
  const bones = v.bones || SB;
  const spine = v.spine || SP;
  const headKey = v.head || "head";

  const cap = (bn: Bone, w: number, color: string, k: string) => {
    const a = P[bn[0]];
    const b = P[bn[1]];
    if (!a || !b) return null;
    return (
      <line key={k} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke={color} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" />
    );
  };

  return (
    <div className="min-w-0 flex-1">
      <svg ref={svgRef} viewBox={fig.vb || "0 0 200 165"} style={{ display: "block", width: "100%", height: "auto" }}>
        {/* Kein Boden mehr — die Figur steht auf dem Faden-Raster (optional). */}
        {raster && <path d={RASTER_200} stroke="var(--line-card)" strokeWidth="0.6" fill="none" />}
        {(v.static || []).map((s, idx) =>
          s.t === "line" ? (
            <line key={"st" + idx} x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2} stroke={s.c || color} strokeWidth={s.w || 3} strokeLinecap="round" />
          ) : (
            <rect key={"st" + idx} x={s.x} y={s.y} width={s.w} height={s.h} rx="3" fill="none" stroke={color} strokeWidth="2" />
          ),
        )}
        {/* Outlines first (Grund-Farbe) so overlapping limbs read separately. */}
        {bones.map((bn) => cap(bn, boneWidth(bn) + 6, "var(--base)", "o" + bn[0] + bn[1]))}
        {/* Body fills — heatmap tint wins, else DIE eine Figur-Farbe. */}
        {bones.map((bn) =>
          cap(bn, boneWidth(bn), boneTint?.[bn[0] + ">" + bn[1]] ?? color, "f" + bn[0] + bn[1]),
        )}
        {/* Rücken-Naht als Hairline — EINE Figur-Farbe (Platte 311), das alte
            Grün-Cue entfällt; in der Heatmap (boneTint) galt das schon immer. */}
        {spine.map((sp, idx) => cap(sp, 3.5, "var(--line)", "sp" + idx))}
        {P[headKey] && (
          <>
            <circle cx={P[headKey][0]} cy={P[headKey][1]} r="12" fill="var(--base)" />
            <circle cx={P[headKey][0]} cy={P[headKey][1]} r="10.5" fill={color} />
          </>
        )}
        <Equip P={P} eq={v.equip} color={color} />
      </svg>
      <p className="mt-1 text-center font-mono text-xs text-muted">{label}</p>
    </div>
  );
}
