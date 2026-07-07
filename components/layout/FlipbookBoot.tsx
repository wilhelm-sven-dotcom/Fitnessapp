"use client";

import { useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";
import { FLIP_END_STEP, FLIP_STEPS } from "@/components/flipbook/sequence";

/**
 * Das Daumenkino: die Tafeln rattern im ~88-ms-Takt durch und bleiben auf der
 * roten Finale-Karte stehen — wie ein Filmvorspann. Läuft INNERHALB der ohnehin
 * vorhandenen Wartezeit (Splash-Minimum bzw. Workout-Vorbereitung), verlängert
 * also nichts.
 *
 * Vollbild (Default, Splash): jeder Frame malt seine Papier-/Grundfarbe
 * bildschirmfüllend hinter die volle Tafelbreite — Kante zu Kante, harte
 * Schnitte, kein sichtbarer App-Hintergrund. `compact` (Workout-Moment) bleibt
 * eine kleine Inline-Karte mit jeder zweiten Tafel (~0,8 s).
 *
 * Reduced motion → sofort das statische Finale, kein Flackern. Der Timer räumt
 * sich beim Unmount auf und stoppt am Ende selbst. Ein Mount-Gate verhindert
 * den Hydration-Mismatch der Media-Query.
 */
const STEP_MS = 88;

export function FlipbookBoot({ compact = false }: { compact?: boolean }) {
  const reduce = useReducedMotion() ?? false;
  const steps = compact ? FLIP_STEPS.filter((_, i) => i % 2 === 0) : FLIP_STEPS;
  const [idx, setIdx] = useState(0);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const done = reduce || idx >= steps.length;
  const step = done ? FLIP_END_STEP : steps[idx];

  useEffect(() => {
    if (reduce) return;
    const id = window.setInterval(
      () => setIdx((i) => (i >= steps.length ? i : i + 1)),
      STEP_MS,
    );
    return () => window.clearInterval(id);
  }, [reduce, steps.length]);

  if (!mounted) return null;

  if (compact) {
    return (
      <div aria-hidden style={{ width: "min(80vw, 300px)", margin: "0 auto" }}>
        {step.node}
      </div>
    );
  }

  return (
    <div
      aria-hidden
      data-flipbook-bg
      style={{
        position: "absolute",
        inset: 0,
        background: step.bg,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div style={{ width: "100%", maxWidth: 480 }}>{step.node}</div>
    </div>
  );
}
