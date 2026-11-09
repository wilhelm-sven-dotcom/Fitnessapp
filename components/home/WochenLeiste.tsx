"use client";

import { Check } from "lucide-react";
import { useMemo } from "react";
import { Sticker } from "@/components/ui/Sticker";
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
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-bold text-muted">Diese Woche</p>
        <Sticker drehung={-3} className="tabular-nums">
          {anzahl} von {ZIEL} Einheiten
        </Sticker>
      </div>
      <ol className="mt-2 grid grid-cols-7 gap-1">
        {tage.map((t) => (
          <li
            key={t.i}
            className="flex flex-col items-center gap-1"
            aria-label={`${LANG[t.i]}, ${t.nr}.${t.erledigt ? ": trainiert" : t.heute ? ": heute" : ""}`}
          >
            <span aria-hidden className={cn("text-3xs font-bold", t.heute ? "text-fg" : "text-muted")}>
              {KURZ[t.i]}
            </span>
            <span
              aria-hidden
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-pill border-dick font-display text-sm font-extrabold tabular-nums",
                t.erledigt
                  ? "border-rand bg-accent text-on-accent"
                  : t.heute
                    ? "border-rekord-flaeche bg-surface-1 text-fg"
                    : t.zukunft
                      ? "border-rand bg-surface-1 text-fg"
                      : "border-line bg-surface-1 text-muted",
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
