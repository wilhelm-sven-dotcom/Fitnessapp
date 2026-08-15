"use client";

import { useMemo } from "react";
import { Sheet } from "@/components/ui/sheet";
import { useTraining } from "@/components/providers/TrainingProvider";
import {
  evaluateAchievements,
  trainingLevel,
  trainingXpParts,
} from "@/lib/achievements";
import { cn } from "@/lib/utils";

/**
 * Das Level erklärt sich selbst: die XP-Herleitung Zeile für Zeile (exakt
 * die Summanden, die auch der Balken addiert — Single Source in
 * lib/achievements) und darunter alle Abzeichen mit Stand. Gerechnet wird
 * nur bei geöffnetem Sheet.
 */
export function LevelSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { log, allLib, settings } = useTraining();

  const data = useMemo(() => {
    if (!open) return null;
    const input = { log, allLib, settings };
    return {
      lvl: trainingLevel(input),
      xp: trainingXpParts(input),
      badges: evaluateAchievements(input),
    };
  }, [open, log, allLib, settings]);

  const unlocked = data ? data.badges.filter((b) => b.unlocked).length : 0;

  return (
    <Sheet open={open} onClose={onClose} title="So entsteht dein Level">
      {data && (
        <div className="pb-2">
          <p className="text-sm leading-relaxed text-muted">
            XP sammeln sich aus dem, was die App ohnehin aufzeichnet — nichts
            davon musst du extra pflegen.
          </p>

          <ul className="mt-3">
            {data.xp.parts.map((p) => (
              <li
                key={p.label}
                className="flex items-center justify-between gap-3 border-b border-line py-2"
              >
                <div className="min-w-0">
                  <p className="text-sm text-fg">{p.label}</p>
                  <p className="font-mono text-xs tabular-nums text-faint">{p.detail}</p>
                </div>
                <span className="shrink-0 font-mono text-sm tabular-nums text-fg">
                  +{p.xp}
                </span>
              </li>
            ))}
          </ul>
          <div className="flex items-center justify-between py-2">
            <span className="text-sm font-semibold text-fg">Summe</span>
            <span className="font-mono text-sm font-semibold tabular-nums text-accent-ink">
              {data.xp.total} XP
            </span>
          </div>
          <p className="text-xs leading-relaxed text-muted">
            Level {data.lvl.level} · noch{" "}
            {Math.max(0, data.lvl.xpForNext - data.lvl.xp)} XP bis Level{" "}
            {data.lvl.level + 1}. Die Schwellen wachsen mit jedem Level.
          </p>

          <p className="mb-1 mt-6 font-mono text-xs uppercase tracking-widest text-accent-2">
            Abzeichen · {unlocked}/{data.badges.length}
          </p>
          <ul>
            {data.badges.map((b) => {
              const Icon = b.icon;
              return (
                <li
                  key={b.id}
                  className="flex items-start gap-3 border-b border-line py-2.5 last:border-0"
                >
                  <span
                    className={cn(
                      "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-sm",
                      b.unlocked ? "text-on-color" : "bg-surface-2 text-faint",
                    )}
                    style={b.unlocked ? { background: "var(--gruen)" } : undefined}
                  >
                    <Icon size={16} strokeWidth={2.5} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p
                        className={cn(
                          "min-w-0 truncate text-sm font-medium",
                          b.unlocked ? "text-fg" : "text-muted",
                        )}
                      >
                        {b.title}
                      </p>
                      <span className="shrink-0 rounded-sm bg-surface-2 px-1 py-0.5 font-mono text-xs uppercase tracking-wider text-faint">
                        {b.tier}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs leading-relaxed text-muted">{b.desc}</p>
                    {!b.unlocked && (
                      <div className="mt-1.5 flex items-center gap-2">
                        <div
                          className="h-1 flex-1 overflow-hidden rounded-full bg-surface-2"
                          aria-hidden
                        >
                          <div
                            className="h-full rounded-full bg-accent-volume"
                            style={{ width: `${Math.round(b.progress * 100)}%` }}
                          />
                        </div>
                        <span className="shrink-0 font-mono text-xs tabular-nums text-faint">
                          {b.valueLabel}
                        </span>
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </Sheet>
  );
}
