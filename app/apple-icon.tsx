import { ImageResponse } from "next/og";
import { iconArt } from "@/lib/icon-art";

/**
 * Das Homescreen-Icon für iOS (apple-touch-icon), 180 px.
 *
 * ICON-FASSUNG 2 — die Zahl MUSS als Text HIER stehen, nicht bloß importiert
 * werden: Next bildet den Cache-Buster in
 * `<link rel="apple-touch-icon" href="/apple-icon?…">` aus den BYTES DIESER
 * DATEI, nicht aus `lib/icon-art.tsx`. Ändert sich nur die Zeichnung, bleibt
 * die URL gleich — und CDN, Service Worker und iOS behalten das alte PNG.
 * Bei jeder Icon-Änderung: hier und in `app/icon.tsx` hochzählen und
 * `ICON_VERSION` in `lib/icon-art.tsx` mitziehen.
 */
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(iconArt(180), { ...size });
}
