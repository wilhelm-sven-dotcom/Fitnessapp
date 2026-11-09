"use client";

import type { PhaseState } from "@/lib/periodization";
import type { LoggedSession } from "@/lib/types";

/**
 * Wo du im ~6-Wochen-Block stehst und wann eine Entlastung fällig ist —
 * Inhalt des Blatts „Phase“ (Übersicht, Kachel „Woche“). Der Zustand kommt
 * fertig aus dem Provider; der Entlastungs-Platz im Balken zeigt die
 * tatsächlich empfohlene Woche (bei vorgezogener Entlastung die aktuelle).
 */
export function PhaseCard({ log, phase: p }: { log: LoggedSession[]; phase: PhaseState }) {
  if (log.length < 3) return null; // braucht etwas Verlauf
  const deloadWk = p.due ? p.cycleWeek : p.cycleLength;

  return (
    <div>
      <p className="text-3xs font-bold text-muted">
        Woche {p.cycleWeek} von {p.cycleLength}
      </p>
      <div className="mt-1 flex flex-wrap items-center gap-2">
        <p className="font-display text-2xl font-extrabold text-fg">{p.title}</p>
        {p.due && (
          <span className="rounded-pill border border-warnung px-2.5 py-0.5 text-3xs font-bold text-warnung">
            fällig
          </span>
        )}
      </div>
      <p className="mt-1 text-base leading-relaxed text-muted">{p.focus}</p>

      <div className="mt-4 flex gap-1.5" aria-hidden>
        {Array.from({ length: p.cycleLength }).map((_, i) => {
          const wk = i + 1;
          const isDeload = wk === deloadWk;
          const active = wk === p.cycleWeek;
          return (
            <div
              key={i}
              className="h-3 flex-1 rounded-pill"
              style={{
                // Fällt die Entlastung auf die aktuelle Woche, gewinnt ihre
                // Fläche; „aktuell“ bleibt als Rand lesbar.
                background: isDeload ? "var(--surface-2)" : active ? "var(--fg)" : "var(--line)",
                boxShadow: isDeload && active ? "inset 0 0 0 2px var(--fg)" : undefined,
              }}
            />
          );
        })}
      </div>
      <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted">
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-xs bg-fg" aria-hidden />
          aktuelle Woche
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-xs bg-line" aria-hidden />
          Training
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-xs border border-line bg-surface-2" aria-hidden />
          Entlastung
        </span>
      </div>
    </div>
  );
}
