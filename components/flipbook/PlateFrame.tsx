import { cn } from "@/lib/utils";

/**
 * Tafel-Rahmen der Daumenkino-Bildsprache — Papier, Doppelrahmen, optionale
 * „Taf."-Ecke in Serifen-Kursive. Bewusst skin- und theme-unabhängige Hex-
 * Farben (Kunstobjekt wie die Boot-Tafeln, „eingeklebte Karte"), daher die
 * einzige erlaubte Ausnahme von der Token-Pflicht. `tone="muted"` = noch
 * nicht entwickelte Tafel (vergilbt, blasse Tinte) für Gesperrtes.
 */

export const PLATE_PAPER = "#EFE8D6";
export const PLATE_PAPER_MUTED = "#E8E1CF";
export const PLATE_INK = "#29231B";
export const PLATE_FAINT = "#8A7D66";
export const PLATE_RED = "#C13A2C";
/* Handkolorierung — gedeckte Lithografie-Farben (wie plates-archiv) */
export const PLATE_BLUE = "#5F7E9E";
export const PLATE_GREEN = "#6F8B4F";
export const PLATE_OCHRE = "#D9A441";

export const PLATE_SERIF_IT = {
  fontFamily: "var(--font-newsreader), Georgia, serif",
  fontStyle: "italic",
} as const;

/** 1 → "I.", 4 → "IV." — Tafel-Nummern wie im alten Lehrbuch. */
export function romanNumeral(n: number): string {
  const map: Array<[number, string]> = [
    [10, "X"],
    [9, "IX"],
    [5, "V"],
    [4, "IV"],
    [1, "I"],
  ];
  let rest = Math.max(1, Math.round(n));
  let out = "";
  for (const [v, s] of map) {
    while (rest >= v) {
      out += s;
      rest -= v;
    }
  }
  return `${out}.`;
}

export function PlateFrame({
  mark,
  markColor,
  tone = "full",
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  /** Ecken-Beschriftung, z. B. „Taf. IV." — ohne Angabe keine Ecke. */
  mark?: string;
  /** Farbe der Ecken-Beschriftung (Default: Tafel-Beige). */
  markColor?: string;
  tone?: "full" | "muted";
}) {
  const muted = tone === "muted";
  const frame = muted ? PLATE_FAINT : PLATE_INK;
  return (
    <div className={cn("relative", className)} {...props}>
      <div
        style={{
          background: muted ? PLATE_PAPER_MUTED : PLATE_PAPER,
          border: `1.5px solid ${frame}`,
          padding: 5,
        }}
      >
        <div style={{ border: `0.5px solid ${frame}` }}>{children}</div>
      </div>
      {mark && (
        <span
          style={{
            ...PLATE_SERIF_IT,
            position: "absolute",
            top: 8,
            right: 10,
            fontSize: 10,
            color: markColor ?? PLATE_FAINT,
          }}
        >
          {mark}
        </span>
      )}
    </div>
  );
}
