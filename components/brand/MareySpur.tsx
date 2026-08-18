import { mareyArt } from "@/lib/phasen/figur-art";

/**
 * Die volle Marey-Spur als DOM-SVG — die Zeichnung des App-Icons (I1), Zug um
 * Zug dieselbe Geometrie wie `lib/icon-art.tsx`, nur in `currentColor` statt
 * mit festen Hexes. Für Flächen, die groß genug für die Ghosts sind: die
 * Icon-Platte im Onboarding, der Startbild-Standbildzustand.
 */
export function MareySpur({
  size = 48,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      className={className}
      style={{ display: "block" }}
      aria-hidden="true"
    >
      {mareyArt("currentColor")}
    </svg>
  );
}
