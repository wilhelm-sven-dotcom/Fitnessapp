"use client";

import { Trophy } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Reveal } from "@/components/ui/Reveal";
import { fmtDateShort } from "@/lib/format";
import { prStreakWeeks, prTimeline, recordUnit } from "@/lib/records";
import type { LoggedSession } from "@/lib/types";

/** Chronological PR achievement feed — when new bests were set, newest first. */
export function RecordsBoard({ log }: { log: LoggedSession[] }) {
  const events = prTimeline(log);
  if (events.length === 0) return null;
  const streak = prStreakWeeks(log);
  const recent = events.slice(0, 6);

  return (
    <Reveal>
      <Card variant="elevated" className="edge-top mb-4 rounded-card p-5">
        <div className="mb-3 flex items-center justify-between">
          <span className="flex items-center gap-1.5 font-mono text-xs uppercase tracking-widest text-accent-2">
            <Trophy size={13} className="text-accent-ink" /> Rekorde
          </span>
          <span className="font-mono text-xs text-faint">
            {events.length} gesamt{streak > 1 ? ` · Serie ${streak} Wo` : ""}
          </span>
        </div>
        <ul>
          {recent.map((e, i) => (
            <li
              key={e.exId + e.date + i}
              className="flex items-center justify-between gap-3 border-b border-line py-2 first:pt-0 last:border-0 last:pb-0"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-fg">{e.name}</p>
                <p className="text-xs text-muted">
                  {fmtDateShort(e.date)} · +{e.value - e.prev} {recordUnit(e.kind)}
                </p>
              </div>
              <span className="shrink-0 font-display text-lg font-semibold tabular-nums text-accent-ink">
                {e.value} {recordUnit(e.kind)}
              </span>
            </li>
          ))}
        </ul>
      </Card>
    </Reveal>
  );
}
