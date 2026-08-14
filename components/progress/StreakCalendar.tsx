"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Card } from "@/components/ui/Card";
import { SPRING } from "@/lib/motion";
import type { LoggedSession } from "@/lib/types";

const GOAL = 3;

function weekStart(d: Date) {
  const off = (d.getDay() + 6) % 7;
  const m = new Date(d);
  m.setHours(0, 0, 0, 0);
  m.setDate(d.getDate() - off);
  return m;
}

/** Wochenraster München ’72: gefüllte Quadrate je Einheit — Grün, wenn das
 *  Wochenziel steht, Blau auf dem Weg dorthin. Ruhig, keine Glows. */
export function StreakCalendar({ log }: { log: LoggedSession[] }) {
  const reduce = useReducedMotion();
  const thisStart = weekStart(new Date());
  const weeks = Array.from({ length: 5 }, (_, i) => {
    const start = new Date(thisStart);
    start.setDate(thisStart.getDate() - (4 - i) * 7);
    const end = new Date(start);
    end.setDate(start.getDate() + 7);
    const count = log.filter((s) => {
      const d = new Date(s.date);
      return d >= start && d < end;
    }).length;
    return { count, current: i === 4 };
  });

  return (
    <Card className="rounded-card p-5">
      <div className="mb-4 flex items-center justify-between">
        <p className="font-mono text-xs uppercase tracking-widest text-muted">
          Diese & letzte Wochen
        </p>
        <span className="text-xs text-muted">Ziel 3× / Woche</span>
      </div>
      <div className="flex items-end justify-between gap-2">
        {weeks.map((w, wi) => {
          const goalMet = w.count >= GOAL;
          const cells = Math.max(GOAL, w.count);
          return (
            <div key={wi} className="flex flex-1 flex-col items-center gap-2">
              <div className="flex flex-col-reverse gap-1.5">
                {Array.from({ length: cells }, (_, di) => {
                  const done = di < w.count;
                  const c = done ? (goalMet ? "var(--gruen)" : "var(--accent)") : null;
                  return (
                    <motion.span
                      key={di}
                      initial={reduce ? false : { opacity: 0, scale: 0.6 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: wi * 0.06 + di * 0.04, ...SPRING.pop }}
                      className={c ? "h-3 w-3 rounded-sm" : "h-3 w-3 rounded-sm bg-surface-2"}
                      style={c ? { backgroundColor: c } : undefined}
                    />
                  );
                })}
              </div>
              <span
                className={
                  w.current
                    ? "text-xs font-medium tabular-nums text-fg"
                    : "text-xs tabular-nums text-faint"
                }
              >
                {w.current ? "jetzt" : `−${4 - wi}`}
              </span>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
