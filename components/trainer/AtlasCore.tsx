"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useId, useRef, useState } from "react";
import { AtlasMark } from "@/components/trainer/AtlasMark";
import { EASE_OUT } from "@/lib/motion";
import type { ReadinessBand } from "@/lib/readiness";
import { cn } from "@/lib/utils";

/** Static mid-breath pose for reduced motion / flat mode. */
const STATIC_F = 0.35;

const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);

/**
 * ATLAS made visible: a living energy core. Three open arcs breathe around
 * the sigil at a pace set by today's readiness, jitter nervously when fatigue
 * runs hot, and dim during a deload; the outer ring closes with the weekly
 * mission. One rAF drives everything (opacity/rotation/dash only), paused
 * offscreen via IntersectionObserver; `flat` renders a static hairline
 * version for the editorial spread. Decorative — the card around it speaks.
 */
export function AtlasCore({
  missionPct,
  readinessBand,
  fatigueHot,
  deload,
  flat,
  size = 176,
  className,
}: {
  /** trainer.mission.pct, 0..1 — closes the outer ring. */
  missionPct: number;
  /** band(todayReadiness.score) or null before the check-in. */
  readinessBand: ReadinessBand | null;
  /** fatigue.enough && band "hoch" → shorter period + deterministic jitter. */
  fatigueHot: boolean;
  /** Deload directive/phase → slow, dimmed core. */
  deload: boolean;
  /** Editorial: static hairline variant, no glow, no loop. */
  flat?: boolean;
  size?: number;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const live = !flat && !reduce;
  const [t, setT] = useState(-1); // ms since loop start; -1 = static pose
  const [inView, setInView] = useState(true);
  const rootRef = useRef<HTMLDivElement>(null);
  const uid = useId().replace(/:/g, "");

  // Breath period: calm by default, gentler when readiness is low or a
  // deload is running, urgent when fatigue is hot.
  const period = fatigueHot ? 2100 : deload ? 5200 : readinessBand === "low" ? 4400 : 3200;

  // Pause the driver offscreen (same pattern as the figure panels).
  useEffect(() => {
    const el = rootRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const obs = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      { rootMargin: "80px" },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (!live || !inView) return;
    let raf = 0;
    let st = 0;
    const loop = (ts: number) => {
      if (!st) st = ts;
      setT(ts - st);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [live, inView]);

  const running = live && t >= 0;
  // Phase angle; the static pose sits at the same f so both modes match.
  const ph = running ? (t / period) * 2 * Math.PI : Math.acos(1 - 2 * STATIC_F);
  const fAt = (offset: number) => (1 - Math.cos(ph + offset)) / 2;
  const f = fAt(0);
  const rot = running ? t * 0.004 : 0;
  const jit = running && fatigueHot ? 0.06 * Math.sin(t / 47) * Math.sin(t / 13) : 0;

  const C = 2 * Math.PI * 88;
  const ringTo = C * (1 - clamp01(missionPct));
  const arcW = flat ? 1.2 : 1.5;

  return (
    <div
      ref={rootRef}
      data-testid="atlas-core"
      aria-hidden
      className={cn("relative", deload && "opacity-55", className)}
      style={{ width: size, height: size }}
    >
      {/* Rim light behind the core — breathes with it. */}
      {!flat && (
        <div
          className="pointer-events-none absolute rounded-full blur-2xl"
          style={{
            inset: size * 0.22,
            backgroundColor: "var(--accent)",
            opacity: 0.08 + 0.1 * f,
          }}
        />
      )}
      <svg width={size} height={size} viewBox="0 0 200 200" fill="none" className="relative">
        <defs>
          <radialGradient id={`acg${uid}`}>
            <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.8" />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
          </radialGradient>
        </defs>
        {/* Mission ring: track + closing arc (one-time sweep on mount). */}
        <circle cx="100" cy="100" r="88" stroke="var(--line)" strokeWidth={flat ? 2 : 3} />
        <motion.circle
          cx="100"
          cy="100"
          r="88"
          stroke="var(--accent)"
          strokeWidth={flat ? 2.5 : 3.5}
          strokeLinecap="round"
          strokeDasharray={C}
          transform="rotate(-90 100 100)"
          initial={{ strokeDashoffset: reduce ? ringTo : C }}
          animate={{ strokeDashoffset: ringTo }}
          transition={reduce ? { duration: 0 } : { duration: 1.1, ease: EASE_OUT, delay: 0.2 }}
        />
        {/* Breath arcs — staggered opacity, slow counter-rotation. */}
        <circle
          cx="100" cy="100" r="71"
          stroke="var(--line)" strokeWidth={arcW}
          strokeDasharray="290 156"
          transform={`rotate(${30 + rot} 100 100)`}
          opacity={clamp01(0.55 + 0.35 * fAt(0) + jit)}
        />
        <circle
          cx="100" cy="100" r="58"
          stroke="var(--accent-2)" strokeWidth={arcW} strokeLinecap="round"
          strokeDasharray="240 124"
          transform={`rotate(${150 - rot * 1.4} 100 100)`}
          opacity={clamp01(0.3 + 0.35 * fAt(0.9) + jit)}
        />
        <circle
          cx="100" cy="100" r="44"
          stroke="var(--accent)" strokeWidth={flat ? 1.6 : 2} strokeLinecap="round"
          strokeDasharray="180 96"
          transform={`rotate(${-70 + rot * 2} 100 100)`}
          opacity={clamp01(0.4 + 0.35 * fAt(1.8) + jit)}
        />
        {/* Core glow behind the sigil. */}
        {!flat && <circle cx="100" cy="100" r="21" fill={`url(#acg${uid})`} opacity={0.55 + 0.35 * f} />}
      </svg>
      <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        <AtlasMark size={Math.round(size * 0.25)} live={live} className="text-fg" />
      </span>
    </div>
  );
}
