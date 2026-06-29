"use client";

import { useEffect, useState } from "react";
import {
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

function Equip({ P, eq }: { P: Frame; eq?: EquipDef }) {
  if (!eq) return null;
  const e: React.ReactNode[] = [];
  const g = (n: string) => P[n];
  if (eq.kind === "db") {
    (eq.hands || []).forEach((h, i) => {
      const p = g(h);
      if (p) e.push(<rect key={"db" + i} x={p[0] - 5} y={p[1] - 9} width="10" height="18" rx="2" fill="#fbbf24" />);
    });
  } else if (eq.kind === "goblet") {
    const hs = (eq.hands || []).map(g).filter(Boolean) as Frame[string][];
    if (hs.length) {
      const cx = hs.reduce((s, p) => s + p[0], 0) / hs.length;
      const cy = hs.reduce((s, p) => s + p[1], 0) / hs.length;
      e.push(<rect key="g" x={cx - 8} y={cy - 8} width="16" height="16" rx="3" fill="#fbbf24" />);
    }
  } else if (eq.kind === "kbHip") {
    const p = g(eq.at || "hip");
    if (p) e.push(<rect key="kb" x={p[0] - 11} y={p[1] - 6} width="22" height="11" rx="3" fill="#fbbf24" />);
  } else if (eq.kind === "band") {
    const t = eq.to ? g(eq.to) : undefined;
    if (t && eq.from) e.push(<line key="bd" x1={eq.from[0]} y1={eq.from[1]} x2={t[0]} y2={t[1]} stroke="#fbbf24" strokeWidth="3" strokeDasharray="6 5" />);
  } else if (eq.kind === "strap") {
    (eq.lines || []).forEach(([from, to], i) => {
      const t = g(to);
      if (t) e.push(<line key={"s" + i} x1={from[0]} y1={from[1]} x2={t[0]} y2={t[1]} stroke="#737373" strokeWidth="3" />);
    });
  }
  return <>{e}</>;
}

/** Limb thickness: torso > thigh/upper-arm > shin/forearm. */
function boneWidth([a, b]: Bone): number {
  if (a === "sh" && b === "hip") return 18;
  if (a.startsWith("elbow") || a.startsWith("knee")) return 10;
  return 13;
}

/**
 * Animated body figure (filled "capsule" limbs over the shared pose engine).
 * `accentBones` (keys "a>b") tints the worked muscles in the skin accent;
 * the spine stays green as a neutral-back cue. Colours are tokens, so the
 * figure adapts to skin + theme. prefers-reduced-motion freezes on pose 0.
 */
export function FigurePanel({
  label,
  fig,
  viewKey,
  flip,
  accentBones,
  freeze,
}: {
  label: string;
  fig: FigureDef;
  viewKey: "side" | "front";
  flip?: boolean;
  accentBones?: Set<string>;
  /** Render one static phase (0..1) instead of looping — for the 3-pose filmstrip. */
  freeze?: number;
}) {
  const v = fig[viewKey];
  const [animF, setAnimF] = useState(0);
  const f = freeze ?? animF;

  useEffect(() => {
    if (freeze != null) return; // static pose (filmstrip) — no animation loop
    if (typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      setAnimF(0);
      return;
    }
    let raf = 0;
    let st = 0;
    const per = 2600;
    const loop = (ts: number) => {
      if (!st) st = ts;
      const ph = ((ts - st) % per) / per;
      setAnimF((1 - Math.cos(ph * 2 * Math.PI)) / 2);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [freeze]);

  if (!v) return null;
  const frames = framesOf(v);
  if (!frames.length) return null;
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

  const inner = (
    <>
      {fig.ground != null && <line x1="18" y1={fig.ground} x2="182" y2={fig.ground} stroke="var(--line)" strokeWidth="3" strokeLinecap="round" />}
      {(v.static || []).map((s, idx) =>
        s.t === "line" ? (
          <line key={"st" + idx} x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2} stroke={s.c || "#737373"} strokeWidth={s.w || 3} strokeLinecap="round" />
        ) : (
          <rect key={"st" + idx} x={s.x} y={s.y} width={s.w} height={s.h} rx="3" fill="var(--surface-2)" stroke="var(--line)" strokeWidth="2" />
        ),
      )}
      {/* Outlines first (card colour) so overlapping limbs read separately. */}
      {bones.map((bn) => cap(bn, boneWidth(bn) + 6, "var(--base)", "o" + bn[0] + bn[1]))}
      {/* Body fills — worked muscles in the accent, else the figure colour. */}
      {bones.map((bn) =>
        cap(bn, boneWidth(bn), accentBones?.has(bn[0] + ">" + bn[1]) ? "var(--accent)" : "var(--fg)", "f" + bn[0] + bn[1]),
      )}
      {/* Neutral-spine cue. */}
      {spine.map((sp, idx) => cap(sp, 3.5, "#34d399", "sp" + idx))}
      {P[headKey] && (
        <>
          <circle cx={P[headKey][0]} cy={P[headKey][1]} r="12" fill="var(--base)" />
          <circle cx={P[headKey][0]} cy={P[headKey][1]} r="10.5" fill="var(--fg)" />
        </>
      )}
      <Equip P={P} eq={v.equip} />
    </>
  );

  return (
    <div className="min-w-0 flex-1">
      <svg viewBox={fig.vb || "0 0 200 165"} style={{ display: "block", width: "100%", height: "auto" }}>
        {flip ? <g transform="translate(200,0) scale(-1,1)">{inner}</g> : inner}
      </svg>
      <p className="mt-1 text-center font-mono text-xs text-muted">{label}</p>
    </div>
  );
}
