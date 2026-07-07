"use client";

import { useRef, useState } from "react";
import { PhotoImg } from "@/components/progress/PhotoImg";

/**
 * Vorher/Nachher-Vergleich: das Nachher-Bild liegt unten, das Vorher-Bild
 * darüber und wird per clip-path am Schieber beschnitten. Gesteuert über
 * Pointer-Events direkt auf der Fläche (Tippen ODER Ziehen setzt die
 * Trennlinie) — kein rAF-Dauerlauf, keine Bibliothek. 3:4-Rahmen über den
 * padding-Trick (dynamischer Wert → inline style, gemäß ui-style).
 */
export function BeforeAfter({
  beforeId,
  afterId,
  beforeLabel,
  afterLabel,
}: {
  beforeId: string;
  afterId: string;
  beforeLabel: string;
  afterLabel: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [pct, setPct] = useState(50);

  const setFromClientX = (clientX: number) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const p = ((clientX - r.left) / r.width) * 100;
    setPct(Math.min(96, Math.max(4, p)));
  };

  return (
    <div
      ref={ref}
      className="relative w-full touch-none select-none overflow-hidden rounded-card border border-line bg-surface-2 shadow-card"
      style={{ paddingTop: "125%" }}
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        setFromClientX(e.clientX);
      }}
      onPointerMove={(e) => {
        if (e.buttons > 0) setFromClientX(e.clientX);
      }}
      role="slider"
      aria-label="Vorher-Nachher-Vergleich"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(pct)}
    >
      {/* Nachher (volle Fläche) */}
      <div className="absolute inset-0">
        <PhotoImg id={afterId} className="h-full w-full" />
      </div>
      {/* Vorher — bis zur Trennlinie sichtbar */}
      <div
        className="absolute inset-0"
        style={{ clipPath: `inset(0 ${100 - pct}% 0 0)` }}
      >
        <PhotoImg id={beforeId} className="h-full w-full" />
      </div>
      {/* Trennlinie + Griff */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0"
        style={{ left: `${pct}%`, transform: "translateX(-50%)" }}
      >
        <div className="h-full w-0.5 bg-strong opacity-90" />
        <div
          className="absolute top-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-strong shadow-card"
          style={{ left: "50%", transform: "translate(-50%, -50%)" }}
        >
          <span className="font-mono text-xs font-bold text-on-strong">⇄</span>
        </div>
      </div>
      {/* Labels */}
      <span className="absolute left-2 top-2 rounded-pill px-2 py-1 font-mono text-xs text-fg" style={{ background: "var(--glass)" }}>
        {beforeLabel}
      </span>
      <span className="absolute right-2 top-2 rounded-pill px-2 py-1 font-mono text-xs text-fg" style={{ background: "var(--glass)" }}>
        {afterLabel}
      </span>
    </div>
  );
}
