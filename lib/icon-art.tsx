import { markeArt } from "@/lib/marke-art";
import { MARKE } from "@/lib/grundfarben";

/**
 * App-Icon „spotter“: die weiße Sprechblase mit der Hantel
 * (orange Scheiben) auf Elektroblau (`lib/marke-art.tsx`). Die Zeichnung liegt
 * im Maskable-Sicherheitskreis (r 0,4 der Kante; die weiteste Blasen-Ecke
 * liegt bei rund 0,38 nach Abzug der Rundung), deshalb dieselbe Zeichnung in
 * JEDER Größe und `purpose: "any maskable"` im Manifest.
 *
 * Satori (next/og) liest keine CSS-Variablen — darum feste Hexwerte aus
 * `lib/grundfarben.ts`.
 */

/**
 * Fassung der Zeichnung. Hochzählen, sobald sich das Icon ÄNDERT — die
 * Manifest-Routen (`/manifest-icon/…`) und die iOS-Startbilder tragen sie als
 * `?v=` und bekommen dadurch eine neue URL; ohne das behalten CDN, Service
 * Worker und Homescreen das alte PNG. `app/icon.tsx` und `app/apple-icon.tsx`
 * müssen ZUSÄTZLICH mit (Next hasht dort die Route-Datei, nicht diese hier).
 *  1 = ob-lift + Raster + „311“ · 2 = Marey-Spur · 3 = Marey-Spur lesbar ·
 *  4 = Scheiben in Regionsfarben (Look „Regionen“) ·
 *  5 = Sprechblase mit Hantel auf Blau (Look und Name „spotter“)
 */
export const ICON_VERSION = 5;

/** Lage der 64er-Zeichnung im 180er-Icon: Maßstab und Versatz (mittig). */
const MASS = 1.75;
const VERSATZ_X = (180 - 64 * MASS) / 2;
const VERSATZ_Y = 90 - 34 * MASS;

export function iconArt(size: number) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        background: MARKE.blau,
      }}
    >
      <svg width={size} height={size} viewBox="0 0 180 180">
        <g transform={`translate(${VERSATZ_X} ${VERSATZ_Y}) scale(${MASS})`}>
          {markeArt({ scheibe: MARKE.orange })}
        </g>
      </svg>
    </div>
  );
}
