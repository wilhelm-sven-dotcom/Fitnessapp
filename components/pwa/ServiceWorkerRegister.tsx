"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

const imTraining = () => window.location.pathname.startsWith("/workout");
/** So oft fragt eine offene App höchstens nach einem neueren Build. */
const PRUEF_ABSTAND_MS = 10 * 60 * 1000;
const CHUNK_RE =
  /ChunkLoadError|Loading chunk [\w-]+ failed|error loading dynamically imported module|Importing a module script failed/i;

/**
 * Meldet den Service Worker an und hält die App aktuell — ohne je mitten im
 * Training neu zu laden.
 *
 *  · `/sw.js` enthält die Kennung des Builds (app/sw.js/route.ts). Nach einem
 *    Deployment ist es ein anderes Skript; der Browser installiert es im
 *    Hintergrund, der neue Worker lädt alles vor und WARTET.
 *  · Freigegeben (`SKIP_WAITING`) wird er nur außerhalb von `/workout`: gleich
 *    nach dem Installieren, beim Seitenwechsel oder beim Zurückkommen in die
 *    App. Übernimmt er, lädt die Seite einmal neu (`controllerchange`) — beim
 *    allerersten Installieren nicht.
 *  · Eine App, die tagelang offen bleibt (iOS weckt die alte Seite wieder
 *    auf), ruft nie eine neue Seite ab. Darum fragt sie beim Zurückkommen
 *    selbst nach einem neuen `/sw.js` — höchstens alle zehn Minuten und nie
 *    im Training.
 *  · Lädt ein Stück Code nicht (`ChunkLoadError`), wird sofort nach einem
 *    neuen Build gefragt. Geleert wird dabei nichts: der Cache des laufenden
 *    Builds ist vollständig, und ohne ihn ginge im Studio gar nichts mehr.
 */
export function ServiceWorkerRegister() {
  const pathname = usePathname();
  const regRef = useRef<ServiceWorkerRegistration | null>(null);
  /** Der Worker hat im Training gewechselt: das Neuladen wird nachgeholt. */
  const neuLadenOffen = useRef(false);

  // Seitenwechsel (z. B. raus aus dem Training): Aufgeschobenes nachholen.
  useEffect(() => {
    if (imTraining()) return;
    if (neuLadenOffen.current) {
      neuLadenOffen.current = false;
      window.location.reload();
      return;
    }
    regRef.current?.waiting?.postMessage({ type: "SKIP_WAITING" });
  }, [pathname]);

  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
    const sw = navigator.serviceWorker;

    // Die erste Übernahme einer Seite ohne Worker ist die Erstinstallation,
    // jede weitere ein Update: dann läuft im Fenster noch der alte Code.
    let kontrolliert = !!sw.controller;
    let laedtNeu = false;
    const onControllerChange = () => {
      if (!kontrolliert) {
        kontrolliert = true;
        return;
      }
      if (laedtNeu) return;
      if (imTraining()) {
        neuLadenOffen.current = true;
        return;
      }
      laedtNeu = true;
      window.location.reload();
    };
    sw.addEventListener("controllerchange", onControllerChange);

    const gibFrei = (w: ServiceWorker | null | undefined) => {
      if (w && !imTraining()) w.postMessage({ type: "SKIP_WAITING" });
    };
    const beobachte = (reg: ServiceWorkerRegistration) => {
      regRef.current = reg;
      const warteAuf = (w: ServiceWorker | null) => {
        if (!w) return;
        w.addEventListener("statechange", () => {
          if (w.state === "installed") gibFrei(w);
        });
      };
      warteAuf(reg.installing);
      reg.addEventListener("updatefound", () => warteAuf(reg.installing));
      gibFrei(reg.waiting);
    };
    const registriere = async () => {
      const reg = await sw.register("/sw.js", { updateViaCache: "none" }).catch(() => null);
      if (reg) beobachte(reg);
    };

    let zuletztGefragt = Date.now();
    const frageNachUpdate = (sofort = false) => {
      const reg = regRef.current;
      if (!reg || navigator.onLine === false || imTraining()) return;
      if (!sofort && Date.now() - zuletztGefragt < PRUEF_ABSTAND_MS) return;
      zuletztGefragt = Date.now();
      void reg.update().catch(() => {
        /* kein Netz — beim nächsten Mal */
      });
    };
    const onZurueck = () => {
      if (document.visibilityState !== "visible") return;
      gibFrei(regRef.current?.waiting);
      frageNachUpdate();
    };

    if (document.readyState === "complete") void registriere();
    else window.addEventListener("load", () => void registriere(), { once: true });
    document.addEventListener("visibilitychange", onZurueck);
    window.addEventListener("online", onZurueck);

    const onError = (e: ErrorEvent) => {
      if (CHUNK_RE.test(e.message || "") || CHUNK_RE.test((e.error as Error)?.message || ""))
        frageNachUpdate(true);
    };
    const onRejection = (e: PromiseRejectionEvent) => {
      const r = e.reason;
      const msg = typeof r === "string" ? r : (r as Error)?.message;
      if (CHUNK_RE.test(msg || "")) frageNachUpdate(true);
    };
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);

    return () => {
      sw.removeEventListener("controllerchange", onControllerChange);
      document.removeEventListener("visibilitychange", onZurueck);
      window.removeEventListener("online", onZurueck);
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);
  return null;
}
