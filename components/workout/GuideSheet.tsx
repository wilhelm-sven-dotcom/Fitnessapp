"use client";

import { useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";
import { FIG, muscleBones } from "@/components/figures/figureData";
import { FigurePanel } from "@/components/figures/FigurePanel";
import { Sheet } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import type { Exercise } from "@/lib/types";

export function GuideSheet({
  open,
  onClose,
  ex,
}: {
  open: boolean;
  onClose: () => void;
  ex: Exercise | null;
}) {
  const fig = ex ? FIG[ex.id] : undefined;
  const accent = ex ? muscleBones(ex.pattern) : undefined;
  // Real clip by convention: explicit videoUrl, else /exercise-media/<id>.mp4 if
  // it exists (drop a file in → it shows, no code change). Probed per exercise.
  const videoSrc = ex ? ex.videoUrl ?? `/exercise-media/${ex.id}.mp4` : undefined;
  const [hasVideo, setHasVideo] = useState(false);
  const [mode, setMode] = useState<"video" | "figure">("figure");

  useEffect(() => {
    setHasVideo(false);
    setMode("figure");
    if (!videoSrc) return;
    let on = true;
    fetch(videoSrc, { method: "HEAD" })
      .then((r) => {
        if (on && r.ok) {
          setHasVideo(true);
          setMode("video");
        }
      })
      .catch(() => {});
    return () => {
      on = false;
    };
  }, [ex?.id, ex?.videoUrl, videoSrc]);

  // Step ↔ pose sync: walk the active step in the figure's rhythm (half period).
  const reduce = useReducedMotion();
  const stepCount = ex?.steps.length ?? 0;
  const syncing = mode === "figure" && !!fig && !reduce && stepCount >= 2;
  const [activeStep, setActiveStep] = useState(0);
  useEffect(() => {
    setActiveStep(0);
    if (!syncing) return;
    const id = setInterval(() => setActiveStep((s) => (s + 1) % stepCount), 1300);
    return () => clearInterval(id);
  }, [ex?.id, syncing, stepCount]);

  return (
    <Sheet open={open} onClose={onClose} title={ex?.name}>
      {ex && (
        <>
          {hasVideo && (
            <div className="mb-3 flex gap-1 rounded-pill bg-surface-2 p-1">
              {(["video", "figure"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  className={cn(
                    "flex-1 rounded-pill py-1.5 text-xs font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-sessions",
                    mode === m ? "bg-strong text-on-strong" : "text-muted",
                  )}
                >
                  {m === "video" ? "Video" : "Illustration"}
                </button>
              ))}
            </div>
          )}

          {hasVideo && mode === "video" ? (
            <video
              src={videoSrc}
              className="mb-3 w-full rounded-card border border-line bg-base"
              loop
              muted
              playsInline
              autoPlay
              controls
            />
          ) : fig ? (
            <div className="mb-3 flex items-end gap-1 rounded-card border border-line bg-base p-3">
              <FigurePanel label="Seitlich" fig={fig} viewKey="side" accentBones={accent} />
              {fig.front ? (
                <FigurePanel label="Frontal" fig={fig} viewKey="front" accentBones={accent} />
              ) : (
                <FigurePanel label="Andere Seite" fig={fig} viewKey="side" flip accentBones={accent} />
              )}
            </div>
          ) : (
            <div className="mb-3 rounded-card border border-line bg-base px-3 py-2">
              <p className="font-mono text-xs text-faint">Animation folgt — Schritte unten.</p>
            </div>
          )}

          {/* Colour legend + worked area. */}
          {mode === "figure" && fig && (
            <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
              <span className="flex items-center gap-1.5">
                <span aria-hidden className="h-2.5 w-2.5 rounded-full bg-accent-sessions" />
                Arbeitsmuskeln{ex.tag ? ` · ${ex.tag}` : ""}
              </span>
              <span className="flex items-center gap-1.5">
                <span aria-hidden className="h-2.5 w-2.5 rounded-full" style={{ background: "#34d399" }} />
                Wirbelsäule neutral
              </span>
            </div>
          )}

          {ex.cue && (
            <p className="mb-3 rounded-card border border-line bg-surface-1 px-3 py-2 text-sm text-fg">
              <span className="font-medium text-accent-sessions">Technik: </span>
              {ex.cue}
            </p>
          )}

          {ex.steps.length > 0 && (
            <ol className="mb-3 list-decimal space-y-1.5 pl-5 marker:font-mono marker:text-faint">
              {ex.steps.map((s, i) => (
                <li
                  key={i}
                  className={cn(
                    "text-sm transition-colors",
                    syncing ? (i === activeStep ? "font-medium text-fg" : "text-muted") : "text-fg",
                  )}
                >
                  {s}
                </li>
              ))}
            </ol>
          )}

          {ex.back && (
            <div className="mb-2 rounded-card border border-line px-3 py-2" style={{ background: "rgba(255,159,10,0.12)" }}>
              <p className="mb-1 font-mono text-xs uppercase tracking-widest" style={{ color: "#ff9f0a" }}>
                Rücken
              </p>
              <p className="text-sm text-fg">{ex.back}</p>
            </div>
          )}

          {ex.easier && (
            <p className="text-xs text-muted">
              <span className="font-medium text-fg">Wenn&apos;s zwickt:</span> {ex.easier}
            </p>
          )}
        </>
      )}
    </Sheet>
  );
}
