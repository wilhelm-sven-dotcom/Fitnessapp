"use client";

import { FigurePanel } from "@/components/figures/FigurePanel";
import { FIG } from "@/components/figures/figureData";
import { useTraining } from "@/components/providers/TrainingProvider";
import { VideoLinkEditor } from "@/components/workout/VideoLinkEditor";
import { Sheet } from "@/components/ui/sheet";
import { useOffline } from "@/lib/use-offline";
import { cn } from "@/lib/utils";
import type { WarmupDrill } from "@/lib/warmup";

/** RAMP-Badge — dasselbe Farbmapping wie im Aufwärm-Player. */
function phaseBadge(phase: WarmupDrill["phase"]) {
  return phase === "raise"
    ? { label: "Puls", cls: "bg-accent-sessions text-on-accent" }
    : phase === "mobilise"
      ? { label: "Mobilität", cls: "bg-accent-coverage text-on-strong" }
      : { label: "Aktivierung", cls: "bg-accent-volume text-on-strong" };
}

/**
 * Detail-Sheet eines Aufwärm-Drills: Animation in Ruhe ansehen und ein
 * eigenes YouTube-Video verknüpfen, das der Aufwärm-Player dann zeigt.
 */
export function WarmupDrillSheet({
  open,
  onClose,
  drill,
}: {
  open: boolean;
  onClose: () => void;
  drill: WarmupDrill | null;
}) {
  const { warmupVideos, setWarmupVideo } = useTraining();
  const offline = useOffline();
  const fig = drill ? FIG[drill.figure ?? drill.id] : undefined;
  const badge = drill ? phaseBadge(drill.phase) : null;

  return (
    <Sheet open={open} onClose={onClose} title={drill?.name}>
      {drill && (
        <>
          {badge && (
            <span
              className={cn(
                "mb-3 inline-block rounded-full px-3 py-1 text-xs font-medium",
                badge.cls,
              )}
            >
              {badge.label}
            </span>
          )}

          {fig && (
            <div className="mx-auto mb-3 w-48 rounded-card border border-line bg-surface-0 p-2">
              <FigurePanel label="" fig={fig} viewKey="side" periodMs={drill.periodMs} />
            </div>
          )}

          <p className="mb-3 text-sm leading-relaxed text-fg">{drill.cue}</p>

          <div className="mb-2">
            <VideoLinkEditor
              key={drill.id}
              url={warmupVideos[drill.id]}
              offline={offline}
              prominent={!warmupVideos[drill.id]}
              onChange={(u) => setWarmupVideo(drill.id, u)}
            />
          </div>

          <p className="text-xs leading-relaxed text-faint">
            Das Video läuft stumm im Aufwärm-Player — Signaltöne und Countdown
            bleiben hörbar.
          </p>
        </>
      )}
    </Sheet>
  );
}
