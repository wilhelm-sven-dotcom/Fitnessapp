"use client";

import { Trophy } from "lucide-react";
import { useMemo } from "react";
import { Card } from "@/components/ui/Card";
import { Readout } from "@/components/ui/Readout";
import { Reveal } from "@/components/ui/Reveal";
import { SkinSignature } from "@/components/ui/SkinSignature";
import { useTraining } from "@/components/providers/TrainingProvider";
import { trainingLevel } from "@/lib/achievements";

/** Trainingslevel hero — the big number is the level (in the skin's display face,
 *  so it reads as a magazine numeral under editorial). XP blends consistency,
 *  volume, PRs and breadth; the bar shows progress to the next level. */
export function LevelCard() {
  const { log, allLib, settings } = useTraining();
  const lvl = useMemo(() => trainingLevel({ log, allLib, settings }), [log, allLib, settings]);
  const remaining = Math.max(0, lvl.xpForNext - lvl.xp);

  return (
    <Reveal>
      <Card variant="elevated" className="edge-top mb-4 rounded-card p-5">
        <div className="mb-3 flex items-center justify-between">
          <span className="flex items-center gap-1.5 font-mono text-xs uppercase tracking-widest text-accent-2">
            <Trophy size={13} className="text-accent-ink" /> Trainingslevel
          </span>
          <span className="font-mono text-xs tabular-nums text-faint">{lvl.xp} XP</span>
        </div>

        <Readout value={lvl.level} eyebrow={`Level · ${lvl.title}`} size="lg" tone="var(--accent-ink)" />

        <div className="mt-4 h-1.5 overflow-hidden rounded-pill bg-surface-2" aria-hidden>
          <div
            className="h-full rounded-pill bg-accent-sessions transition-[width] duration-500"
            style={{ width: `${Math.round(lvl.pct * 100)}%`, boxShadow: "0 0 10px -1px var(--accent)" }}
          />
        </div>
        <p className="mt-2 text-xs text-muted">
          {log.length === 0
            ? "Erste Einheit starten und Level 2 freischalten."
            : `Noch ${remaining} XP bis Level ${lvl.level + 1}.`}
        </p>
        <SkinSignature />
      </Card>
    </Reveal>
  );
}
