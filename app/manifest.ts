import type { MetadataRoute } from "next";
import { GRUND_DUNKEL, GRUND_HELL } from "@/lib/grundfarben";
import { ICON_VERSION } from "@/lib/icon-art";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Platte 311",
    short_name: "Platte 311",
    description: "Krafttraining mit ATLAS als Coach.",
    lang: "de",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    // Der OS-Splash liegt IMMER im Dunkel: das Manifest kennt nur EINE
    // background_color — modusgleich gäbe es in einem der beiden Modi einen
    // Farbsprung an der Naht zum In-App-Startbild (das ebenfalls dunkel ist).
    // theme_color ist der helle Grundzustand; das Pre-Paint-Skript in
    // layout.tsx schreibt das meta-Tag ohnehin je Modus um.
    background_color: GRUND_DUNKEL,
    theme_color: GRUND_HELL,
    // Die Marey-Spur liegt komplett im Sicherheitskreis (r 19,2 um 24/24) —
    // dieselbe Zeichnung taugt als normales UND als maskiertes Icon. Der
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
