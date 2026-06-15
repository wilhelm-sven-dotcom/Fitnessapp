"use client";

import { FIG } from "@/components/figures/figureData";
import { FigurePanel } from "@/components/figures/FigurePanel";
import { Sheet } from "@/components/ui/sheet";
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
  return (
    <Sheet open={open} onClose={onClose} title={ex?.name}>
      {ex && (
        <>
          {fig ? (
            <div className="mb-4 flex items-end gap-1 rounded-2xl bg-neutral-950 p-2">
              <FigurePanel label="Seitlich" fig={fig} viewKey="side" />
              {fig.front ? (
                <FigurePanel label="Frontal" fig={fig} viewKey="front" />
              ) : (
                <FigurePanel label="Andere Seite" fig={fig} viewKey="side" flip />
              )}
            </div>
          ) : (
            <div className="mb-4 rounded-2xl bg-neutral-950 px-3 py-2">
              <p className="font-mono text-xs text-neutral-600">
                Animation folgt — Schritte unten.
              </p>
            </div>
          )}
          {ex.steps.length > 0 && (
            <ol className="mb-3 list-decimal space-y-1 pl-5">
              {ex.steps.map((s, i) => (
                <li key={i} className="text-sm text-neutral-200">
                  {s}
                </li>
              ))}
            </ol>
          )}
          {ex.back && (
            <div className="mb-2 rounded-xl bg-amber-950 px-3 py-2">
              <p className="mb-1 font-mono text-xs uppercase tracking-widest text-amber-400">
                Rücken
              </p>
              <p className="text-sm text-amber-100">{ex.back}</p>
            </div>
          )}
          {ex.easier && (
            <p className="text-xs text-neutral-400">
              <span className="font-medium text-neutral-200">Wenn&apos;s zwickt:</span>{" "}
              {ex.easier}
            </p>
          )}
        </>
      )}
    </Sheet>
  );
}
