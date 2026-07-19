"use client";

import { Bike, Dumbbell, Play, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AtlasMark } from "@/components/trainer/AtlasMark";
import { Card } from "@/components/ui/Card";
import { Pressable } from "@/components/ui/pressable";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { Readout } from "@/components/ui/Readout";
import { Reveal } from "@/components/ui/Reveal";
import { useTraining } from "@/components/providers/TrainingProvider";
import { fmtDate } from "@/lib/format";
import { sessionVolume } from "@/lib/stats";
import { cn } from "@/lib/utils";
import type { TrafficLight } from "@/lib/types";

const trafficDot: Record<TrafficLight, string> = {
  green: "bg-status-in",
  yellow: "bg-status-over",
  red: "bg-status-danger",
};

export default function HistoryPage() {
  const { log, cardio, deleteSession } = useTraining();
  const router = useRouter();
  const [expanded, setExpanded] = useState<number | null>(null);
  const [confirmDel, setConfirmDel] = useState<number | null>(null);
  const items = [...log].reverse();
  const totalT = Math.round(log.reduce((a, s) => a + sessionVolume(s), 0) / 100) / 10;

  return (
    <div>
      <PageHeader eyebrow="Logbuch" title="Verlauf" />

      {log.length > 0 && (
        <Reveal>
          <Card variant="elevated" className="edge-top mb-4 rounded-card p-5">
            <Readout
              eyebrow="Aufgezeichnet"
              value={log.length}
              unit={log.length === 1 ? "Einheit" : "Einheiten"}
              size="lg"
              hint={`${totalT} t insgesamt bewegt`}
            />
          </Card>
        </Reveal>
      )}

      {cardio.length > 0 && (
        <div className="mb-3 rounded-card border border-surface-3 bg-surface-1 p-4 shadow-card">
          <p className="mb-3 flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-muted">
            <Bike size={13} /> Kardio
          </p>
          <div className="space-y-1.5">
            {[...cardio]
              .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
              .slice(0, 8)
              .map((c) => (
                <div key={c.id} className="log-row flex items-center justify-between gap-2 text-sm">
                  <span className="min-w-0 truncate text-fg">{c.title ?? "Fahrt"}</span>
                  <span className="shrink-0 font-mono text-xs tabular-nums text-muted">
                    {fmtDate(c.date)} · {Math.round(c.durationSec / 60)} Min
                    {c.kj != null ? ` · ${c.kj} kJ` : ""}
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}

      {items.length === 0 && cardio.length === 0 && (
        <EmptyState
          icon={Dumbbell}
          title="Noch nichts aufgezeichnet"
          description="Starte deine erste Einheit — danach findest du hier deinen ganzen Verlauf."
          action={
            <Pressable
              onClick={() => router.push("/")}
              className="flex items-center justify-center gap-2 rounded-card bg-strong px-5 py-3 text-sm font-semibold text-on-strong shadow-card-lg focus:outline-none"
            >
              <Play size={16} strokeWidth={2.5} /> Erste Einheit starten
            </Pressable>
          }
        />
      )}

      <div className="space-y-2">
        {items.map((s, i) => {
          const realIdx = log.length - 1 - i;
          const isOpen = expanded === realIdx;
          const isDel = confirmDel === realIdx;
          const v = sessionVolume(s);
          return (
            <div key={s.date + i} className="overflow-hidden rounded-card border border-surface-3 bg-surface-1 shadow-card">
              <div className="flex items-center justify-between gap-2 px-4 py-3">
                <button
                  onClick={() => setExpanded(isOpen ? null : realIdx)}
                  className="flex min-w-0 flex-1 items-center justify-between rounded-card text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-sessions"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-muted">{s.dayKey}</span>
                      <span className="truncate font-medium">{s.dayName}</span>
                      {s.backTraffic && (
                        <span
                          className={cn("h-2 w-2 shrink-0 rounded-full", trafficDot[s.backTraffic])}
                          aria-label={`Rücken ${s.backTraffic}`}
                        />
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-muted">
                      {fmtDate(s.date)} · {s.focus}
                    </p>
                  </div>
                  <div className="ml-2 shrink-0 text-right">
                    {v > 0 && (
                      <p className="font-mono text-sm tabular-nums text-accent-ink">
                        {v.toLocaleString("de-DE")} kg
                      </p>
                    )}
                    <p className="text-xs uppercase tracking-wider text-faint">Volumen</p>
                  </div>
                </button>
                <Pressable
                  onClick={() => setConfirmDel(isDel ? null : realIdx)}
                  aria-label="Einheit löschen"
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-card text-muted focus:outline-none"
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
                    className="rounded-card bg-surface-2 px-3 py-2 text-sm font-medium text-status-danger focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-sessions"
                  >
                    Einheit löschen
                  </Pressable>
                  <Pressable
                    onClick={() => setConfirmDel(null)}
                    className="rounded-card px-3 py-2 text-sm text-muted focus:outline-none"
                  >
                    Abbrechen
                  </Pressable>
                </div>
              )}

              {isOpen && (
                <div className="space-y-1 px-4 pb-4 pt-1">
                  {(s.exercises ?? []).map((ex) => (
                    <div key={ex.id} className="log-row flex items-baseline justify-between gap-3">
                      <span className="text-sm text-muted">
                        {ex.name}
                        {ex.note && <span className="text-faint"> · {ex.note}</span>}
                      </span>
                      <span className="text-right font-mono text-xs tabular-nums text-muted">
                        {(ex.sets ?? [])
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
                  {s.debrief && s.debrief.length > 0 && (
                    <div className="mt-2 rounded-card bg-base px-3 py-2">
                      <p className="mb-1 flex items-center gap-1.5 font-mono text-xs uppercase tracking-widest text-accent-2">
                        <AtlasMark size={12} className="text-fg" /> ATLAS
                      </p>
                      <p className="text-sm italic leading-relaxed text-muted">
                        {s.debrief.join(" ")}
                      </p>
                    </div>
                  )}
                  {s.note && (
                    <p className="mt-2 rounded-card bg-base px-3 py-2 text-sm italic text-muted">
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
