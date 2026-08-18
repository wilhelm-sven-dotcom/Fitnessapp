import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Platte 311",
    short_name: "Platte 311",
    description: "Das Bewegungslabor — Muskelaufbau mit ATLAS als Coach.",
    lang: "de",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    // Der OS-Splash liegt IMMER im Atelier (Kollodium): das Manifest kennt nur
    // EINE background_color — modusgleich gäbe es in einem der beiden Modi
    // zwangsläufig einen Farbsprung an der Naht zum In-App-Startbild.
    // theme_color bleibt der Grundzustand Archiv; das Pre-Paint-Skript in
    // layout.tsx schreibt das meta-Tag ohnehin je Modus um.
    background_color: "#141210",
    theme_color: "#f2ecdd",
    // Die Marey-Spur liegt komplett im Sicherheitskreis (r 19,2 um 24/24) —
    // dieselbe Zeichnung taugt als normales UND als maskiertes Icon. Der
    // Next-Typ kennt "any maskable" nicht, deshalb je ein eigener Eintrag.
    icons: [
      { src: "/manifest-icon/192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/manifest-icon/192", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/manifest-icon/512", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/manifest-icon/512", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
