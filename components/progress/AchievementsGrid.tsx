"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Check, Medal } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  PLATE_FAINT,
  PLATE_INK,
  PLATE_RED,
  PlateFrame,
  romanNumeral,
} from "@/components/flipbook/PlateFrame";
import { AchievementVignette } from "@/components/flipbook/vignettes";
import { Card } from "@/components/ui/Card";
import { Reveal } from "@/components/ui/Reveal";
import { useTraining } from "@/components/providers/TrainingProvider";
import { evaluateAchievements, type Tier } from "@/lib/achievements";
import { success } from "@/lib/haptics";
import { cn } from "@/lib/utils";

// Tier färbt die „Taf."-Nummer der Sammel-Tafel (bronze/silber/gold).
const TIER_MARK: Record<Tier, string> = {
  bronze: PLATE_FAINT,
  silber: PLATE_INK,
  gold: PLATE_RED,
};

export function AchievementsGrid() {
  const { log, allLib, settings } = useTraining();
  const items = useMemo(
    () => evaluateAchievements({ log, allLib, settings }),
    [log, allLib, settings],
  );
  const reduce = useReducedMotion();
  const [fresh, setFresh] = useState<Set<string>>(new Set());

  // Celebrate badges unlocked since this device last saw the grid — a session-only
  // snapshot, so no new persisted/synced key is introduced.
  const unlockedSig = items.filter((i) => i.unlocked).map((i) => i.id).sort().join(",");
  useEffect(() => {
    if (typeof window === "undefined") return;
    const unlockedIds = items.filter((i) => i.unlocked).map((i) => i.id);
    let seen: string[] = [];
    try {
      seen = JSON.parse(sessionStorage.getItem("ach-seen") || "[]");
    } catch {
      seen = [];
    }
    const newly = unlockedIds.filter((id) => !seen.includes(id));
    if (newly.length) {
      setFresh(new Set(newly));
      success();
    }
    sessionStorage.setItem("ach-seen", JSON.stringify(unlockedIds));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unlockedSig]);

  if (!log.length) return null;
  const count = items.filter((i) => i.unlocked).length;

  return (
    <Reveal>
      <Card variant="elevated" className="edge-top mb-4 rounded-card p-5">
        <div className="mb-3 flex items-center justify-between">
          <span className="flex items-center gap-1.5 font-mono text-xs uppercase tracking-widest text-accent-2">
            <Medal size={13} className="text-accent-ink" /> Erfolge · Das Sammelalbum
          </span>
          <span className="font-mono text-xs tabular-nums text-faint">
            {count}/{items.length}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {items.map((a, i) => {
            const isFresh = fresh.has(a.id);
            return (
              <motion.div
                key={a.id}
                initial={isFresh && !reduce ? { scale: 0.7, opacity: 0 } : false}
                animate={isFresh && !reduce ? { scale: [0.7, 1.15, 1], opacity: 1 } : undefined}
                transition={{ duration: 0.5 }}
              >
                {/* Eingeklebte Sammel-Tafel: frei = voll entwickelt, gesperrt =
                    vergilbter Umriss. Die Tafel-Nummer trägt die Tier-Farbe. */}
                <PlateFrame
                  mark={`Taf. ${romanNumeral(i + 1)}`}
                  markColor={a.unlocked ? TIER_MARK[a.tier] : PLATE_FAINT}
                  tone={a.unlocked ? "full" : "muted"}
                >
                  <AchievementVignette id={a.id} muted={!a.unlocked} />
                </PlateFrame>
                <p
                  className={cn(
                    "mt-2 truncate text-sm font-medium",
                    a.unlocked ? "text-fg" : "text-muted",
                  )}
                >
                  {a.title}
                </p>
                <p className="mt-0.5 text-xs leading-snug text-muted">{a.desc}</p>
                {a.unlocked ? (
                  <p className="mt-1.5 flex items-center gap-1 font-mono text-xs tabular-nums text-accent-ink">
                    <Check size={12} strokeWidth={2.5} /> {a.valueLabel}
                  </p>
                ) : (
                  <>
                    <div className="mt-1.5 h-1 overflow-hidden rounded-pill bg-surface-2" aria-hidden>
                      <div
                        className="h-full rounded-pill bg-accent-2"
                        style={{ width: `${Math.round(a.progress * 100)}%` }}
                      />
                    </div>
                    <p className="mt-1 font-mono text-xs tabular-nums text-faint">{a.valueLabel}</p>
                  </>
                )}
              </motion.div>
            );
          })}
        </div>
      </Card>
    </Reveal>
  );
}
