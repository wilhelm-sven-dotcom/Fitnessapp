import { cn } from "@/lib/utils";
import type { ChipTone } from "@/lib/coaching";

// Hinweis-Chip: Pille mit Rand `border-line`, Ton nur als Schriftfarbe
// (Warnung = über Ziel, Erfolg = im Ziel).
const toneClass: Record<ChipTone, string> = {
  amber: "text-status-over",
  emerald: "text-status-in",
  info: "text-muted",
};

/** Statischer Hinweis-Chip — ohne Mount-Einflug (Navigation ist sofort). */
export function Chip({
  tone,
  children,
}: {
  tone: ChipTone;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-block rounded-pill border border-line bg-surface-1 px-2.5 py-1 text-3xs font-semibold",
        toneClass[tone],
      )}
    >
      {children}
    </span>
  );
}
