import { cn } from "@/lib/utils";

/**
 * Abschnitts-Kicker — EIN Rezept für alle Überschriften über Karten und
 * Sektionen: Normalschreibung, fett, `text-muted` (der Kumpel spricht, er
 * beschriftet nicht in Versalien).
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
        "text-sm font-bold text-muted",
        className,
      )}
    >
      {children}
    </Tag>
  );
}
