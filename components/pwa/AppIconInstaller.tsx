"use client";

import { useEffect } from "react";
import { useTraining } from "@/components/providers/TrainingProvider";
import { iconToDataUrl, loadIconImage } from "@/lib/app-icon";

/**
 * Applies the user's custom app icon (settings.icon) at runtime as the iOS
 * apple-touch-icon ("Zum Home-Bildschirm"). The server icon route can't read
 * per-user settings, so we draw the PNG on a <canvas> here and inject a <link>.
 *
 * CRITICAL — never touch a Next/React-managed node. Next emits its OWN
 * apple-touch-icon <link> (from app/apple-icon.tsx) and manifest <link> (from
 * app/manifest.ts) into <head>, and React holds fibers for them. Removing or
 * mutating one detaches it from React's view; the next head reconciliation then
 * runs removeChild on a node whose parentNode is already null → the whole app
 * blanks through the root error boundary (`(n=n.stateNode).parentNode.removeChild`).
 * That was the "Kurz neu laden"-on-every-page crash. So we ONLY ever create and
 * remove our OWN nodes, tagged `data-custom-app-icon`, and leave every Next node
 * untouched. Our link is appended last; iOS picks the last apple-touch-icon on a
 * size tie, so ours wins while Next's stays as the harmless default.
 *
 * Android manifest icons are intentionally NOT overridden: a second
 * <link rel="manifest"> is ignored (the browser uses the first, which is Next's),
 * so injecting one is dead weight that only leaks a blob URL on every sync.
 * Android keeps the default branded icons from app/manifest.ts. A per-user Android
 * icon would need a server manifest route, not a client-side link.
 *
 * Note: an already-installed home-screen icon only changes after re-adding.
 */
const ICON_TAG = "data-custom-app-icon";

export function AppIconInstaller() {
  const { settings } = useTraining();
  const icon = settings.icon;

  useEffect(() => {
    if (typeof document === "undefined") return;
    let cancelled = false;

    // Remove only our OWN previously-injected node(s) — unconditionally and
    // before the `!icon` bail, so clearing a custom icon restores the default.
    // React holds no fiber for these, so removing them can never desync it.
    const clearOwn = () =>
      document.querySelectorAll(`link[${ICON_TAG}]`).forEach((l) => l.remove());
    clearOwn();

    if (!icon) return;

    (async () => {
      const img = await loadIconImage(icon);
      if (cancelled) return;
      let apple: string;
      try {
        apple = iconToDataUrl(icon, 180, img);
      } catch {
        return; /* canvas draw failed — keep the generated default icon */
      }
      if (!apple || cancelled) return;

      clearOwn(); // guard against a re-run during the async draw gap
      const link = document.createElement("link");
      link.rel = "apple-touch-icon";
      link.setAttribute("sizes", "180x180"); // tie Next's sized-180 → iOS last-wins picks ours
      link.href = apple;
      link.setAttribute(ICON_TAG, "");
      document.head.appendChild(link);
    })();

    return () => {
      cancelled = true;
    };
  }, [icon]);

  return null;
}
