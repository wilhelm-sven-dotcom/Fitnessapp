"use client";

import { useReducedMotion } from "framer-motion";
import { REGION_VAR, type EtappenBlock } from "@/lib/etappen";
import { cn } from "@/lib/utils";

const SIZE_CLS = { hero: "h-16", mini: "h-8", strip: "h-5" } as const;

/**
 * Der eine geteilte Renderer des Etappen-Profils: flache Farbblöcke auf einer
 * Hairline-Grundlinie. Flex-Divs statt SVG — die Live-Füllung muss auf jedem
 * Gerät sauber transitionieren (SVG-Geometrie-Transitions sind auf älterem
 * iOS-WebKit unzuverlässig). Beim bloßen Ansehen bewegt sich NICHTS; nur die
 * Live-Füllung reagiert auf Datenänderung (Satz-Commit).
 */
export function EtappenProfil({
  blocks,
  size = "hero",
  live = false,
  currentKey,
  className,
}: {
  blocks: EtappenBlock[];
  size?: keyof typeof SIZE_CLS;
  /** Geist-Blöcke + Füllstand (laufende Einheit). */
  live?: boolean;
  /** Markiert den aktiven Block (nur live) mit einem Tinte-Strich darunter. */
  currentKey?: string;
  className?: string;
}) {
  const reduce = useReducedMotion();
  if (blocks.length === 0) return null;

  return (
    <div
      role="img"
      aria-label="Etappen-Profil der Einheit"
      className={cn("flex items-end gap-0.5 border-b border-line", SIZE_CLS[size], className)}
    >
      {blocks.map((b) => {
        const color = b.region ? REGION_VAR[b.region] : "var(--muted)";
        return (
          <div
            key={b.key}
            className="relative flex h-full min-w-0 items-end"
            style={{ flexGrow: b.w, flexBasis: 0 }}
          >
            {live ? (
              <div
                className="relative flex w-full items-end bg-surface-2"
                style={{ height: `${b.h * 100}%` }}
              >
                <div
                  className={cn(
                    "w-full",
                    !reduce && "transition-[height] duration-300 ease-out",
                  )}
                  style={{ height: `${b.done * 100}%`, backgroundColor: color }}
                />
              </div>
            ) : (
              <div
                className="w-full"
                style={{ height: `${b.h * 100}%`, backgroundColor: color }}
              />
            )}
            {live && currentKey === b.key && (
              <span
                aria-hidden
                className="absolute inset-x-0 -bottom-1 h-0.5 bg-fg"
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
