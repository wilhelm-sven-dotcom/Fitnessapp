"use client";

import { PhasenFigur } from "@/components/phasen/PhasenFigur";
import { Pressable } from "@/components/ui/pressable";
import { PressableLink } from "@/components/ui/PressableLink";
import { PATTERN_FIGUR } from "@/lib/phasen/figuren";
import { geraeteLabels, ortMuster } from "@/lib/orte";
import { availableExercises } from "@/lib/today-session";
import type { Exercise, GymProfile } from "@/lib/types";

/**
 * Die Kacheln zu „Wo trainierst du heute?“ (die Frage selbst ist der Titel
 * der Heute-Seite). Steht beim ersten Öffnen des Tages statt der Einheit,
 * sobald es zwei oder mehr Orte gibt. Erst der Tipp löst die Komposition
 * aus: so plant ATLAS nie eine Einheit für den falschen Ort (jede
 * Komposition ist eine volle Opus-Runde).
 */
export function OrtFrage({
  gyms,
  zuletztId,
  allLib,
  disabled,
  onWaehle,
}: {
  gyms: GymProfile[];
  /** Zuletzt genutzter Ort — bekommt die Marke „zuletzt“. */
  zuletztId?: string;
  allLib: Exercise[];
  disabled: readonly string[];
  onWaehle: (id: string) => void;
}) {
  return (
    <div className="mb-4">
      <div className="grid grid-cols-2 gap-2">
        {gyms.map((g) => {
          const has = (k: string) => (g.equip as string[]).includes(k);
          const zahl = availableExercises(allLib, has, disabled).length;
          const labels = geraeteLabels(g.equip);
          const geraete =
            labels.length > 2
              ? `${labels.slice(0, 2).join(" · ")} · +${labels.length - 2}`
              : labels.join(" · ") || "Ohne Geräte";
          return (
            <Pressable
              key={g.id}
              onClick={() => onWaehle(g.id)}
              className="flex min-h-11 flex-col items-start rounded-card border border-line-card bg-surface-1 p-4 text-left"
            >
              <span aria-hidden className="block w-14 text-fg">
                <PhasenFigur figur={PATTERN_FIGUR[ortMuster(g)]} color="var(--fg)" />
              </span>
              <span className="mt-2 font-display font-bold text-xl leading-tight text-fg">
                {g.name}
              </span>
              <span className="mt-1 font-mono text-3xs font-semibold uppercase tracking-label text-muted">
                <span className="tabular-nums">{zahl}</span> Übungen
                {g.id === zuletztId && <span className="text-info"> · zuletzt</span>}
              </span>
              <span className="mt-0.5 font-mono text-4xs uppercase tracking-label text-muted">
                {geraete}
              </span>
            </Pressable>
          );
        })}
      </div>
      <PressableLink
        href="/settings"
        className="mt-3 inline-block rounded-pill py-1 font-mono text-3xs font-semibold uppercase tracking-label text-muted"
      >
        Orte & Geräte bearbeiten →
      </PressableLink>
    </div>
  );
}
