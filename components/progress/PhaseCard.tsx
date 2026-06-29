"use client";

import { CalendarRange } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Reveal } from "@/components/ui/Reveal";
import { fatigueState } from "@/lib/fatigue";
import { phaseState } from "@/lib/periodization";
import type { AppSettings, CardioSession, LoggedSession } from "@/lib/types";

const DAY = 86_400_000;

/** Where you are in the ~6-week block + when a deload is due. */
export function PhaseCard({
  log,
  cardio,
  settings,
}: {
  log: LoggedSession[];
  cardio: CardioSession[];
  settings: AppSettings;
}) {
  if (log.length < 3) return null; // needs some history to be meaningful
  const band = fatigueState(log, cardio).band;
  const minDate = Math.min(...log.map((s) => new Date(s.date).getTime()));
  const historyWeeks = (Date.now() - minDate) / (7 * DAY);
  const p = phaseState(settings, band, historyWeeks);

  return (
    <Reveal>
      <Card variant="elevated" className="edge-top mb-4 rounded-card p-5">
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
            const isDeloadWeek = wk === p.cycleLength;
            const active = wk === p.cycleWeek;
            return (
              <div
                key={i}
                className="h-2 flex-1 rounded-pill"
                style={{
                  background: active
                    ? "var(--accent-ink)"
                    : isDeloadWeek
                      ? "var(--surface-2)"
                      : "var(--line)",
                }}
              />
            );
          })}
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
    </Reveal>
  );
}
