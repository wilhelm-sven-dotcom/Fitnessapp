"use client";

import { Check } from "lucide-react";
import { useMemo } from "react";
import { cn } from "@/lib/utils";
import type { LoggedSession } from "@/lib/types";

/** Wochenziel — dasselbe wie im Wochenraster („Ziel 3× / Woche“). */
const ZIEL = 3;
const KURZ = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
const LANG = ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag", "Sonntag"];

const tagKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;

/**
 * Diese Woche auf einen Blick: Mo–So, trainierte Tage als gefüllter Kreis mit
 * Haken, heute mit Rand, dazu „2 von 3 Einheiten“. Die Zahl steht als Text
 * daneben; die Kreise sind nie das einzige Signal.
 */
export function WochenLeiste({ log, now = new Date() }: { log: LoggedSession[]; now?: Date }) {
  const { tage, anzahl } = useMemo(() => {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
    const ende = new Date(start);
    ende.setDate(start.getDate() + 7);
    const trainiert = new Set<string>();
    let anzahl = 0;
    for (const s of log) {
      const d = new Date(s.date);
      if (Number.isNaN(d.getTime()) || d < start || d >= ende) continue;
      anzahl++;
      trainiert.add(tagKey(d));
    }
    const heute = tagKey(now);
    const tage = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const k = tagKey(d);
      return { i, nr: d.getDate(), erledigt: trainiert.has(k), heute: k === heute, zukunft: d > now };
    });
    return { tage, anzahl };
    // `now` nur als Startwert — die Leiste rechnet je Log-Stand neu.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [log]);

  return (
    <section aria-label="Diese Woche" className="mb-4">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-3xs font-semibold uppercase tracking-label text-muted">Diese Woche</p>
        <p className="text-sm tabular-nums text-muted">
          {anzahl} von {ZIEL} Einheiten
        </p>
      </div>
      <ol className="mt-2 grid grid-cols-7 gap-1">
        {tage.map((t) => (
          <li
            key={t.i}
            className="flex flex-col items-center gap-1"
            aria-label={`${LANG[t.i]}, ${t.nr}.${t.erledigt ? ": trainiert" : t.heute ? ": heute" : ""}`}
          >
            <span aria-hidden className={cn("text-3xs font-semibold", t.heute ? "text-fg" : "text-muted")}>
              {KURZ[t.i]}
            </span>
            <span
              aria-hidden
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-pill text-sm font-semibold tabular-nums",
                t.erledigt
                  ? "bg-strong text-on-strong"
                  : t.heute
                    ? "border-2 border-fg text-fg"
                    : t.zukunft
                      ? "text-muted"
                      : "text-faint",
              )}
            >
              {t.erledigt ? <Check size={16} strokeWidth={3} /> : t.nr}
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}
