import { SCHEIBE } from "@/lib/grundfarben";

/**
 * Das Zeichen von Platte 311 im Look „Regionen“: vier Hantelscheiben auf der
 * Stange, von groß nach klein in den Wettkampffarben Rot, Blau, Gelb, Grün —
 * dieselben Farben tragen in der App die Körperregionen (Beine, Druck, Zug,
 * Rumpf). Die EINE Stelle, an der das Zeichen als SVG entsteht:
 *
 *  · `lib/icon-art.tsx` und die Bild-Routen → Satori/next-og (feste Hexwerte,
 *    keine CSS-Variablen; nur <g> und <line>, die Satori sicher durchreicht)
 *  · `components/brand/Marke.tsx` → das DOM (Stange in `currentColor`)
 *
 * Geometrie im 48er-Feld, mittig auf 24/24: alles liegt im Maskable-
 * Sicherheitskreis (r 19,2) — weiteste Punkte sind das Stangenende
 * (Abstand 18,8) und die Ecke der roten Scheibe (17,6). Deshalb dieselbe
 * Zeichnung in jeder Größe und `purpose: "any maskable"` im Manifest.
 */

/** [x, halbe Höhe, Breite, Farbe] je Scheibe — 25 · 20 · 15 · 10 kg.
 *  Exportiert fürs Startbild, das die Scheiben einzeln animiert. */
export const SCHEIBEN: readonly [number, number, number, string][] = [
  [18.5, 13, 5.2, SCHEIBE.rot],
  [24.6, 11, 5.2, SCHEIBE.blau],
  [30.4, 8.8, 4.6, SCHEIBE.gelb],
  [35.6, 6.4, 4.2, SCHEIBE.gruen],
];

/** Die Zeichnung als SVG-Kinder für `viewBox="0 0 48 48"`. `stange` ist die
 *  Farbe von Stange und Verschluss (DOM: "currentColor", Satori: Hex). */
export function markeArt(stange: string) {
  return (
    <g strokeLinecap="round" fill="none">
      <line x1={6.5} y1={24} x2={41.5} y2={24} stroke={stange} strokeWidth={2.6} />
      <line x1={13.5} y1={18.5} x2={13.5} y2={29.5} stroke={stange} strokeWidth={2.6} />
      {SCHEIBEN.map(([x, h, w, farbe]) => (
        <line key={x} x1={x} y1={24 - h} x2={x} y2={24 + h} stroke={farbe} strokeWidth={w} />
      ))}
    </g>
  );
}
