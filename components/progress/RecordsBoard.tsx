"use client";

import { ChevronDown, Trophy } from "lucide-react";
import { useId, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Pressable } from "@/components/ui/pressable";
import { fmtDateShort } from "@/lib/format";
import { prStreakWeeks, prTimeline, recordUnit } from "@/lib/records";
import { cn } from "@/lib/utils";
import type { LoggedSession } from "@/lib/types";

const PREVIEW = 6;

/**
 * Chronologischer Rekord-Feed, neueste zuerst. Jede Zeile springt zum
 * passenden Übungs-Trend (onJump); unten klappt die volle Liste auf —
 * bedingtes Rendern ohne Höhen-Theater.
 */
export function RecordsBoard({
  log,
  onJump,
}: {
  log: LoggedSession[];
  onJump?: (exId: string) => void;
}) {
  const [showAll, setShowAll] = useState(false);
  const listId = useId();
  const events = prTimeline(log);
  if (events.length === 0) return null;
  const streak = prStreakWeeks(log);
  const shown = showAll ? events : events.slice(0, PREVIEW);

  return (
    <div>
      <Card className="mb-4 p-5">
        <div className="mb-2 flex items-center justify-between">
          <span className="flex items-center gap-1.5 font-mono text-3xs font-semibold uppercase tracking-gesperrt-2 text-messing">
            <Trophy size={13} /> Deine Rekorde
          </span>
          <span className="font-mono text-xs text-faint">
            {events.length} gesamt{streak > 1 ? ` · Serie ${streak} Wo` : ""}
          </span>
        </div>
        <ul id={listId}>
          {shown.map((e, i) => (
            <li key={e.exId + e.date + i} className="border-b border-line last:border-0">
              <Pressable
                onClick={() => onJump?.(e.exId)}
                aria-label={`Trend von ${e.name} zeigen`}
                className="flex min-h-11 w-full items-center justify-between gap-3 rounded-card py-1.5 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-ink"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-fg">{e.name}</p>
                  <p className="text-xs text-muted">
                    {fmtDateShort(e.date)} · +{e.value - e.prev} {recordUnit(e.kind)}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="font-mono text-lg font-bold leading-tight tabular-nums text-messing">
                    {e.value} {recordUnit(e.kind)}
                  </p>
                  {e.kind === "weight" && (
                    <p className="font-mono text-xs tabular-nums text-faint">{e.label}</p>
                  )}
                </div>
              </Pressable>
            </li>
          ))}
        </ul>
        {events.length > PREVIEW && (
          <Pressable
            onClick={() => setShowAll((v) => !v)}
            aria-expanded={showAll}
            aria-controls={listId}
            className="mt-2 flex min-h-11 w-full items-center justify-center gap-1.5 rounded-card bg-surface-2 text-sm font-medium text-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-ink"
          >
            <ChevronDown
              size={15}
              className={cn(
                "transition-transform duration-200 ease-out",
                showAll && "rotate-180",
              )}
            />
            {showAll ? "Weniger anzeigen" : `Alle ${events.length} Rekorde zeigen`}
          </Pressable>
        )}
      </Card>
    </div>
  );
}
