import { cn } from "@/lib/utils";

export type StickerTon = "sonne" | "orange" | "blau" | "weiss";

const TON: Record<StickerTon, string> = {
  sonne: "bg-sonne text-sonne-auf",
  orange: "bg-rekord-flaeche text-rekord-auf",
  blau: "bg-accent text-on-accent",
  weiss: "bg-surface-1 text-fg",
};

/**
 * Der Sticker „spotter“: kurzes Etikett mit dickem Tinte-Rand, Bricolage 800,
 * leicht gedreht. Für Markierungen, die auffallen sollen („Brust“, „Satz 2“,
 * „1 von 3“, „+2 kg“) — nie für Fließtext. Orange nur rund um Rekorde.
 * Die Drehung ist statisch (keine Bewegung); `drehung` in Grad, ±6 max.
 */
export function Sticker({
  ton = "sonne",
  drehung = -3,
  className,
  children,
}: {
  ton?: StickerTon;
  drehung?: number;
  className?: string;
  children: React.ReactNode;
}) {
  const grad = Math.max(-6, Math.min(6, drehung));
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-kachel border-dick border-rand px-2.5 py-0.5 font-display text-sm font-extrabold leading-tight",
        TON[ton],
        className,
      )}
      style={grad ? { transform: `rotate(${grad}deg)` } : undefined}
    >
      {children}
    </span>
  );
}
