"use client";

import { useEffect, useState } from "react";
import {
  lerpPts,
  SB,
  SP,
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

export function FigurePanel({
  label,
  fig,
  viewKey,
  flip,
}: {
  label: string;
  fig: FigureDef;
  viewKey: "side" | "front";
  flip?: boolean;
}) {
  const v = fig[viewKey];
  const [f, setF] = useState(0);

  useEffect(() => {
    if (typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      setF(0);
      return;
    }
    let raf = 0;
    let st = 0;
    const per = 2600;
    const loop = (ts: number) => {
      if (!st) st = ts;
      const ph = ((ts - st) % per) / per;
      setF((1 - Math.cos(ph * 2 * Math.PI)) / 2);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  if (!v) return null;
  const P = lerpPts(v.A, v.B, f);
  const spset = new Set((v.spine || SP).map((s) => s.join(">")));
  const ln = (p: string, q: string) => {
    const a = P[p];
    const b = P[q];
    if (!a || !b) return null;
    const sp = spset.has(p + ">" + q);
    return <line key={p + q} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke={sp ? "#34d399" : "#e5e5e5"} strokeWidth={sp ? 8 : 6} strokeLinecap="round" />;
  };
  const headKey = v.head || "head";
  const inner = (
    <>
      {fig.ground != null && <line x1="18" y1={fig.ground} x2="182" y2={fig.ground} stroke="#404040" strokeWidth="3" strokeLinecap="round" />}
      {(v.static || []).map((s, i) =>
        s.t === "line" ? (
          <line key={"st" + i} x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2} stroke={s.c || "#737373"} strokeWidth={s.w || 3} strokeLinecap="round" />
        ) : (
          <rect key={"st" + i} x={s.x} y={s.y} width={s.w} height={s.h} rx="3" fill="#262626" stroke="#404040" strokeWidth="2" />
        ),
      )}
      {(v.bones || SB).map((bn) => ln(bn[0], bn[1]))}
      {P[headKey] && <circle cx={P[headKey][0]} cy={P[headKey][1]} r="10" fill="#34d399" />}
      <Equip P={P} eq={v.equip} />
    </>
  );
  return (
    <div className="flex-1 min-w-0">
      <svg viewBox={fig.vb || "0 0 200 165"} style={{ display: "block", width: "100%", height: "auto" }}>
        {flip ? <g transform="translate(200,0) scale(-1,1)">{inner}</g> : inner}
      </svg>
      <p className="text-center font-mono text-xs text-muted mt-1">{label}</p>
    </div>
  );
}
