import { cn } from "@/lib/utils";

/**
 * Abschnitts-Kicker — EIN Rezept für alle Überschriften über Karten und
 * Sektionen (Versalien, gesperrt `tracking-label`, `text-muted`). Versalien kommen aus CSS,
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
        "text-3xs font-semibold uppercase tracking-label text-muted",
        className,
      )}
    >
      {children}
    </Tag>
  );
}
