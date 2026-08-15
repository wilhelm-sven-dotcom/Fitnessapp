"use client";

import { CalendarRange } from "lucide-react";
import { Card } from "@/components/ui/Card";
import type { PhaseState } from "@/lib/periodization";
import type { LoggedSession } from "@/lib/types";

/**
 * Where you are in the ~6-week block + when a deload is due. Der Zustand
 * kommt fertig aus dem Provider (eine Quelle — keine Doppelrechnung);
 * der Entlastungs-Slot im Balken zeigt die tatsächlich empfohlene Woche
 * (bei vorgezogenem Deload also die aktuelle), die Legende benennt die
 * drei Farben.
 */
export function PhaseCard({ log, phase: p }: { log: LoggedSession[]; phase: PhaseState }) {
  if (log.length < 3) return null; // needs some history to be meaningful
  const deloadWk = p.due ? p.cycleWeek : p.cycleLength;

  return (
    <div>
      <Card variant="elevated" className="mb-4 rounded-card p-5">
        <div className="mb-3 flex items-center justify-between">
          <span className="flex items-center gap-1.5 font-mono text-xs uppercase tracking-widest text-accent-2">
            <CalendarRange size={13} className="text-accent-ink" /> Phase
          </span>
          <span className="font-mono text-xs text-faint">
            Woche {p.cycleWeek}/{p.cycleLength}
          </span>
        </div>
        <div className="flex gap-1" aria-hidden>
          {Array.from({ length: p.cycleLength }).map((_, i) => {
            const wk = i + 1;
            const isDeload = wk === deloadWk;
            const active = wk === p.cycleWeek;
            return (
              <div
                key={i}
                className="h-2 flex-1 rounded-pill"
                style={{
                  // Fällt Entlastung auf die aktive Woche, gewinnt die
                  // Entlastungs-Füllung; „aktiv" bleibt als Inset-Hairline lesbar.
                  background: isDeload
                    ? "var(--surface-2)"
                    : active
                      ? "var(--accent-ink)"
                      : "var(--line)",
                  boxShadow:
                    isDeload && active ? "inset 0 0 0 1.5px var(--accent-ink)" : undefined,
                }}
              />
            );
          })}
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
          <span className="flex items-center gap-1.5">
            <span
              className="h-3 w-3 rounded-sm"
              style={{ background: "var(--accent-ink)" }}
              aria-hidden
            />
            aktuelle Woche
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-sm" style={{ background: "var(--line)" }} aria-hidden />
            Training
          </span>
          <span className="flex items-center gap-1.5">
            <span
              className="h-3 w-3 rounded-sm"
              style={{ background: "var(--surface-2)" }}
              aria-hidden
            />
            Entlastung
          </span>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <p className="font-display text-2xl font-bold tracking-tight text-fg">{p.title}</p>
          {p.due && (
            <span className="rounded-pill bg-surface-2 px-2 py-0.5 font-mono text-xs uppercase tracking-widest text-accent-ink">
              fällig
            </span>
          )}
        </div>
        <p className="mt-1 text-sm text-muted">{p.focus}</p>
      </Card>
    </div>
  );
}
