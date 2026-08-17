"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { AlertTriangle, Check } from "lucide-react";
import { toast, type ToastRecord } from "@/lib/toast";

/** Toast Platte 311: Tinte-Fläche, Text in Grundfarbe, eine Mono-Zeile.
 *  Motion = Filmtransport: ruckt 12 px von unten ein (120 ms Transport),
 *  der Abgang ist ein HARTER Schnitt (steps(1)) — auch bei Tap.
 *  Auto-Dismiss pausiert, solange der Tab verborgen ist. */
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

  // Harter Abgang: keine Exit-Transition — im nächsten Frame aus dem Store.
  useEffect(() => {
    if (!leaving) return;
    const gone = window.setTimeout(() => toast.dismiss(t.id), 30);
    return () => window.clearTimeout(gone);
  }, [leaving, t.id]);

  const shown = open && !leaving;
  return (
    <div
      onClick={() => setLeaving(true)}
      className="pointer-events-auto flex w-full max-w-sm items-center gap-2 rounded-pill bg-strong px-3.5 py-2.5 text-left font-mono text-2xs font-medium text-on-strong"
      style={{
        opacity: shown ? 1 : 0,
        transform: reduce ? undefined : shown ? "translateY(0)" : "translateY(12px)",
        transition: shown
          ? "transform 120ms cubic-bezier(0.55, 0, 1, 1), opacity 0ms linear"
          : "none",
      }}
    >
      {t.kind === "success" && (
        <Check size={14} strokeWidth={2.5} className="shrink-0" aria-hidden />
      )}
      {t.kind === "error" && (
        <AlertTriangle size={14} className="shrink-0" aria-hidden />
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
          className="shrink-0 rounded-xs font-semibold uppercase tracking-gesperrt underline underline-offset-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyanotypie"
        >
          {t.action.label}
        </button>
      )}
    </div>
  );
}
