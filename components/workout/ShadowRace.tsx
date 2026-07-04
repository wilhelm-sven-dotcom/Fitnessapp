"use client";

import { useEffect, useRef } from "react";
import { fmtDateShort } from "@/lib/format";
import { tap } from "@/lib/haptics";
import { setMetric } from "@/lib/records";
import { isFilled, workSets } from "@/lib/stats";
import type { Exercise, LastPerf, SetEntry } from "@/lib/types";
import { cn } from "@/lib/utils";

function lbl(ex: Exercise, s: SetEntry): string {
  if (ex.unit === "Sek") return `${s.reps}s`;
  return s.weight !== "" && s.weight != null ? `${s.weight}×${s.reps}` : `${s.reps}`;
}

/**
 * Schattenrennen: dein vergangenes Ich läuft live mit. Je Arbeitssatz ein
 * Duell-Balkenpaar HEUTE vs. SCHATTEN (letzte Leistung, Index-gepaart über
 * setMetric — fairer Vergleich für Gewicht×Wdh und Sekunden). Überholen färbt
 * den Heute-Balken akzent und klopft einmal; heutige Extra-Sätze laufen ohne
 * Schatten, überzählige Schatten-Sätze werden ignoriert.
 */
export function ShadowRace({
  ex,
  sets,
  lastPerf,
  prescLine,
}: {
  ex: Exercise;
  sets: SetEntry[];
  lastPerf: LastPerf;
  prescLine: string;
}) {
  const today = (sets ?? []).filter((s) => !s.warmup);
  const shadow = workSets(lastPerf.sets).filter(isFilled);
  const n = Math.min(today.length, shadow.length);

  // Einmalige Haptik je überholtem Satz — nur solange die Karte aktiv ist.
  const tappedRef = useRef<Set<number>>(new Set());
  useEffect(() => {
    for (let i = 0; i < n; i++) {
      const t = today[i];
      if (!t || !isFilled(t)) continue;
      if (setMetric(ex, t) > setMetric(ex, shadow[i]) && !tappedRef.current.has(i)) {
        tappedRef.current.add(i);
        tap();
      }
    }
  });

  if (n === 0) return null;
  const pairs = Array.from({ length: n }, (_, i) => {
    const t = today[i];
    const filled = !!t && isFilled(t);
    const nowM = filled ? setMetric(ex, t) : 0;
    const thenM = setMetric(ex, shadow[i]);
    const max = Math.max(nowM, thenM, 1);
    return { i, t, filled, nowM, thenM, max, ahead: filled && nowM > thenM };
  });

  return (
    <div
      data-testid="shadow-race"
      className="mt-3 rounded-card border-l-2 border-accent-sessions bg-surface-2 px-3 py-2"
    >
      <div className="flex items-baseline justify-between">
        <p className="text-xs uppercase tracking-widest text-muted">Schattenrennen</p>
        <p className="font-mono text-xs text-faint">{fmtDateShort(lastPerf.date)}</p>
      </div>
      <div className="mt-2 space-y-2">
        {pairs.map(({ i, t, filled, nowM, thenM, max, ahead }) => (
          <div key={i} className="grid grid-cols-12 items-center gap-x-2 gap-y-0.5">
            <span className="col-span-2 row-span-2 font-mono text-xs text-faint">S{i + 1}</span>
            <span className="col-span-7 h-1.5 overflow-hidden rounded-full bg-surface-1" aria-hidden>
              <span
                className={cn(
                  "block h-full rounded-full",
                  ahead ? "bg-accent-sessions" : "bg-muted",
                )}
                style={{ width: `${Math.round((nowM / max) * 100)}%` }}
              />
            </span>
            <span
              className={cn(
                "col-span-3 text-right font-mono text-xs tabular-nums",
                ahead ? "font-medium text-accent-ink" : "text-fg",
              )}
            >
              {filled && t ? lbl(ex, t) : "—"}
            </span>
            <span className="col-span-7 h-1.5 overflow-hidden rounded-full bg-surface-1" aria-hidden>
              <span
                className="block h-full rounded-full bg-surface-3"
                style={{ width: `${Math.round((thenM / max) * 100)}%` }}
              />
            </span>
            <span className="col-span-3 text-right font-mono text-xs tabular-nums text-faint">
              {lbl(ex, shadow[i])}
            </span>
          </div>
        ))}
      </div>
      <p className="mt-2 text-xs text-accent-ink">{prescLine}</p>
    </div>
  );
}
