"use client";

import type { HTMLMotionProps } from "framer-motion";
import { Pressable } from "@/components/ui/pressable";
import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "strong" | "secondary" | "ghost" | "danger";
type ButtonSize = "lg" | "sm";

/** Button-Rezepte Platte 311 (Handoff-Tabelle): Versal-Mono, gesperrt,
 *  Radius 2 px, keine Schatten. Down-Zustand = Fläche hart 8 % dunkler
 *  (accent-press) — der Scale-Ruck kommt aus Pressable. */
const VARIANT: Record<ButtonVariant, string> = {
  // Das Siegellack-Vollfeld — EIN kräftiger Moment pro Screen.
  primary: "bg-accent-sessions text-on-accent active:bg-accent-press",
  // Tinte-Fläche (Chip-Logik groß) — für Sekundär-Momente mit Gewicht.
  strong: "bg-strong text-on-strong",
  // 1px-Tinte-Rahmen, transparent; Down = Faden-Fläche.
  secondary: "border border-strong bg-transparent text-fg active:bg-surface-2",
  // Ohne Material — z. B. „Abbrechen" neben einer destruktiven Aktion.
  ghost: "text-muted active:text-fg",
  // Destruktiv, aber ruhig: Siegellack-Rahmen + -Schrift, kein voller Block.
  danger: "border border-accent-ink bg-transparent text-accent-ink",
};

const SIZE: Record<ButtonSize, string> = {
  lg: "rounded-pill px-4 py-4 text-sm",
  sm: "rounded-pill px-4 py-2.5 text-xs",
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
        "flex items-center justify-center gap-2 font-mono font-semibold uppercase tracking-gesperrt-2 disabled:opacity-40",
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
