"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

const imTraining = () => window.location.pathname.startsWith("/workout");
/** Schreibt der Nutzer gerade etwas? Dann wird nicht neu geladen. */
const tipptGerade = () => {
  const el = document.activeElement;
  return (
    el instanceof HTMLInputElement ||
    el instanceof HTMLTextAreaElement ||
    (el instanceof HTMLElement && el.isContentEditable)
  );
};
/** So oft fragt eine offene App höchstens nach einem neueren Build. */
const PRUEF_ABSTAND_MS = 10 * 60 * 1000;
/** So lange nach Laden oder Seitenwechsel wartet die Freigabe, bis die Seite
 *  ihre eigenen Abrufe hinter sich hat. */
const RUHE_MS = 1200;
const CHUNK_RE =
  /ChunkLoadError|Loading chunk [\w-]+ failed|error loading dynamically imported module|Importing a module script failed/i;

/** Die Skripte, die dieses Fenster geladen hat (Pfad ohne Anhang). */
function eigeneSkripte(): string[] {
  const out = new Set<string>();
  for (const s of Array.from(document.scripts)) {
    if (!s.src) continue;
    try {
      const u = new URL(s.src);
      if (u.origin === window.location.origin && u.pathname.startsWith("/_next/static/"))
        out.add(u.pathname);
    } catch {
      /* keine Adresse */
    }
  }
  return [...out];
}

/** Fragt den Worker, ob in diesem Fenster schon sein Build läuft. Ohne Antwort
 *  gilt das Fenster als veraltet. */
function istVeraltet(worker: ServiceWorker): Promise<boolean> {
  return new Promise((fertig) => {
    const kanal = new MessageChannel();
    const frist = window.setTimeout(() => fertig(true), 3000);
    kanal.port1.onmessage = (e: MessageEvent<{ ja?: unknown }>) => {
      window.clearTimeout(frist);
      fertig(e.data?.ja !== true);
    };
    try {
      worker.postMessage({ type: "GEHOERT_ZU_DIR", skripte: eigeneSkripte() }, [kanal.port2]);
    } catch {
      window.clearTimeout(frist);
      fertig(true);
    }
  });
}

