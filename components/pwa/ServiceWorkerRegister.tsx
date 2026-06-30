"use client";

import { useEffect } from "react";

/**
 * Registers the service worker AND keeps it fresh — without this, an installed
 * PWA (especially iOS standalone, which resumes a suspended session) can run an
 * old cached bundle forever and never show new deploys. We:
 *  · register with `updateViaCache: "none"` so the browser always revalidates sw.js,
 *  · call `registration.update()` on load and whenever the app returns to the
 *    foreground, so a new worker is discovered promptly,
 *  · reload once when a new worker takes control (`controllerchange`) — gated on a
 *    controller having already existed, so a first install doesn't reload/flash.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;

    // A controller already present means this is a returning visit — a later
    // controllerchange is then an UPDATE, so reload to pick up the new code.
    const hadController = !!navigator.serviceWorker.controller;
    let refreshing = false;
    const onControllerChange = () => {
      if (refreshing || !hadController) return;
      refreshing = true;
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);

    let reg: ServiceWorkerRegistration | null = null;
    const checkForUpdate = () => {
      reg?.update().catch(() => {});
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") checkForUpdate();
    };

    const register = async () => {
      reg = await navigator.serviceWorker
        .register("/sw.js", { updateViaCache: "none" })
        .catch(() => null);
      if (!reg) return;
      checkForUpdate();
      document.addEventListener("visibilitychange", onVisible);
    };

    if (document.readyState === "complete") void register();
    else window.addEventListener("load", () => void register(), { once: true });

    return () => {
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);
  return null;
}
