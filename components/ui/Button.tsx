"use client";

import type { HTMLMotionProps } from "framer-motion";
import { Pressable } from "@/components/ui/pressable";
import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "strong" | "secondary" | "ghost" | "danger";
type ButtonSize = "lg" | "sm";

const VARIANT: Record<ButtonVariant, string> = {
  // Das blaue Vollfeld — EIN kräftiger Moment pro Screen.
  primary: "bg-accent-sessions text-on-accent",
  // Mono-Alternative (Anthrazit/Weiß je Theme).
  strong: "bg-strong text-on-strong",
  secondary: "bg-surface-2 text-fg",
  // Ohne Material — z. B. „Abbrechen" neben einer destruktiven Aktion.
  ghost: "text-muted",
  // Destruktiv, aber ruhig: rote Schrift statt rotem Block.
  danger: "bg-surface-2 text-status-danger",
};

const SIZE: Record<ButtonSize, string> = {
  lg: "rounded-card py-4 text-lg font-bold",
  sm: "rounded-pill px-4 py-2.5 text-sm font-medium",
};

/**
 * DER Aktions-Button (auf Pressable: Tap-Scale + Fokus-Ring inklusive).
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
        "flex items-center justify-center gap-2 disabled:opacity-40",
        SIZE[size],
        VARIANT[variant],
        size === "lg" && (variant === "primary" || variant === "strong") && "shadow-card-lg",
        full && "w-full",
        className,
      )}
      {...props}
    >
      {children}
    </Pressable>
  );
}
