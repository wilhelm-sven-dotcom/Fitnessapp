import { ImageResponse } from "next/og";
import { iconArt } from "@/lib/icon-art";

/**
 * Favicon (ersetzt favicon.ico): 32 px, dieselbe Marey-Spur wie das
 * Homescreen-Icon.
 *
 * ICON-FASSUNG 3 — die Zahl MUSS als Text HIER stehen, nicht bloß importiert
 * werden: Next bildet den Cache-Buster in `<link href="/icon?…">` aus den
 * BYTES DIESER DATEI, nicht aus `lib/icon-art.tsx`. Ändert sich nur die
 * Zeichnung, bleibt die URL sonst gleich — und CDN, Service Worker und iOS
 * behalten das alte PNG (genau so passiert beim Wechsel auf die Marey-Spur).
 * Bei jeder Icon-Änderung: hier und in `app/apple-icon.tsx` hochzählen und
 * `ICON_VERSION` in `lib/icon-art.tsx` mitziehen.
 */
export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(iconArt(32), { ...size });
}
