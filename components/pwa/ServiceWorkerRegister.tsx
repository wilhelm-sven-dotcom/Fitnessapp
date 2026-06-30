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

    // Auto-heal stale code-chunk errors after a deploy: an old open session can
    // request chunk files that no longer exist on the new build → a ChunkLoadError
    // on (lazy) navigation. Reload once to pull the fresh HTML + chunks. A
    // sessionStorage one-shot prevents a reload loop if the build is genuinely
    // broken (then the global-error boundary shows instead); it's cleared after a
    // stable load so a FUTURE deploy can auto-recover again.
    const CHUNK_RE =
      /ChunkLoadError|Loading chunk [\w-]+ failed|error loading dynamically imported module|Importing a module script failed/i;
    const KEY = "chunk-reload";
    let tried = false;
    const recover = () => {
      if (tried) return;
      tried = true;
      let alreadyReloaded = false;
      try {
        alreadyReloaded = !!sessionStorage.getItem(KEY);
        if (!alreadyReloaded) sessionStorage.setItem(KEY, "1");
      } catch {
        /* storage unavailable */
      }
      if (alreadyReloaded) return; // a prior reload didn't fix it → let it surface
      window.location.reload();
    };
    const onError = (e: ErrorEvent) => {
      if (CHUNK_RE.test(e.message || "") || CHUNK_RE.test((e.error as Error)?.message || ""))
        recover();
    };
    const onRejection = (e: PromiseRejectionEvent) => {
      const r = e.reason;
      const msg = typeof r === "string" ? r : (r as Error)?.message;
      if (CHUNK_RE.test(msg || "")) recover();
    };
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    const clearFlag = window.setTimeout(() => {
      try {
        sessionStorage.removeItem(KEY);
      } catch {
        /* ignore */
      }
    }, 8000);

    return () => {
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
      window.clearTimeout(clearFlag);
    };
  }, []);
  return null;
}
