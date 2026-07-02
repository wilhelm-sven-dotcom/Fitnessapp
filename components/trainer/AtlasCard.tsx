"use client";

import { ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { AtlasMark } from "@/components/trainer/AtlasMark";
import { Card } from "@/components/ui/Card";
import { Pressable } from "@/components/ui/pressable";
import { tap } from "@/lib/haptics";
import type { TrainerState, WatchSignal } from "@/lib/trainer";
import { cn } from "@/lib/utils";

const dotTone: Record<TrainerState["directive"]["severity"], string> = {
  urgent: "bg-status-danger",
  warn: "bg-status-over",
  info: "bg-status-in",
};

const chipTone: Record<WatchSignal["tone"], string> = {
  ok: "text-muted",
  watch: "text-status-over",
  alert: "text-status-danger",
};

/**
 * ATLAS auf der Startseite: die Tages-Direktive als Befehl + Begründung,
 * die Wochen-Mission als Mikro-Meter und die "Wache" als kompakte Chips.
 * Die ganze Karte führt zum Trainer-Chat.
 */
export function AtlasCard({
  trainer,
  className,
}: {
  trainer: TrainerState;
  className?: string;
}) {
  const router = useRouter();
  const { directive, mission, watch, statusLine } = trainer;
  // Karte bleibt ruhig: auffällige Signale zuerst, maximal vier Chips.
  const chips = [...watch].sort((a, b) => (a.tone === "ok" ? 1 : 0) - (b.tone === "ok" ? 1 : 0)).slice(0, 4);

  return (
    <Pressable
      onClick={() => {
        tap();
        router.push("/coach");
      }}
      aria-label="ATLAS öffnen"
      className="block w-full text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-sessions"
    >
      <Card
        variant="elevated"
        className={cn(
          "edge-top bg-hero-sheen p-5",
          directive.severity === "urgent" && "border-status-danger",
          className,
        )}
      >
        <div className="mb-3 flex items-center justify-between">
          <span className="flex items-center gap-2">
            <AtlasMark size={18} live className="text-fg" />
            <span className="font-mono text-xs uppercase tracking-widest text-accent-2">
              ATLAS
            </span>
          </span>
          <span className="flex items-center gap-2 font-mono text-xs text-faint">
            KW {mission.targets.kw}
            <span
              className={cn("h-1.5 w-1.5 rounded-full", dotTone[directive.severity])}
              aria-hidden
            />
          </span>
        </div>

        <p className="font-display text-xl font-bold leading-snug tracking-tight text-fg">
          {directive.text}
        </p>
        <p className="mt-1 text-xs leading-relaxed text-muted">{directive.reason}</p>

        <div className="mt-4 space-y-1.5">
          {mission.meters.map((m) => (
            <div key={m.id} className="flex items-center gap-2">
              <span className="w-20 shrink-0 truncate font-mono text-xs uppercase tracking-widest text-faint">
                {m.label}
              </span>
              <span className="h-1 flex-1 overflow-hidden rounded-full bg-surface-2" aria-hidden>
                <span
                  className={cn(
                    "block h-1 rounded-full",
                    m.done ? "bg-status-in" : "bg-accent-sessions",
                  )}
                  style={{ width: `${Math.round(m.pct * 100)}%` }}
                />
              </span>
              <span className="w-12 shrink-0 text-right font-mono text-xs tabular-nums text-fg">
                {m.current}/{m.target}
              </span>
            </div>
          ))}
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {chips.map((w) => (
            <span
              key={w.id}
              className={cn(
                "rounded-pill bg-surface-2 px-2 py-0.5 font-mono text-xs",
                chipTone[w.tone],
              )}
            >
              {w.label.toUpperCase()} {w.value}
            </span>
          ))}
        </div>

        <div className="mt-3 flex items-center justify-between gap-2">
          <p className="min-w-0 truncate text-xs italic text-faint">{statusLine}</p>
          <ChevronRight size={14} className="shrink-0 text-faint" aria-hidden />
        </div>
      </Card>
    </Pressable>
  );
}
