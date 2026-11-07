"use client";

import type { HTMLMotionProps } from "framer-motion";
import { Pressable } from "@/components/ui/pressable";
import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "strong" | "secondary" | "ghost" | "danger";
type ButtonSize = "lg" | "sm";

/** Button-Rezepte „Regionen“: Pille, Normalschreibung, 700, keine Schatten.
 *  Gedrückt = Fläche `accent-press`; der Druck-Ruck kommt aus Pressable. */
const VARIANT: Record<ButtonVariant, string> = {
  // Tinte-Fläche — die Hauptaktion eines Bildschirms.
  primary: "bg-accent text-on-accent active:bg-accent-press",
  // Tinte-Fläche (Chip-Logik groß) — für Sekundär-Momente mit Gewicht.
  strong: "bg-strong text-on-strong",
  // 1px-Tinte-Rahmen, transparent; Down = Faden-Fläche.
  secondary: "border border-line bg-transparent text-fg active:bg-surface-2",
  // Ohne Material — z. B. „Abbrechen" neben einer destruktiven Aktion.
  ghost: "text-muted active:text-fg",
  // Destruktiv, aber ruhig: Rand + Schrift in `gefahr`, kein voller Block.
  danger: "border border-gefahr bg-transparent text-gefahr",
};

const SIZE: Record<ButtonSize, string> = {
  lg: "min-h-14 rounded-pill px-5 py-3 text-lg",
  sm: "min-h-11 rounded-pill px-4 py-2 text-base",
};

/**
 * DER Aktions-Button (auf Pressable: Filmtransport-Press + Fokus-Ring).
 * Ein Rezept statt drei: Varianten/Größen hier nachschlagen, Abweichungen
 * über `className` (twMerge löst Konflikte — gleicher Vertrag wie Card).
 * Icons als Children (lucide, size 16–20).
 */
export function Button({
  variant = "primary",
  size = "sm",
  full,
  className,
  children,
  ...props
}: HTMLMotionProps<"button"> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** w-full — die häufigste Form für Screen-CTAs. */
  full?: boolean;
}) {
  return (
    <Pressable
      className={cn(
        "flex items-center justify-center gap-2 font-bold leading-tight disabled:opacity-40",
        SIZE[size],
        VARIANT[variant],
        full && "w-full",
        className,
      )}
      {...props}
    >
      {children}
    </Pressable>
  );
}
