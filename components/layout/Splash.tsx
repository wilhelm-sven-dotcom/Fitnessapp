"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";
import { BrandMark } from "@/components/brand/BrandMark";
import { EASE_OUT } from "@/lib/motion";

/* Per-skin "boot" reveals — each skin powers up its own signature. Read the skin
   after mount (data-skin is set pre-paint); null-gate so it renders once, in the
   right skin, with no hydration mismatch. reduced-motion → final state instantly. */

const ACCENT: Record<string, string> = { blueprint: "#ff375f", tactile: "#ff9f0a", editorial: "#ff375f" };

const WORD = "TRAINING".split("");

function Caption({ delay, reduce }: { delay: number; reduce: boolean }) {
  return (
    <motion.p
      className="mt-3 text-sm text-muted"
      initial={reduce ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5, delay, ease: EASE_OUT }}
    >
      Bereit, wenn du es bist.
    </motion.p>
  );
}

/* ── Tactile: instrument power-on — the needle revs and settles, amber glows. ── */
function TactileBoot({ reduce }: { reduce: boolean }) {
  const CX = 120, CY = 122, R = 82;
  const polar = (frac: number, rad: number): [number, number] => {
    const t = ((180 - frac * 180) * Math.PI) / 180;
    return [CX + rad * Math.cos(t), CY - rad * Math.sin(t)];
  };
  const arc = (from: number, to: number, rad: number) =>
    Array.from({ length: 41 }, (_, k) => polar(from + ((to - from) * k) / 40, rad))
      .map(([x, y], k) => `${k ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`)
      .join(" ");
  return (
    <div className="flex flex-col items-center">
      <div className="relative">
        <svg viewBox="0 0 240 150" className="w-64">
          <path d={arc(0, 1, R)} fill="none" stroke="#262a33" strokeWidth={9} strokeLinecap="round" />
          <motion.path
            d={arc(0, 1, R)}
            fill="none"
            stroke="#ff9f0a"
            strokeWidth={9}
            strokeLinecap="round"
            initial={reduce ? false : { pathLength: 0 }}
            animate={{ pathLength: 0.62 }}
            transition={{ duration: 1, ease: EASE_OUT }}
          />
          {Array.from({ length: 11 }).map((_, i) => {
            const [ox, oy] = polar(i / 10, R - 14);
            const [ix, iy] = polar(i / 10, i % 5 === 0 ? R - 26 : R - 21);
            return <line key={i} x1={ox} y1={oy} x2={ix} y2={iy} stroke={i % 5 === 0 ? "#9aa1ac" : "#3a3e47"} strokeWidth={i % 5 === 0 ? 2 : 1} />;
          })}
          <motion.line
            x1={CX} y1={CY} x2={CX} y2={CY - 66}
            stroke="#ff9f0a" strokeWidth={3} strokeLinecap="round"
            style={{ originX: `${CX}px`, originY: `${CY}px` }}
            initial={reduce ? false : { rotate: -90 }}
            animate={{ rotate: reduce ? 22 : [-90, 78, 22] }}
            transition={{ duration: 1.05, times: [0, 0.72, 1], ease: EASE_OUT }}
          />
          <circle cx={CX} cy={CY} r={9} fill="#16181d" stroke="#262a33" strokeWidth={2} />
          <circle cx={CX} cy={CY} r={3} fill="#ff9f0a" />
        </svg>
        {!reduce && (
          <motion.span
            className="pointer-events-none absolute inset-0 m-auto h-24 w-24 rounded-full"
            style={{ background: "radial-gradient(circle, rgba(255,159,10,0.5), rgba(255,159,10,0) 70%)" }}
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: [0.5, 1.5], opacity: [0.6, 0] }}
            transition={{ duration: 0.7, delay: 0.85, ease: EASE_OUT }}
          />
        )}
      </div>
      <motion.p
        className="-mt-2 font-display text-2xl font-bold tracking-tight text-fg"
        initial={reduce ? false : { opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.6, ease: EASE_OUT }}
      >
        Training
      </motion.p>
      <Caption delay={0.8} reduce={reduce} />
    </div>
  );
}

