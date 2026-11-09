import { cn } from "@/lib/utils";

type CardVariant = "base" | "elevated" | "glass";

/** Karte „spotter“: weiße Fläche, dicker Tinte-Rand. `elevated` trägt
 *  zusätzlich den harten Versatz-Schatten — für die EINE Karte, um die es auf
 *  einem Bildschirm geht (Einheit heute, offener Satz). */
const VARIANT: Record<CardVariant, string> = {
  base: "border-dick border-rand bg-surface-1",
  elevated: "border-dick border-rand bg-surface-1 shadow-hart",
  glass: "border-dick border-rand bg-surface-1",
};

/**
 * DAS Karten-Rezept. <section>-Panels tragen dieselben Klassen direkt
 * (`rounded-card border-dick border-rand bg-surface-1`), wo die Semantik ein
 * section-Element verlangt. Padding und Radius über `className` (twMerge).
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
