import { cn } from "@/lib/utils";

type CardVariant = "base" | "elevated" | "glass";

const VARIANT: Record<CardVariant, string> = {
  // Material on surface-0: tinted surface + hairline + soft depth.
  base: "border border-surface-3 bg-surface-1 shadow-card",
  // A touch more lift for hero / focal cards.
  elevated: "border border-surface-3 bg-surface-1 shadow-card-lg",
  // Frosted floating chrome.
  glass: "glass border border-surface-3 shadow-card",
};

/**
 * Shared card surface. Replaces the copy-pasted `rounded-2xl bg-surface-1 p-4`
 * pattern with one elevated material. Padding/radius default sensibly and can be
 * overridden via `className` (twMerge resolves conflicts).
 */
export function Card({
  variant = "base",
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { variant?: CardVariant }) {
  return (
    <div className={cn("rounded-2xl p-4", VARIANT[variant], className)} {...props}>
      {children}
    </div>
  );
}