/* ── Blueprint: a measurement plot — ruler sweeps, crosshair locks, mark snaps in. ── */
function BlueprintBoot({ reduce }: { reduce: boolean }) {
  return (
    <div className="flex flex-col items-center">
      <div className="relative flex h-28 w-64 items-center justify-center">
        {/* crosshair */}
        {!reduce && (
          <>
            <motion.span className="absolute h-px w-full" style={{ background: "#6e90be" }} initial={{ scaleX: 0, opacity: 0.8 }} animate={{ scaleX: 1, opacity: 0.25 }} transition={{ duration: 0.6, ease: EASE_OUT }} />
            <motion.span className="absolute h-full w-px" style={{ background: "#6e90be" }} initial={{ scaleY: 0, opacity: 0.8 }} animate={{ scaleY: 1, opacity: 0.25 }} transition={{ duration: 0.6, delay: 0.15, ease: EASE_OUT }} />
          </>
        )}
        <motion.div
          initial={reduce ? false : { scale: 0.4, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 320, damping: 18, delay: 0.45 }}
        >
          <BrandMark size={64} className="rounded-md" />
        </motion.div>
      </div>
      {/* tick ruler with a red index marker that sweeps and settles */}
      <div className="relative h-5 w-64 border-t" style={{ borderColor: "#222b38" }}>
        {Array.from({ length: 21 }).map((_, i) => (
          <span key={i} className="absolute top-0" style={{ left: `${i * 5}%`, width: 1, height: i % 5 === 0 ? 9 : 5, background: i % 5 === 0 ? "#6e90be" : "#222b38" }} />
        ))}
        <motion.span
          className="absolute -top-0.5"
          style={{ width: 2, height: 15, background: "#ff375f" }}
          initial={reduce ? false : { left: "0%" }}
          animate={{ left: reduce ? "62%" : ["0%", "100%", "62%"] }}
          transition={{ duration: 1.1, times: [0, 0.7, 1], ease: EASE_OUT }}
        />
      </div>
      <motion.p
        className="mt-3 font-display text-2xl font-bold uppercase tracking-tight text-fg"
        initial={reduce ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.7, ease: EASE_OUT }}
      >
        Training
      </motion.p>
      <Caption delay={0.85} reduce={reduce} />
    </div>
  );
}

/* ── Editorial: the press sets the nameplate, letter by letter, then rules it off. ── */
function EditorialBoot({ reduce }: { reduce: boolean }) {
  return (
    <div className="flex flex-col items-center">
      <motion.div
        initial={reduce ? false : { scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.4, ease: EASE_OUT }}
      >
        <BrandMark size={52} className="rounded-md" />
      </motion.div>
      <p className="mt-5 flex font-display text-5xl font-bold uppercase leading-none tracking-tight text-fg" aria-label="Training">
        {WORD.map((c, i) => (
          <motion.span
            key={i}
            aria-hidden
            initial={reduce ? false : { opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.34, delay: 0.15 + i * 0.07, ease: EASE_OUT }}
          >
            {c}
          </motion.span>
        ))}
      </p>
      <motion.span
        className="mt-3 h-px w-48"
        style={{ background: "#2c2b27" }}
        initial={reduce ? false : { scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 0.6, delay: 0.9, ease: EASE_OUT }}
      />
      <motion.p
        className="mt-3 font-mono text-xs uppercase tracking-widest text-faint"
        initial={reduce ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 1.05, ease: EASE_OUT }}
      >
        Kraft · Form · Fortschritt
      </motion.p>
    </div>
  );
}

export function Splash() {
  const reduce = useReducedMotion() ?? false;
  const [skin, setSkin] = useState<string | null>(null);
  useEffect(() => {
    const s = document.documentElement.dataset.skin;
    setSkin(s && ACCENT[s] ? s : "tactile");
  }, []);

  return (
    <motion.div
      className="app-bg fixed inset-0 z-50 flex flex-col items-center justify-center"
      style={{ paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)" }}
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4, ease: EASE_OUT }}
    >
      {skin === "blueprint" && <BlueprintBoot reduce={reduce} />}
      {skin === "editorial" && <EditorialBoot reduce={reduce} />}
      {skin === "tactile" && <TactileBoot reduce={reduce} />}
    </motion.div>
  );
}
