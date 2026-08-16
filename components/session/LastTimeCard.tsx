"use client";

import { ChevronDown, Trophy } from "lucide-react";
import { useEffect, useState } from "react";
import { Chip } from "@/components/ui/Chip";
import { Pressable } from "@/components/ui/pressable";
import { fmtDaysAgo, fmtKg } from "@/lib/format";
import type { ExRecord } from "@/lib/records";
import { cn } from "@/lib/utils";
import type { Exercise, LastPerf, Prescription, SetEntry } from "@/lib/types";

/**
 * „Letztes Mal" als echte Referenz statt Mono-Blob: Wann war es, was wurde
 * bewegt (Satz-Chips), was ändert sich heute (Delta-Chip + presc-Line).
 * Aufklappen zeigt RIR/Intensität je Satz, die Hilfsmittel-Notiz von damals
 * und den Rekord — bedingtes Rendern, kein Höhen-Theater.
 */
export function LastTimeCard({
  ex,
  lastPerf,
  record,
  presc,
  prescLine,
}: {
  ex: Exercise;
  lastPerf: LastPerf | null;
  record: ExRecord | null;
  presc: Prescription;
  prescLine: string;
}) {
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [ex.id]);

  const work = (lastPerf?.sets ?? []).filter((s) => !s.warmup);
  const timed = ex.unit === "Sek";

  const chipText = (s: SetEntry) => {
    if (timed) return `${s.reps} s`;
    if (s.weight !== "" && s.weight != null)
      return `${fmtKg(Number(s.weight))} × ${s.reps}`;
    return `${s.reps}`;
  };

  // Delta heute vs. letztes Mal — nur wo die Verordnung wirklich etwas ändert.
  const lastW = Math.max(0, ...work.map((s) => Number(s.weight) || 0));
  const delta =
    presc.suggestedWeight != null && lastW > 0 ? presc.suggestedWeight - lastW : 0;
  const deltaChip = (() => {
    switch (presc.reason) {
      case "up":
        return delta > 0 ? (
          <Chip tone="emerald">+{fmtKg(delta)} kg heute</Chip>
        ) : null;
      case "rep":
        return <Chip tone="emerald">+1 Wdh heute</Chip>;
      case "down":
        return delta < 0 ? (
          <Chip tone="info">−{fmtKg(-delta)} kg heute</Chip>
        ) : null;
      case "lighter":
        return <Chip tone="info">Sanfter Einstieg</Chip>;
      case "start":
        return <Chip tone="info">Startgewicht</Chip>;
      default:
        return null;
    }
  })();

  const detail = (s: SetEntry, n: number) => {
    if (timed)
      return `Satz ${n} · ${s.reps} s${s.intensity != null ? ` · Int ${s.intensity}` : ""}`;
    const w =
      s.weight !== "" && s.weight != null ? `${fmtKg(Number(s.weight))} kg × ` : "× ";
    return `Satz ${n} · ${w}${s.reps}${s.rir != null ? ` · RIR ${s.rir}` : ""}`;
  };

  return (
    <div className="mt-4 rounded-card border-l-2 border-accent-sessions bg-surface-2 px-3 py-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs uppercase tracking-widest text-muted">Letztes Mal</p>
        <span className="flex items-center gap-1">
          {lastPerf && (
            <span className="font-mono text-xs tabular-nums text-faint">
              {fmtDaysAgo(lastPerf.date)}
            </span>
          )}
          {lastPerf && (
            <Pressable
              onClick={() => setOpen((o) => !o)}
              aria-expanded={open}
              aria-label="Details zum letzten Mal"
              className="-m-2 flex h-11 w-11 items-center justify-center text-faint focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-ink"
            >
              <ChevronDown
                size={14}
                className={cn("transition-transform", open && "rotate-180")}
              />
            </Pressable>
          )}
        </span>
      </div>

      {lastPerf ? (
        <div className="mt-1 flex flex-wrap gap-1">
          {work.map((s, i) => (
            <span
              key={i}
              className="rounded-pill border border-line bg-surface-1 px-2 py-0.5 font-mono text-xs tabular-nums text-fg"
            >
              {chipText(s)}
            </span>
          ))}
        </div>
      ) : (
        <p className="mt-1 text-xs text-faint">Erstes Mal — noch keine Referenz.</p>
      )}

      {open && lastPerf && (
        <div className="mt-2 space-y-0.5 border-t border-line pt-2">
          {work.map((s, i) => (
            <p key={i} className="font-mono text-xs tabular-nums text-muted">
              {detail(s, i + 1)}
            </p>
          ))}
          {lastPerf.note && (
            <p className="pt-1 text-xs text-muted">{`Notiz: „${lastPerf.note}“`}</p>
          )}
          {record && (
            <p className="flex items-center gap-1 pt-1 font-mono text-xs text-status-in">
              <Trophy size={12} className="shrink-0" />
              {`Rekord ${record.label} · ${fmtDaysAgo(record.date)}`}
            </p>
          )}
        </div>
      )}

      <p className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-accent-ink">
        {deltaChip}
        <span>{prescLine}</span>
      </p>
    </div>
  );
}
