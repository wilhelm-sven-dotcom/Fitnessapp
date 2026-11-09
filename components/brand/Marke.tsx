import { markeArt } from "@/lib/marke-art";

/**
 * Das Zeichen im DOM (Kopfzeile, Rückkehr-Seiten der Dienste): Scheiben in
 * den festen Wettkampffarben, Stange in `currentColor` — trägt also die
 * Tinte ihres Kontexts. Zeichnung: `lib/marke-art.tsx`.
 */
export function Marke({ size = 24, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      className={className}
      style={{ display: "block" }}
      aria-hidden="true"
    >
      {markeArt("currentColor")}
    </svg>
  );
}
