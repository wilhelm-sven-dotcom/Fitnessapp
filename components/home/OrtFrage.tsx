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
              className="flex min-h-11 flex-col items-start rounded-card border-dick border-rand bg-surface-1 p-4 text-left shadow-hart-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-fokus"
            >
              <span aria-hidden className="block w-14 text-fg">
                <PhasenFigur figur={PATTERN_FIGUR[ortMuster(g)]} color="var(--fg)" />
              </span>
              <span className="mt-2 font-display text-xl font-extrabold leading-tight text-fg">
                {g.name}
              </span>
              <span className="mt-1 text-sm tabular-nums text-muted">
                {zahl} Übungen
                {g.id === zuletztId && <span className="font-semibold text-fg"> · zuletzt</span>}
              </span>
              <span className="mt-0.5 text-sm leading-snug text-muted">{geraete}</span>
            </Pressable>
          );
        })}
      </div>
      <PressableLink
        href="/settings"
        className="mt-2 inline-flex min-h-11 items-center rounded-pill text-sm font-semibold text-fg underline underline-offset-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-fokus"
      >
        Orte & Geräte bearbeiten
      </PressableLink>
    </div>
  );
}
