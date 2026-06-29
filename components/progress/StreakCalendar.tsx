"use client";

import { motion } from "framer-motion";
import { Flame } from "lucide-react";
import { Card } from "@/components/ui/Card";
import type { LoggedSession } from "@/lib/types";

const GOAL = 3;
const VOLUME = "#30d158";
const SESSIONS = "#ff375f";

function weekStart(d: Date) {
  const off = (d.getDay() + 6) % 7;
  const m = new Date(d);
  m.setHours(0, 0, 0, 0);
  m.setDate(d.getDate() - off);
  return m;
}

export function StreakCalendar({ log }: { log: LoggedSession[] }) {
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
          const dots = Math.max(GOAL, w.count);
          return (
            <div key={wi} className="flex flex-1 flex-col items-center gap-2">
              <div className="flex flex-col-reverse gap-1.5">
                {Array.from({ length: dots }, (_, di) => {
                  const done = di < w.count;
                  const c = done ? (goalMet ? VOLUME : SESSIONS) : null;
                  return (
                    <motion.span
                      key={di}
                      initial={{ opacity: 0, scale: 0.3 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{
                        delay: wi * 0.06 + di * 0.04,
                        type: "spring",
                        stiffness: 500,
                        damping: 30,
                      }}
                      className={c ? "h-3 w-3 rounded-full" : "h-3 w-3 rounded-full bg-surface-2"}
                      style={c ? { backgroundColor: c, boxShadow: `0 0 8px -1px ${c}` } : undefined}
                    />
                  );
                })}
              </div>
              <span
                className={
                  w.current
                    ? "flex items-center gap-1 text-xs font-medium tabular-nums text-fg"
                    : "text-xs tabular-nums text-faint"
                }
              >
                {w.current ? "jetzt" : `−${4 - wi}`}
                {w.current && goalMet && (
                  <Flame size={12} style={{ color: "var(--accent)" }} />
                )}
              </span>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
