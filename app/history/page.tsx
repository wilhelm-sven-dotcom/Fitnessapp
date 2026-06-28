"use client";

import { Trash2 } from "lucide-react";
import { useState } from "react";
import { Pressable } from "@/components/ui/pressable";
import { useTraining } from "@/components/providers/TrainingProvider";
import { fmtDate } from "@/lib/format";
import { sessionVolume } from "@/lib/stats";
import { cn } from "@/lib/utils";
import type { TrafficLight } from "@/lib/types";

const trafficDot: Record<TrafficLight, string> = {
  green: "bg-emerald-400",
  yellow: "bg-amber-400",
  red: "bg-rose-500",
};

export default function HistoryPage() {
  const { log, deleteSession } = useTraining();
  const [expanded, setExpanded] = useState<number | null>(null);
  const [confirmDel, setConfirmDel] = useState<number | null>(null);
  const items = [...log].reverse();

  return (
    <div>
      <h2 className="mb-1 text-2xl font-semibold tracking-tight">Verlauf</h2>
      <p className="mb-5 text-sm text-neutral-500">
        {log.length} {log.length === 1 ? "Einheit" : "Einheiten"} aufgezeichnet.
      </p>

      {items.length === 0 && (
        <div className="rounded-2xl border border-surface-3 bg-surface-1 shadow-card p-8 text-center">
          <p className="text-neutral-400">Noch nichts aufgezeichnet.</p>
          <p className="mt-1 text-sm text-neutral-600">
            Starte deine erste Einheit, dann steht sie hier.
          </p>
        </div>
      )}

      <div className="space-y-2">
        {items.map((s, i) => {
          const realIdx = log.length - 1 - i;
          const isOpen = expanded === realIdx;
          const isDel = confirmDel === realIdx;
          const v = sessionVolume(s);
          return (
            <div key={s.date + i} className="overflow-hidden rounded-2xl border border-surface-3 bg-surface-1 shadow-card">
              <div className="flex items-center justify-between gap-2 px-4 py-3">
                <button
                  onClick={() => setExpanded(isOpen ? null : realIdx)}
                  className="flex min-w-0 flex-1 items-center justify-between text-left transition focus:outline-none"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-neutral-500">{s.dayKey}</span>
                      <span className="truncate font-medium">{s.dayName}</span>
                      {s.backTraffic && (
                        <span
                          className={cn("h-2 w-2 shrink-0 rounded-full", trafficDot[s.backTraffic])}
                          aria-label={`Rücken ${s.backTraffic}`}
                        />
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-neutral-500">
                      {fmtDate(s.date)} · {s.focus}
                    </p>
                  </div>
                  <div className="ml-2 shrink-0 text-right">
                    {v > 0 && (
                      <p className="font-mono text-sm tabular-nums text-accent-volume">
                        {v.toLocaleString("de-DE")} kg
                      </p>
                    )}
                    <p className="text-xs uppercase tracking-wider text-neutral-600">Volumen</p>
                  </div>
                </button>
                <Pressable
                  onClick={() => setConfirmDel(isDel ? null : realIdx)}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-neutral-500 focus:outline-none"
                >
                  <Trash2 size={16} />
                </Pressable>
              </div>

              {isDel && (
                <div className="flex items-center gap-2 px-4 pb-3">
                  <Pressable
                    onClick={() => {
                      void deleteSession(realIdx);
                      setConfirmDel(null);
                      if (isOpen) setExpanded(null);
                    }}
                    className="rounded-lg bg-rose-950 px-3 py-2 text-sm text-rose-300 focus:outline-none"
                  >
                    Einheit löschen
                  </Pressable>
                  <Pressable
                    onClick={() => setConfirmDel(null)}
                    className="rounded-lg px-3 py-2 text-sm text-neutral-400 focus:outline-none"
                  >
                    Abbrechen
                  </Pressable>
                </div>
              )}

              {isOpen && (
                <div className="space-y-2 px-4 pb-4 pt-1">
                  {s.exercises.map((ex) => (
                    <div key={ex.id} className="flex items-baseline justify-between gap-3">
                      <span className="text-sm text-neutral-300">{ex.name}</span>
                      <span className="text-right font-mono text-xs tabular-nums text-neutral-400">
                        {ex.sets
                          .filter((st) => !st.warmup)
                          .map((st) =>
                            ex.unit === "Sek"
                              ? `${st.reps}s`
                              : st.weight
                                ? `${st.weight}×${st.reps}`
                                : `${st.reps}`,
                          )
                          .join("  ") || "—"}
                      </span>
                    </div>
                  ))}
                  {s.note && (
                    <p className="mt-2 rounded-lg bg-neutral-950 px-3 py-2 text-sm italic text-neutral-300">
                      „{s.note}“
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
