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
 * Rekorde, neueste zuerst. Jede Zeile öffnet den Verlauf der Übung
 * (onJump); unten klappt die volle Liste auf. Gewichtsrekorde nennen das
 * geschätzte 1RM UND den gehobenen Satz.
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
    <Card>
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-3xs font-bold text-rekord">
          <Trophy size={14} aria-hidden /> Rekorde
        </span>
        <span className="text-sm tabular-nums text-muted">
          {events.length} gesamt{streak > 1 ? ` · ${streak} Wochen in Folge` : ""}
        </span>
      </div>
      <ul id={listId}>
        {shown.map((e, i) => (
          <li key={e.exId + e.date + i} className="border-b border-line-card last:border-0">
            <Pressable
              onClick={() => onJump?.(e.exId)}
              aria-label={`${e.name}: Verlauf zeigen`}
              className="flex min-h-14 w-full items-center justify-between gap-3 rounded-inner py-2 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-fokus"
            >
              <div className="min-w-0">
                <p className="text-base font-semibold leading-snug text-fg">{e.name}</p>
                <p className="text-sm tabular-nums text-muted">
                  {fmtDateShort(e.date)} · +{e.value - e.prev} {recordUnit(e.kind)}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-lg font-bold leading-tight tabular-nums text-rekord">
                  {e.value} {recordUnit(e.kind)}
                </p>
                {e.kind === "weight" && (
                  <p className="text-sm tabular-nums text-muted">
                    1RM aus {e.label.replace(" × ", " kg × ")}
                  </p>
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
          className="mt-2 flex min-h-11 w-full items-center justify-center gap-1.5 rounded-pill border border-line text-sm font-semibold text-fg focus:outline-none focus-visible:ring-2 focus-visible:ring-fokus"
        >
          <ChevronDown
            size={16}
            aria-hidden
            className={cn("transition-transform duration-200 ease-out", showAll && "rotate-180")}
          />
          {showAll ? "Weniger anzeigen" : `Alle ${events.length} Rekorde zeigen`}
        </Pressable>
      )}
    </Card>
  );
}
