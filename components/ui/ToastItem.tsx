"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { AlertTriangle, Check } from "lucide-react";
import { toast, type ToastRecord } from "@/lib/toast";

/** Enter/Exit über CSS-Transitions (unterbrechbar, gleiche Richtung rein wie
 *  raus); Auto-Dismiss pausiert, solange der Tab verborgen ist. Tap = weg
 *  (zusätzlich zur automatischen Ausblendung — Tastatur braucht das nicht). */
export function ToastItem({ t }: { t: ToastRecord }) {
  const reduce = useReducedMotion();
  const [open, setOpen] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const remaining = useRef(t.duration);
  const startedAt = useRef(0);
  const timer = useRef<number | undefined>(undefined);

  // Nach dem ersten Frame öffnen — die Transition trägt den Eintritt.
  useEffect(() => {
    const raf = requestAnimationFrame(() => setOpen(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  // Auto-Dismiss mit Pause bei verborgenem Tab (Sonner-Prinzip).
  useEffect(() => {
    const arm = () => {
      startedAt.current = Date.now();
      timer.current = window.setTimeout(() => setLeaving(true), remaining.current);
    };
    const disarm = () => {
      window.clearTimeout(timer.current);
      remaining.current = Math.max(0, remaining.current - (Date.now() - startedAt.current));
    };
    const onVisibility = () => {
      if (document.visibilityState === "hidden") disarm();
      else arm();
    };
    arm();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.clearTimeout(timer.current);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  // Exit: Transition zu Ende laufen lassen, dann aus dem Store nehmen —
  // mit Fallback-Timeout, falls transitionend nie feuert (Tab im Hintergrund).
  useEffect(() => {
    if (!leaving) return;
    const fallback = window.setTimeout(() => toast.dismiss(t.id), 250);
    return () => window.clearTimeout(fallback);
  }, [leaving, t.id]);

  const shown = open && !leaving;
  return (
    <div
      onClick={() => setLeaving(true)}
      onTransitionEnd={(e) => {
        if (leaving && e.propertyName === "opacity") toast.dismiss(t.id);
      }}
      className="pointer-events-auto flex w-full max-w-sm items-center gap-2 rounded-card border border-line bg-surface-1 px-4 py-3 text-left text-sm text-fg shadow-card-lg"
      style={{
        opacity: shown ? 1 : 0,
        transform: reduce ? undefined : shown ? "translateY(0)" : "translateY(12px)",
        transition:
          "opacity 200ms cubic-bezier(0.22,1,0.36,1), transform 200ms cubic-bezier(0.22,1,0.36,1)",
      }}
    >
      {t.kind === "success" && (
        <Check size={16} strokeWidth={2.5} className="shrink-0 text-status-in" aria-hidden />
      )}
      {t.kind === "error" && (
        <AlertTriangle size={16} className="shrink-0 text-status-danger" aria-hidden />
      )}
      <span className="min-w-0 flex-1">{t.message}</span>
      {t.action && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            t.action?.onClick();
            setLeaving(true);
          }}
          className="shrink-0 rounded-sm text-sm font-medium text-accent-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-sessions"
        >
          {t.action.label}
        </button>
      )}
    </div>
  );
}
