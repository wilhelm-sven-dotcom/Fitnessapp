import { mareyArt } from "@/lib/phasen/figur-art";

/**
 * App-Icon „Platte 311" — Richtung I1 „Marey-Spur" (Design-Nachtrag 2):
 * die Referenzfigur des Labors dreimal überlagert, wie eine Chronofotografie,
 * in Kreide auf Kollodium. Kein Raster, keine Signatur, keine zweite Farbe —
 * die Spur allein trägt die Marke; bei 16 px liest die volle Endphase, die
 * Ghosts werden Textur. Die Komposition liegt komplett im Maskable-
 * Sicherheitskreis (r 19,2 um 24/24), deshalb dieselbe Zeichnung in JEDER
 * Größe und `purpose: "any maskable"` im Manifest.
 *
 * Satori (next/og) bettet keine Fonts ein und liest keine CSS-Variablen —
 * darum feste Hexes (Spiegel von --base/--fg im Atelier) und die
 * eingeschränkte SVG-Grammatik aus `lib/phasen/figur-art.tsx`. Die Geometrie
 * selbst kommt aus dem Katalog (FIGUR_KNIEBEUGE), damit Icon und App-Figuren
 * nie auseinanderlaufen.
 */

/**
 * Fassung der Zeichnung. Hochzählen, sobald sich das Icon ÄNDERT — die
 * Manifest-Routen (`/manifest-icon/…`) tragen sie als `?v=` und bekommen
 * dadurch eine neue URL; ohne das behalten CDN, Service Worker und
 * Homescreen das alte PNG. `app/icon.tsx` und `app/apple-icon.tsx` müssen
 * ZUSÄTZLICH mit (Next hasht dort die Route-Datei, nicht diese hier).
 *  1 = ob-lift + Raster + „311" · 2 = Marey-Spur (Nachtrag 2)
 */
export const ICON_VERSION = 2;

const TAFEL = "#141210";
const TINTE = "#e9e1ce";

export function iconArt(size: number) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        background: TAFEL,
      }}
    >
      <svg width={size} height={size} viewBox="0 0 48 48">
        {mareyArt(TINTE)}
      </svg>
    </div>
  );
}
