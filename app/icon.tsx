import { ImageResponse } from "next/og";
import { iconArt } from "@/lib/icon-art";

/** Favicon (ersetzt favicon.ico): 32 px → plain-Variante der Fototafel
 *  (nur Figur, ohne Raster und „311" — Regel aus dem Design-Handoff). */
export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(iconArt(32), { ...size });
}
