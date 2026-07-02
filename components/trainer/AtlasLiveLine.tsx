"use client";

import { AtlasMark } from "@/components/trainer/AtlasMark";
import type { LiveLine } from "@/lib/trainer";
import { cn } from "@/lib/utils";

const toneText: Record<LiveLine["tone"], string> = {
  ok: "text-fg",
  watch: "text-status-over",
  push: "text-accent-ink",
};

/** ATLAS' Live-Kommentar in der aktiven Übungskarte — eine Zeile, die auf den
 *  letzten Satz reagiert (Rekordjagd, RIR, Tagesform, Progression). */
export function AtlasLiveLine({ line }: { line: LiveLine }) {
  return (
    <div className="mt-2 flex items-start gap-2 rounded-card bg-surface-2 px-3 py-2">
      <AtlasMark size={14} live className="mt-0.5 shrink-0 text-accent-ink" />
      <div className="min-w-0">
        <span className="font-mono text-xs uppercase tracking-widest text-faint">ATLAS</span>
        <p className={cn("text-xs leading-relaxed", toneText[line.tone])}>{line.text}</p>
      </div>
    </div>
  );
}
