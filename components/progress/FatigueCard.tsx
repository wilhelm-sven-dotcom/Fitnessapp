"use client";

import { Activity } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Reveal } from "@/components/ui/Reveal";
import { fatigueState, type FatigueBand } from "@/lib/fatigue";
import type { CardioSession, LoggedSession } from "@/lib/types";

// Semantic status colours (fixed, like the volume rings) — not the skin accent.
const BANDS: { id: FatigueBand; color: string }[] = [
  { id: "frisch", color: "#0a84ff" },
  { id: "normal", color: "#30d158" },
  { id: "erhöht", color: "#ff9f0a" },
  { id: "hoch", color: "#ff375f" },
];

export function FatigueCard({ log, cardio }: { log: LoggedSession[]; cardio: CardioSession[] }) {
  if (!log.length) return null;
  const f = fatigueState(log, cardio);
  const activeIdx = BANDS.findIndex((b) => b.id === f.band);

  return (
    <Reveal>
      <Card variant="elevated" className="edge-top mb-4 rounded-card p-5">
        <div className="mb-3 flex items-center justify-between">
          <span className="flex items-center gap-1.5 font-mono text-xs uppercase tracking-widest text-accent-2">
            <Activity size={13} className="text-accent-ink" /> Belastung
          </span>
          {f.enough && (
            <span className="font-mono text-xs text-faint">
              Akut/Schnitt {f.ratio.toFixed(2).replace(".", ",")}
            </span>
          )}
        </div>
        <div className="flex gap-1" aria-hidden>
          {BANDS.map((b, i) => (
            <div
              key={b.id}
              className="h-2 flex-1 rounded-pill transition-colors"
              style={{ background: i === activeIdx ? b.color : "var(--surface-2)" }}
            />
          ))}
        </div>
        <p className="mt-3 font-display text-2xl font-bold tracking-tight text-fg">{f.title}</p>
        <p className="mt-1 text-sm text-muted">{f.message}</p>
      </Card>
    </Reveal>
  );
}
