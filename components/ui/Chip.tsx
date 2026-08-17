import { cn } from "@/lib/utils";
import type { ChipTone } from "@/lib/coaching";

// Hinweis-Chip Platte 311: Katalogschild-Optik — 1 px Faden, Versal-Mono,
// Ton nur als Schriftfarbe (Messing = über Ziel, Cyanotypie = im Ziel).
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
        "inline-block rounded-pill border border-line bg-surface-1 px-2.5 py-1 font-mono text-3xs font-semibold uppercase tracking-gesperrt",
        toneClass[tone],
      )}
    >
      {children}
    </span>
  );
}
