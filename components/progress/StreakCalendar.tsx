"use client";

import { motion } from "framer-motion";
import type { LoggedSession } from "@/lib/types";

const GOAL = 3;

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
    <div className="rounded-3xl bg-neutral-900 p-5">
      <div className="mb-4 flex items-center justify-between">
        <p className="font-mono text-xs uppercase tracking-widest text-amber-400">
          Diese & letzte Wochen
        </p>
        <span className="text-xs text-neutral-500">Ziel 3× / Woche</span>
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
                      className={
                        done
                          ? goalMet
                            ? "h-3 w-3 rounded-full bg-emerald-400"
                            : "h-3 w-3 rounded-full bg-amber-400"
                          : "h-3 w-3 rounded-full bg-neutral-800"
                      }
                    />
                  );
                })}
              </div>
              <span
                className={
                  w.current
                    ? "text-xs font-medium tabular-nums text-neutral-200"
                    : "text-xs tabular-nums text-neutral-600"
                }
              >
                {w.current ? "jetzt" : `−${4 - wi}`}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
