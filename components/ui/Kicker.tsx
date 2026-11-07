import { cn } from "@/lib/utils";

/**
 * Abschnitts-Kicker — EIN Rezept für alle Überschriften über Karten und
 * Sektionen (Versal-Mono, gesperrt, Schleier). Versalien kommen aus CSS,
 * im DOM steht Normalschreibung (Screenreader).
 */
export function Kicker({
  as: Tag = "p",
  className,
  children,
}: {
  as?: "p" | "h2" | "h3" | "span";
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Tag
      className={cn(
        "font-mono text-3xs font-semibold uppercase tracking-gesperrt-2 text-muted",
        className,
      )}
    >
      {children}
    </Tag>
  );
}
