import { cn } from "@/lib/utils";

type CardVariant = "base" | "elevated" | "glass";

const VARIANT: Record<CardVariant, string> = {
  // Flaches Modul München ’72: weiße Fläche, Hairline, leiser Schatten.
  base: "border border-line bg-surface-1 shadow-card",
  // Etwas mehr Präsenz für Fokus-Karten.
  elevated: "border border-line bg-surface-1 shadow-card-lg",
  // Frosted floating chrome.
  glass: "glass border border-line shadow-card",
};

/**
 * Shared card surface — DAS eine Panel-Rezept (`border-line bg-surface-1
 * shadow-card`). <section>-Panels tragen dieselben Klassen direkt, wo die
 * Semantik ein section-Element verlangt. Padding/Radius default sensibly and
 * can be overridden via `className` (twMerge resolves conflicts).
 */
export function Card({
  variant = "base",
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { variant?: CardVariant }) {
  return (
    <div className={cn("rounded-card p-4", VARIANT[variant], className)} {...props}>
      {children}
    </div>
  );
}
