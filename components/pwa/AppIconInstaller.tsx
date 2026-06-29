"use client";

import { useEffect } from "react";
import { useTraining } from "@/components/providers/TrainingProvider";
import { iconToDataUrl, loadIconImage } from "@/lib/app-icon";

/**
 * Applies the user's custom app icon (settings.icon) at runtime. The server
 * icon routes can't read settings, so we generate PNGs on a canvas and inject
 * them: apple-touch-icon (iOS "Zum Home-Bildschirm") + a dynamic manifest blob
 * (Android/Chrome install). Without settings.icon the generated defaults stand.
 * Note: an already-installed icon only updates after re-adding to the home screen.
 */
export function AppIconInstaller() {
  const { settings } = useTraining();
  const icon = settings.icon;

  useEffect(() => {
    if (!icon || typeof document === "undefined") return;
    let cancelled = false;

    (async () => {
      const img = await loadIconImage(icon);
      if (cancelled) return;
      let apple: string, i192: string, i512: string;
      try {
        apple = iconToDataUrl(icon, 180, img);
        i192 = iconToDataUrl(icon, 192, img);
        i512 = iconToDataUrl(icon, 512, img);
      } catch {
        return; /* canvas draw failed — keep the generated default icons */
      }
      if (!apple) return;

      document.querySelectorAll('link[rel="apple-touch-icon"]').forEach((l) => l.remove());
      const link = document.createElement("link");
      link.rel = "apple-touch-icon";
      link.href = apple;
      document.head.appendChild(link);

      try {
        const manifest = {
          name: "Training",
          short_name: "Training",
          start_url: "/",
          scope: "/",
          display: "standalone",
          background_color: "#0a0a0a",
          theme_color: "#0a0a0a",
          icons: [
            { src: i192, sizes: "192x192", type: "image/png", purpose: "any" },
            { src: i512, sizes: "512x512", type: "image/png", purpose: "any" },
            { src: i512, sizes: "512x512", type: "image/png", purpose: "maskable" },
          ],
        };
        const blob = new Blob([JSON.stringify(manifest)], { type: "application/manifest+json" });
        const url = URL.createObjectURL(blob);
        let ml = document.querySelector('link[rel="manifest"]');
        if (!ml) {
          ml = document.createElement("link");
          ml.setAttribute("rel", "manifest");
          document.head.appendChild(ml);
        }
        ml.setAttribute("href", url);
      } catch {
        /* manifest swap is best-effort; apple-touch-icon already applied */
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [icon]);

  return null;
}
