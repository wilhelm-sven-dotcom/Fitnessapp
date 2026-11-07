"use client";

import { Pressable } from "@/components/ui/pressable";
import { cn } from "@/lib/utils";

/**
 * DER wählbare Chip (Mehrfachauswahl, Filter): Pille, Versal-Mono, aktiv in
 * Tinte, inaktiv mit Faden-Rahmen. Ersetzt die früheren Einzel-Rezepte in
 * Profil, Begrüßung, Katalog-Filtern und Übungs-Editor. Der reine Hinweis-
 * Chip ohne Bedienung bleibt `Chip`.
 */
export function ChipToggle({
  active,
  onClick,
  children,
  className,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Pressable
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "min-h-9 shrink-0 rounded-pill border px-3.5 py-1.5 text-sm font-semibold",
        active ? "border-strong bg-strong text-on-strong" : "border-line bg-transparent text-fg",
        className,
      )}
    >
      {children}
    </Pressable>
  );
}
