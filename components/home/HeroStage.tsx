"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useId, useRef, useState } from "react";
import { FigurePanel } from "@/components/figures/FigurePanel";
import { FIG, muscleBones } from "@/components/figures/figureData";
import { Pressable } from "@/components/ui/pressable";
import { tap } from "@/lib/haptics";
import { EASE_OUT } from "@/lib/motion";
import type { ResolvedSlot } from "@/lib/types";
import { cn } from "@/lib/utils";

/** One rep (ms) — same rhythm as FigurePanel's own loop, so the stage breathes
 *  at the pace every other figure in the app does. */
const PERIOD = 2600;
/** The reel advances to the next exercise after this many complete reps. */
const CYCLES_PER_EX = 2;
/** Reduced motion: one readable mid-rep pose instead of a loop. */
const STATIC_F = 0.35;

/**
 * The home hero as a lit stage: spotlight from above, a breathing rim light,
 * a floor pool with a living shadow that widens/darkens at the deepest point
 * of each rep, and a ground pulse that fires there. The stage plays today's
 * exercises as a reel (crossfade every two reps) with a mono ticker + dots,
 * so the hero advertises the whole session instead of idling.
 *
 * HeroStage owns the motion phase (rAF cosine, PERIOD ms) and drives
 * FigurePanel via `freeze` — one driver for figure, shadow, pulse and reel.
 */
