"use client";

import { useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";
import { FLIP_END, FLIP_FRAMES } from "@/components/flipbook/sequence";

/**
 * Das Daumenkino: die Tafeln rattern im ~88-ms-Takt durch und bleiben auf der
 * roten Finale-Karte stehen — wie ein Filmvorspann. Läuft INNERHALB der ohnehin
 * vorhandenen Wartezeit (Splash-Minimum bzw. Workout-Vorbereitung), verlängert
 * also nichts. `compact` zeigt nur jede zweite Tafel (~0,8 s) für den kurzen
 * „bereite vor…"-Moment. Reduced motion → sofort das statische Finale, kein
 * Flackern. Der Timer räumt sich beim Unmount auf und stoppt am Ende selbst.
 */
const STEP_MS = 88;

export function FlipbookBoot({ compact = false }: { compact?: boolean }) {
  const reduce = useReducedMotion() ?? false;
  const frames = compact ? FLIP_FRAMES.filter((_, i) => i % 2 === 0) : FLIP_FRAMES;
  const [idx, setIdx] = useState(0);
  // Erst nach dem Mount rendern: `reduce` weicht auf dem Client vom
  // Server-Wert ab (Media-Query) — ein SSR-Frame würde einen Hydration-
  // Mismatch werfen. Der Splash-Hintergrund überbrückt den einen Frame.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const done = reduce || idx >= frames.length;

  useEffect(() => {
    if (reduce) return;
    const id = window.setInterval(
      () => setIdx((i) => (i >= frames.length ? i : i + 1)),
      STEP_MS,
    );
    return () => window.clearInterval(id);
  }, [reduce, frames.length]);

  if (!mounted) return null;

  return (
    <div aria-hidden style={{ width: "min(80vw, 300px)", margin: "0 auto" }}>
      {done ? FLIP_END : frames[idx]}
    </div>
  );
}
