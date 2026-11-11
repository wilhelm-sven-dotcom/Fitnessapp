"use client";

import type { LucideIcon } from "lucide-react";
import { momentUrl, type Moment } from "@/lib/momente";

/**
 * Ruhiger Leer-/Nicht-konfiguriert-Zustand: ein Sticker-Bild (`bild`, aus
 * `public/momente/`) oder ein Icon in einer stillen Fläche, Titel, optionale
 * Beschreibung und Call-to-Action. Kein Eintritts-Theater.
 */
export function EmptyState({
  icon: Icon,
  bild,
  title,
  description,
  action,
}: {
  icon?: LucideIcon;
  /** Sticker statt Icon. Schmuck: der Titel sagt, worum es geht. */
  bild?: Moment;
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center px-6 py-12 text-center">
      {bild ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={momentUrl(bild)}
          alt=""
          aria-hidden
          decoding="async"
          draggable={false}
          className="mb-4 h-36 w-36"
        />
      ) : (
        Icon && (
          <div
            aria-hidden
            className="mb-5 flex h-16 w-16 items-center justify-center rounded-pill bg-surface-2"
          >
            <Icon size={26} className="text-muted" />
          </div>
        )
      )}
      <h3 className="font-display text-xl font-bold text-fg">{title}</h3>
      {description && (
        <p className="mt-2 max-w-xs text-sm leading-relaxed text-muted">{description}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
