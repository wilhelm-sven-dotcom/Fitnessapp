import { MARKE, TINTE_HELL } from "@/lib/grundfarben";

/**
 * Das Zeichen von Kumpel im Look „spotter“: eine Sprechblase (der Kumpel, der
 * redet) mit einer Hantel darin. Die EINE Stelle, an der das Zeichen als SVG
 * entsteht:
 *
 *  · `lib/icon-art.tsx` und die Bild-Routen → Satori/next-og (feste Hexwerte,
 *    keine CSS-Variablen)
 *  · `components/brand/Marke.tsx` und das Startbild → das DOM
 *
 * Geometrie im 64er-Feld (`MARKE_VIEWBOX`): Blase x 2–62, y 10–58 (Spitze
 * unten links), Rand 4. Feste Markenfarben in jedem Modus: weiße Blase,
 * Tinte-Rand, Scheiben Blau (DOM) bzw. Orange (Icon auf blauem Grund).
 */
export const MARKE_VIEWBOX = "0 0 64 64";

/** Umriss der Sprechblase (für Startbild-Animation einzeln exportiert). */
export const BLASE_D =
  "M8 10h48a6 6 0 0 1 6 6v26a6 6 0 0 1-6 6H30l-12 10v-10H8a6 6 0 0 1-6-6V16a6 6 0 0 1 6-6z";

/** Die beiden Scheiben der Hantel: [x, y, Breite, Höhe]. */
export const SCHEIBEN_SPOTTER: readonly [number, number, number, number][] = [
  [16, 19.5, 7, 19],
  [41, 19.5, 7, 19],
];

/** Die Zeichnung als SVG-Kinder für `viewBox={MARKE_VIEWBOX}`. */
export function markeArt({
  blase = "#ffffff",
  rand = TINTE_HELL,
  scheibe = MARKE.blau,
}: { blase?: string; rand?: string; scheibe?: string } = {}) {
  return (
    <g>
      <path d={BLASE_D} fill={blase} stroke={rand} strokeWidth={4} strokeLinejoin="round" />
      <path d="M14 29h36" fill="none" stroke={rand} strokeWidth={4} strokeLinecap="round" />
      {SCHEIBEN_SPOTTER.map(([x, y, w, h]) => (
        <rect
          key={x}
          x={x}
          y={y}
          width={w}
          height={h}
          rx={2.5}
          fill={scheibe}
          stroke={rand}
          strokeWidth={3}
        />
      ))}
    </g>
  );
}
