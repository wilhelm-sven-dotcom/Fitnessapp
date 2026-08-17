import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Platte 311",
    short_name: "Platte 311",
    description: "Das Bewegungslabor — Muskelaufbau mit ATLAS als Studienleiter.",
    lang: "de",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    // Matches the app base (--base Archiv) and layout.tsx's viewport themeColor.
    background_color: "#f2ecdd",
    theme_color: "#f2ecdd",
    icons: [
      { src: "/manifest-icon/192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/manifest-icon/512", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/manifest-icon/512", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
