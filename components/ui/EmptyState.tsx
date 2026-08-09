"use client";

import type { LucideIcon } from "lucide-react";

/**
 * Ruhiger Leer-/Nicht-konfiguriert-Zustand: Icon in einer stillen Fläche,
 * Titel, optionale Beschreibung und Call-to-Action. Kein Eintritts-Theater.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center px-6 py-12 text-center">
      <div
        aria-hidden
        className="mb-5 flex h-16 w-16 items-center justify-center rounded-full border border-line bg-surface-2"
      >
        <Icon size={26} className="text-muted" />
      </div>
      <h3 className="font-display text-lg font-semibold tracking-tight text-fg">{title}</h3>
      {description && (
        <p className="mt-2 max-w-xs text-sm leading-relaxed text-muted">{description}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
