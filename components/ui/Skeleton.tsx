import { cn } from "@/lib/utils";

/**
 * Lade-Platzhalter: Schleier-Fläche, Radius 1. Default STATISCH (der
 * App-Boot dauert Millisekunden — Blinken wäre Flacker-Theater); `pulse`
 * nur bei echter Wartezeit → hartes step-end-Blinken 35 ↔ 14 % (CSS-Klasse
 * skel-blink in globals.css, inkl. Reduced-Motion-Gate auf statisch 24 %).
 * Container trägt `aria-busy`.
 */
export function Skeleton({
  className,
  pulse = false,
}: {
  className?: string;
  pulse?: boolean;
}) {
  return (
    <div
      aria-hidden
      className={cn("rounded-xs bg-muted", pulse && "skel-blink", className)}
      style={pulse ? undefined : { opacity: 0.35 }}
    />
  );
}
