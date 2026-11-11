"use client";

import { Pressable } from "@/components/ui/pressable";
import { cn } from "@/lib/utils";

/**
 * DER wählbare Chip (Mehrfachauswahl, Filter): Pille mit dickem Tinte-Rand,
 * aktiv als Tinte-Fläche, inaktiv weiß (beide voll lesbar). Ersetzt die früheren Einzel-Rezepte in
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
        "min-h-11 shrink-0 rounded-pill border-dick border-rand px-3.5 py-1.5 font-display text-sm font-extrabold",
        active ? "bg-strong text-on-strong" : "bg-surface-1 text-fg",
        className,
      )}
    >
      {children}
    </Pressable>
  );
}
