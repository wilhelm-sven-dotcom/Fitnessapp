import { cn } from "@/lib/utils";
import type { ChipTone } from "@/lib/coaching";

// Hinweis-Chip: Pille mit dickem Tinte-Rand, Ton nur als Schriftfarbe
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
        "inline-block rounded-pill border-dick border-rand bg-surface-1 px-2.5 py-1 text-3xs font-bold",
        toneClass[tone],
      )}
    >
      {children}
    </span>
  );
}
