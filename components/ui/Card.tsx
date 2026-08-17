import { cn } from "@/lib/utils";

type CardVariant = "base" | "elevated" | "glass";

/** Die Platte: Karton-Fläche, Faden-Rahmen (faden-flaeche), KEIN Schatten.
 *  Alle drei Alt-Varianten münden im selben flachen Rezept — Hervorhebung
 *  (offener Kader) trägt an der Nutzstelle border-accent-ink. */
const VARIANT: Record<CardVariant, string> = {
  base: "border border-line-card bg-surface-1",
  elevated: "border border-line-card bg-surface-1",
  glass: "border border-line-card bg-surface-1",
};

/**
 * Shared card surface — DAS eine Platten-Rezept (`border-line-card
 * bg-surface-1`). <section>-Panels tragen dieselben Klassen direkt, wo die
 * Semantik ein section-Element verlangt. Padding (14 px) / Radius (3 px)
 * default sensibly and can be overridden via `className` (twMerge).
 */
export function Card({
  variant = "base",
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { variant?: CardVariant }) {
  return (
    <div className={cn("rounded-card p-3.5", VARIANT[variant], className)} {...props}>
      {children}
    </div>
  );
}
