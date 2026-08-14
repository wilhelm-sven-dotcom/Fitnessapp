import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Training",
    short_name: "Training",
    description: "Dein persönlicher Trainingsplan — Muskelaufbau, 3× pro Woche.",
    lang: "de",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    // Matches the app base (--base hell) and layout.tsx's viewport themeColor.
    background_color: "#f2f4f2",
    theme_color: "#f2f4f2",
    icons: [
      { src: "/manifest-icon/192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/manifest-icon/512", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/manifest-icon/512", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
