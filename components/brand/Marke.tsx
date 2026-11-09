import { MARKE_VIEWBOX, markeArt } from "@/lib/marke-art";

/**
 * Das Zeichen im DOM (Kopfzeile, Rückkehr-Seiten der Dienste): weiße
 * Sprechblase mit Tinte-Rand und blauen Scheiben — feste Markenfarben in
 * jedem Modus. Zeichnung: `lib/marke-art.tsx`.
 */
export function Marke({ size = 28, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox={MARKE_VIEWBOX}
      className={className}
      style={{ display: "block" }}
      aria-hidden="true"
    >
      {markeArt()}
    </svg>
  );
}
