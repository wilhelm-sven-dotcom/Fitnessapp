import { markeArt } from "@/lib/marke-art";
import { GRUND_DUNKEL, TINTE_DUNKEL } from "@/lib/grundfarben";

/**
 * App-Icon „Platte 311“ im Look „Regionen“: vier Hantelscheiben in den
 * Wettkampffarben auf heller Stange, auf warmem Dunkel (`lib/marke-art.tsx`).
 * Die Zeichnung liegt komplett im Maskable-Sicherheitskreis, deshalb dieselbe
 * Zeichnung in JEDER Größe und `purpose: "any maskable"` im Manifest.
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
 *  4 = Scheiben in Regionsfarben (Look „Regionen“)
 */
export const ICON_VERSION = 4;

export function iconArt(size: number) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        background: GRUND_DUNKEL,
      }}
    >
      <svg width={size} height={size} viewBox="0 0 48 48">
        {markeArt(TINTE_DUNKEL)}
      </svg>
    </div>
  );
}
