"use client";

import type { HTMLMotionProps } from "framer-motion";
import { Pressable } from "@/components/ui/pressable";
import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "strong" | "secondary" | "ghost" | "danger";
type ButtonSize = "lg" | "sm";

/** Button-Rezepte „spotter“: Bricolage 800, Normalschreibung, dicker
 *  Tinte-Rand. Nur die Hauptaktion trägt den harten Versatz-Schatten; beim
 *  Drücken rutscht sie in den Schatten (Druck-Ruck aus Pressable dazu). */
const VARIANT: Record<ButtonVariant, string> = {
  // Elektroblau mit Rand und hartem Schatten — die Hauptaktion eines Bildschirms.
  primary:
    "border-dick border-rand bg-accent text-on-accent shadow-hart active:translate-x-0.5 active:translate-y-0.5 active:bg-accent-press active:shadow-hart-sm",
  // Tinte-Fläche — die zweite starke Aktion (z. B. „Weiter“ nach dem Rekord).
  strong: "border-dick border-rand bg-strong text-on-strong",
  // Weiße Fläche mit Tinte-Rand; gedrückt = eingelassene Fläche.
  secondary: "border-dick border-rand bg-surface-1 text-fg active:bg-surface-2",
  // Ohne Material — z. B. „Abbrechen" neben einer destruktiven Aktion.
  ghost: "text-muted active:text-fg",
  // Destruktiv, aber ruhig: Rand + Schrift in `gefahr`, kein voller Block.
  danger: "border-dick border-gefahr bg-transparent text-gefahr",
};

const SIZE: Record<ButtonSize, string> = {
  lg: "min-h-14 rounded-card px-5 py-3 text-xl",
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
        "flex items-center justify-center gap-2 font-display font-extrabold leading-tight disabled:opacity-40",
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
