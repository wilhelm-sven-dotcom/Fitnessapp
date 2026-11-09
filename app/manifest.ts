import type { MetadataRoute } from "next";
import { GRUND_HELL, MARKE } from "@/lib/grundfarben";
import { APP_NAME, BESCHREIBUNG } from "@/lib/marke";
import { ICON_VERSION } from "@/lib/icon-art";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: APP_NAME,
    short_name: APP_NAME,
    description: BESCHREIBUNG,
    lang: "de",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    // Der OS-Splash liegt IMMER auf Elektroblau wie das In-App-Startbild:
    // das Manifest kennt nur EINE background_color, an der Naht darf es
    // keinen Farbsprung geben. theme_color ist der helle Grundzustand; das
    // Pre-Paint-Skript in layout.tsx schreibt das meta-Tag je Modus um.
    background_color: MARKE.blau,
    theme_color: GRUND_HELL,
    // Die Sprechblase liegt im Sicherheitskreis (r 0,4 der Kante) — dieselbe
    // Zeichnung taugt als normales UND als maskiertes Icon. Der
    // Next-Typ kennt "any maskable" nicht, deshalb je ein eigener Eintrag.
    // Das `?v=` ist Pflicht, nicht Kosmetik: diese Routen sind — anders als
    // /icon und /apple-icon — von Next NICHT gehasht. Ohne wechselnde URL
    // behalten CDN, Service Worker und Homescreen das alte PNG.
    icons: [
      { src: `/manifest-icon/192?v=${ICON_VERSION}`, sizes: "192x192", type: "image/png", purpose: "any" },
      { src: `/manifest-icon/192?v=${ICON_VERSION}`, sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: `/manifest-icon/512?v=${ICON_VERSION}`, sizes: "512x512", type: "image/png", purpose: "any" },
      { src: `/manifest-icon/512?v=${ICON_VERSION}`, sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
