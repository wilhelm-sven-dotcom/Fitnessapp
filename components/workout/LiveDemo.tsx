"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Maximize2 } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { FIG, muscleBones } from "@/components/figures/figureData";
import { FigurePanel } from "@/components/figures/FigurePanel";
import { Pressable } from "@/components/ui/pressable";
import { SPRING } from "@/lib/motion";
import type { Exercise } from "@/lib/types";

/**
 * Live demo for the workout page — the current exercise's looping figure stays
 * in view while you log. Rendered via a portal as a fixed top bar (escapes the
 * page's transform/overflow ancestors that break position:sticky) and slides in
 * once you scroll into the exercise list. Follows the active card (set by the
 * page's IntersectionObserver). Tap opens the full GuideSheet. The cue walks the
 * technique steps in the figure's rhythm (reduced-motion → static).
 */
export function LiveDemo({ ex, onOpen }: { ex: Exercise | null; onOpen: () => void }) {
  const reduce = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  const [show, setShow] = useState(false);
  useEffect(() => setMounted(true), []);
  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 220);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const fig = ex ? FIG[ex.id] : undefined;
  const accent = ex ? muscleBones(ex.pattern) : undefined;
  const steps = ex?.steps ?? [];
  const syncing = !!fig && !reduce && steps.length >= 2;
  const [stepI, setStepI] = useState(0);
  useEffect(() => {
    setStepI(0);
    if (!syncing) return;
    const id = setInterval(() => setStepI((s) => (s + 1) % steps.length), 1300);
    return () => clearInterval(id);
  }, [ex?.id, syncing, steps.length]);

  if (!mounted || !ex) return null;
  const cue = syncing && steps[stepI] ? steps[stepI] : ex.cue;

  const bar = (
    <div
      className="pointer-events-none fixed inset-x-0 top-0 z-30 px-5"
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      <div className="mx-auto max-w-md">
        <AnimatePresence>
          {show && (
            <motion.div
              key="livedemo"
              initial={reduce ? { opacity: 0 } : { y: -72, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={reduce ? { opacity: 0 } : { y: -72, opacity: 0 }}
              transition={SPRING.panel}
              className="glass pointer-events-auto mt-2 rounded-card border border-line shadow-card-lg"
            >
              <Pressable
                onClick={onOpen}
                aria-label={`Ausführung ${ex.name} öffnen`}
                className="flex w-full items-center gap-3 p-2.5 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-sessions"
              >
                <span className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-pill bg-base">
                  {fig ? (
                    <FigurePanel label="" fig={fig} viewKey="side" accentBones={accent} />
                  ) : (
                    <span className="font-mono text-xs text-faint">live</span>
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-display text-sm font-semibold text-fg">
                    {ex.name}
                  </span>
                  <span className="mt-0.5 block truncate text-xs text-muted">{cue}</span>
                </span>
                <Maximize2 size={16} className="mr-1 shrink-0 text-accent-ink" />
              </Pressable>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );

  return createPortal(bar, document.body);
}