/**
 * Meldet den Service Worker an und hält die App aktuell — ohne je mitten im
 * Training oder mitten im Tippen neu zu laden.
 *
 *  · `/sw.js` enthält die Kennung des Builds (app/sw.js/route.ts). Nach einem
 *    Deployment ist es ein anderes Skript; der Browser installiert es im
 *    Hintergrund, der neue Worker lädt alles vor und WARTET.
 *  · Freigegeben (`SKIP_WAITING`) wird er nur außerhalb von `/workout`, und
 *    erst wenn die Seite ruhig ist: kurz nach dem Laden, nach einem
 *    Seitenwechsel, beim Zurückkommen in die App. Kommt die Freigabe mitten in
 *    die eigenen Abrufe der Seite, läuft der alte Worker im selben Augenblick
 *    wieder an, und der Browser verschiebt die Übernahme um Minuten.
 *  · Übernimmt der neue Worker, fragt die Seite ihn, ob in ihr schon sein
 *    Build läuft (`GEHOERT_ZU_DIR`). Meist ja: die Seite kam frisch aus dem
 *    Netz, dann passiert nichts. Kam sie aus dem Cache des alten Builds, lädt
 *    sie einmal neu — sofort, wenn nichts stört, sonst beim nächsten
 *    Seitenwechsel, beim Verlassen des Eingabefelds oder beim Zurückkommen.
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
  /** Was der Effekt unten dem Seitenwechsel anbietet. */
  const beiWechsel = useRef<(() => void) | null>(null);

  // Seitenwechsel (z. B. raus aus dem Training): Aufgeschobenes nachholen.
  useEffect(() => {
    beiWechsel.current?.();
  }, [pathname]);

  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
    const sw = navigator.serviceWorker;
    let reg: ServiceWorkerRegistration | null = null;

    // ── Neu laden, wenn das Fenster alten Code hat und nichts stört ──
    let neuLadenOffen = false;
    let laedtNeu = false;
    const ladeNeuWennMoeglich = () => {
      if (!neuLadenOffen || laedtNeu) return;
      if (imTraining() || tipptGerade()) return;
      laedtNeu = true;
      window.location.reload();
    };

    // Die erste Übernahme einer Seite ohne Worker ist die Erstinstallation.
    // Bei jeder weiteren entscheidet der neue Worker, ob das Fenster alt ist.
    let kontrolliert = !!sw.controller;
    const onControllerChange = () => {
      if (!kontrolliert) {
        kontrolliert = true;
        return;
      }
      const neu = sw.controller;
      if (!neu) return;
      void istVeraltet(neu).then((alt) => {
        if (!alt) return;
        neuLadenOffen = true;
        ladeNeuWennMoeglich();
      });
    };
    sw.addEventListener("controllerchange", onControllerChange);

    // ── Wartenden Worker freigeben, sobald die Seite ruhig ist ──
    let freigabeTimer = 0;
    const planeFreigabe = () => {
      window.clearTimeout(freigabeTimer);
      freigabeTimer = window.setTimeout(() => {
        if (imTraining()) return;
        reg?.waiting?.postMessage({ type: "SKIP_WAITING" });
      }, RUHE_MS);
    };
    const beobachte = (r: ServiceWorkerRegistration) => {
      reg = r;
      const warteAuf = (w: ServiceWorker | null) => {
        if (!w) return;
        w.addEventListener("statechange", () => {
          if (w.state === "installed") planeFreigabe();
        });
      };
      warteAuf(r.installing);
      r.addEventListener("updatefound", () => warteAuf(r.installing));
      if (r.waiting) planeFreigabe();
    };
    const registriere = async () => {
      const r = await sw.register("/sw.js", { updateViaCache: "none" }).catch(() => null);
      if (r) beobachte(r);
    };

    let zuletztGefragt = Date.now();
    const frageNachUpdate = (sofort = false) => {
      if (!reg || navigator.onLine === false || imTraining()) return;
      if (!sofort && Date.now() - zuletztGefragt < PRUEF_ABSTAND_MS) return;
      zuletztGefragt = Date.now();
      void reg.update().catch(() => {
        /* kein Netz — beim nächsten Mal */
      });
    };

    beiWechsel.current = () => {
      ladeNeuWennMoeglich();
      if (reg?.waiting) planeFreigabe();
    };
    const onSichtbarkeit = () => {
      // Beim Verlassen UND beim Zurückkommen: beides sind Momente, in denen
      // ein Neuladen niemanden unterbricht.
      ladeNeuWennMoeglich();
      if (document.visibilityState !== "visible") return;
      if (reg?.waiting) planeFreigabe();
      frageNachUpdate();
    };
    const onOnline = () => frageNachUpdate();
    // Das Eingabefeld ist verlassen: einen Moment später nachsehen (der Fokus
    // kann gleich ins nächste Feld springen).
    const onFokusWeg = () => {
      if (neuLadenOffen) window.setTimeout(ladeNeuWennMoeglich, 300);
    };

    if (document.readyState === "complete") void registriere();
    else window.addEventListener("load", () => void registriere(), { once: true });
    document.addEventListener("visibilitychange", onSichtbarkeit);
    document.addEventListener("focusout", onFokusWeg);
    window.addEventListener("online", onOnline);

    const beiChunkFehler = () => {
      // Das Fenster ist als veraltet bekannt und findet seinen Code nicht
      // mehr: jetzt neu laden (außer im Training), statt auf später zu warten.
      if (neuLadenOffen && !imTraining() && !laedtNeu) {
        laedtNeu = true;
        window.location.reload();
        return;
      }
      frageNachUpdate(true);
    };
    const onError = (e: ErrorEvent) => {
      if (CHUNK_RE.test(e.message || "") || CHUNK_RE.test((e.error as Error)?.message || ""))
        beiChunkFehler();
    };
    const onRejection = (e: PromiseRejectionEvent) => {
      const r = e.reason;
      const msg = typeof r === "string" ? r : (r as Error)?.message;
      if (CHUNK_RE.test(msg || "")) beiChunkFehler();
    };
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);

    return () => {
      beiWechsel.current = null;
      window.clearTimeout(freigabeTimer);
      sw.removeEventListener("controllerchange", onControllerChange);
      document.removeEventListener("visibilitychange", onSichtbarkeit);
      document.removeEventListener("focusout", onFokusWeg);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);
  return null;
}