export function HeroStage({
  slots,
  compact,
  className,
}: {
  slots: ResolvedSlot[];
  /** Editorial spread: narrower stage, same mechanics. */
  compact?: boolean;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const figSlots = slots.filter((s) => s.ex && FIG[s.ex.id]);
  const n = figSlots.length;

  const [index, setIndex] = useState(0);
  const [f, setF] = useState(STATIC_F);
  const [pulse, setPulse] = useState(0);
  const [inView, setInView] = useState(true);
  const rootRef = useRef<HTMLDivElement>(null);
  const stRef = useRef(0);
  const cycleRef = useRef(0);
  const pulsedRef = useRef(false);
  const uid = useId().replace(/:/g, "");

  // Recommendation changed and shrank below the current reel position.
  useEffect(() => {
    if (index >= n && n > 0) setIndex(0);
  }, [index, n]);

  // Pause the driver while scrolled offscreen (same pattern as FigurePanel).
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

  // The single motion driver: phase, rep pulse and reel advance.
  useEffect(() => {
    if (reduce || !inView || n === 0) return;
    stRef.current = 0;
    cycleRef.current = 0;
    pulsedRef.current = false;
    let raf = 0;
    const loop = (ts: number) => {
      if (!stRef.current) stRef.current = ts;
      const el = ts - stRef.current;
      const nf = (1 - Math.cos(((el % PERIOD) / PERIOD) * 2 * Math.PI)) / 2;
      // Deepest point of the rep: fire the ground pulse once per cycle.
      if (nf >= 0.97) {
        if (!pulsedRef.current) {
          pulsedRef.current = true;
          setPulse((p) => p + 1);
        }
      } else if (nf < 0.5 && pulsedRef.current) {
        pulsedRef.current = false;
      }
      // Cycle boundary (f≈0): advance the reel so the next athlete starts on top.
      const cyc = Math.floor(el / PERIOD);
      if (cyc !== cycleRef.current) {
        cycleRef.current = cyc;
        if (n > 1 && cyc % CYCLES_PER_EX === 0) setIndex((i) => (i + 1) % n);
      }
      setF(nf);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [reduce, inView, n]);

  if (n === 0) return null;
  const safeIndex = Math.min(index, n - 1);
  const { ex } = figSlots[safeIndex];
  const fig = FIG[ex.id];
  const fEff = reduce ? STATIC_F : f;

  // Normalize every figure onto the full frame so reel heights never jump;
  // the stage's elliptical floor replaces FigurePanel's straight ground line.
  const stageFig = { ...fig, vb: "0 0 200 165", ground: null };
  const accent = muscleBones(ex.pattern);

  // Floor-crop figures lie down (wide static shadow); ground-less figures hang
  // (shadow shrinks as they pull up); everyone else stands (living shadow).
  const lying = !!fig.vb;
  const hanging = fig.ground == null;
  const cx = lying ? 110 : 100;
  const shRx = lying ? 56 : hanging ? 26 - 5 * fEff : 30 * (0.7 + 0.5 * fEff);
  const shRy = lying ? 6 : hanging ? 4.5 : 5 + 1.5 * fEff;
  const shOp = lying
    ? 0.3 + 0.1 * fEff
    : hanging
      ? 0.3 - 0.12 * fEff
      : 0.25 + 0.35 * fEff;

  const dose =
    ex.unit === "Min"
      ? `${ex.repLow}–${ex.repHigh} Min`
      : `${ex.sets} × ${ex.repLow}–${ex.repHigh}`;

  const advance = () => {
    tap();
    stRef.current = 0;
    cycleRef.current = 0;
    pulsedRef.current = false;
    setF(0);
    setIndex((i) => (i + 1) % n);
  };

  const stage = (
    <>
      <div
        ref={rootRef}
        data-testid="hero-stage"
        className={cn("relative mx-auto grid items-start", compact ? "w-28" : "w-40")}
      >
        {/* Rim light behind the athlete — breathes with the rep. */}
        <div
          aria-hidden
          className="pointer-events-none col-start-1 row-start-1 h-2/3 w-2/3 place-self-center rounded-full blur-2xl"
          style={{ backgroundColor: "var(--accent)", opacity: 0.1 + 0.12 * fEff }}
        />
        {/* Stage floor: light pool, hairline edge, living shadow, rep pulse. */}
        <svg aria-hidden viewBox="0 0 200 165" className="col-start-1 row-start-1 w-full">
          <defs>
            <radialGradient id={`hsp${uid}`}>
              <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.16" />
              <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
            </radialGradient>
            <radialGradient id={`hss${uid}`}>
              <stop offset="0%" stopColor="#000" stopOpacity="0.6" />
              <stop offset="70%" stopColor="#000" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#000" stopOpacity="0" />
            </radialGradient>
            <linearGradient id={`hsb${uid}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.2" />
              <stop offset="80%" stopColor="var(--accent)" stopOpacity="0.04" />
              <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
            </linearGradient>
            <filter id={`hsf${uid}`} x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="2.5" />
            </filter>
          </defs>
          {/* Light cone from above down to the floor pool. */}
          <path
            d={`M${cx - 16} 0 L${cx + 16} 0 L${cx + 62} 150 L${cx - 62} 150 Z`}
            fill={`url(#hsb${uid})`}
            filter={`url(#hsf${uid})`}
            opacity={0.75 + 0.25 * fEff}
          />
          <ellipse cx={cx} cy={150} rx={72} ry={13} fill={`url(#hsp${uid})`} />
          <ellipse cx={cx} cy={150} rx={62} ry={10.5} fill="none" stroke="var(--line)" strokeWidth="1.5" />
          <ellipse cx={cx} cy={150} rx={shRx} ry={shRy} fill={`url(#hss${uid})`} opacity={shOp} />
          {pulse > 0 && (
            <motion.ellipse
              key={pulse}
              data-testid="hero-pulse"
              cx={cx}
              cy={150}
              fill="none"
              stroke="var(--accent)"
              strokeWidth={2}
              initial={{ rx: 16, ry: 4, opacity: 0.5 }}
              animate={{ rx: 52, ry: 13, opacity: 0 }}
              transition={{ duration: 0.7, ease: EASE_OUT }}
            />
          )}
        </svg>
        {/* The athlete — crossfades on reel advance. */}
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.div
            key={ex.id}
            className="col-start-1 row-start-1"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.25, ease: EASE_OUT }}
          >
            <FigurePanel label="" fig={stageFig} viewKey="side" accentBones={accent} freeze={fEff} />
          </motion.div>
        </AnimatePresence>
      </div>
      <p
        data-testid="hero-ticker"
        className="mx-auto max-w-full truncate px-2 text-center font-mono text-xs uppercase tracking-widest text-muted"
      >
        {String(safeIndex + 1).padStart(2, "0")}/{String(n).padStart(2, "0")} · {ex.name} · {dose}
      </p>
      {n > 1 && (
        <div aria-hidden className="mt-1.5 flex justify-center gap-1.5">
          {figSlots.map((s, i) => (
            <span
              key={s.slotKey}
              className={cn(
                "h-1 w-1 rounded-full transition-colors",
                i === safeIndex ? "bg-accent-sessions" : "bg-surface-3",
              )}
            />
          ))}
        </div>
      )}
    </>
  );

  return (
    <div className={cn("relative", className)}>
      {n > 1 && !reduce ? (
        <Pressable onClick={advance} aria-label="Nächste Übung zeigen" className="block w-full">
          {stage}
        </Pressable>
      ) : (
        stage
      )}
    </div>
  );
}
