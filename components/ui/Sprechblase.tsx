import { cn } from "@/lib/utils";

/**
 * ATLAS spricht „spotter“: runder Avatar „A“ (Sonne, Tinte-Rand) und eine
 * weiße Blase mit dickem Rand, unten links spitz. Kurz halten: ein bis zwei
 * Sätze. `avatar={false}` für Folge-Blasen direkt untereinander.
 */
export function Sprechblase({
  avatar = true,
  className,
  blaseClassName,
  children,
}: {
  avatar?: boolean;
  className?: string;
  blaseClassName?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("flex items-start gap-2.5", className)}>
      {avatar ? (
        <span
          aria-hidden
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-pill border-dick border-rand bg-sonne font-display text-base font-extrabold text-sonne-auf"
        >
          A
        </span>
      ) : (
        <span aria-hidden className="w-9 shrink-0" />
      )}
      <div
        className={cn(
          "min-w-0 rounded-card rounded-bl-xs border-dick border-rand bg-surface-1 px-3.5 py-2.5 text-base font-semibold leading-snug text-fg",
          blaseClassName,
        )}
      >
        {children}
      </div>
    </div>
  );
}
