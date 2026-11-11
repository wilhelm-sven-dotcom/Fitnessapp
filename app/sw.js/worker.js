// Offline-Service-Worker — die Vorlage. `route.ts` daneben liefert sie als
// `/sw.js` aus und setzt beim Bauen eine Zeile davor:
//
//   const BAU = { v: "<Kennung>", dateien: ["/_next/static/…", "/geraete/…"] };
//
// `dateien` sind ALLE Skripte, Styles, Schriften und Gerätebilder dieses
// Builds, `v` ist ein Fingerabdruck davon. Ein neuer Build ergibt also ein
// anderes `/sw.js` — daran erkennt der Browser das Update.
//
// Wozu: Die App wird im Studio benutzt, oft mit schlechtem Netz. Alles, was
// zum Trainieren nötig ist, muss im Cache liegen, BEVOR man es braucht.
//
// · Installieren: die Hauptseiten und alle Dateien des Builds werden
//   vorgeladen. Fehlt etwas, scheitert die Installation und der bisherige
//   Worker bleibt mit seinem vollständigen Cache im Amt. Ein Build ist damit
//   ganz oder gar nicht da; nachgeladen wird später kein Code mehr.
// · Seitenaufrufe: Netz zuerst, aber höchstens 3 s — dann die vorgeladene
//   Seite. Hat das Netz einmal nicht geantwortet, kommt die nächste Minute
//   lang alles sofort aus dem Cache (im Studio wartet man sonst bei jedem
//   Tippen wieder 3 s).
// · Wechsel zwischen den Seiten: Next holt dafür Daten (`RSC`). Bleiben sie
//   aus, meldet der Worker einen Fehler, Next lädt die Seite dann ganz — und
//   die kommt aus dem Cache.
// · Dateien des Builds: Cache zuerst (Name mit Hash = immer dieselben Bytes).
// · Alles andere (`/api/`, Icons, Manifest, fremde Adressen) fasst der Worker
//   nicht an.
// · Update: ein neuer Worker wartet, bis die Seite ihn freigibt
//   (`SKIP_WAITING`) — das tut sie nie mitten im Training. Erst dann löscht er
//   die Caches älterer Builds. Gelöscht werden nur CODE-Caches, nie
//   localStorage oder IndexedDB: Trainingsdaten bleiben unberührt. Danach
//   fragt die Seite, ob in ihr schon dieser Build läuft (`GEHOERT_ZU_DIR`),
//   und lädt nur neu, wenn nicht.

/* global BAU */

const CACHE = `spotter-${BAU.v}`;
const SEITEN = ["/", "/workout", "/uebungen", "/fortschritt", "/coach", "/settings"];
const NAV_TIMEOUT_MS = 3000;
const SCHLECHT_MS = 60000;

/** Bis wann das Netz als unbrauchbar gilt (Zeitstempel). */
let schlechtBis = 0;
const netzSchlecht = () => Date.now() < schlechtBis || self.navigator.onLine === false;
const warte = (ms) => new Promise((r) => setTimeout(() => r(null), ms));

/**
 * Lesen und Schreiben, ohne den Cache dabei ANZULEGEN. `caches.open()` legt
 * einen fehlenden Cache neu an — und genau das tat ein abgelöster Worker: der
 * neue hatte beim Übernehmen den alten Cache gelöscht, der alte beantwortete
 * noch einen letzten Dateiabruf, öffnete „seinen“ Cache und ließ ihn als
 * leere Hülle zurück.
 */
const ausCache = (anfrage, opts) => caches.match(anfrage, { cacheName: CACHE, ...opts });
async function ablegen(request, res) {
  if (!(await caches.has(CACHE))) return;
  await (await caches.open(CACHE)).put(request, res);
}
/** Ist dieser Worker der, der gerade im Amt ist? (Ein abgelöster darf nichts
 *  mehr reparieren.) Wo der Browser das nicht verrät: nein. */
const imAmt = () => !!self.serviceWorker && self.registration.active === self.serviceWorker;

/** Skripte, die eine Seite im HTML lädt (ohne Anhang wie `?dpl=…`). */
function skripteAus(html) {
  const out = new Set();
  for (const m of html.matchAll(/<script[^>]+src="(\/_next\/static\/[^"?]+)/g)) out.add(m[1]);
  return out;
}

let laedtVor = null;
/** Lädt Seiten und Dateien in den Cache; läuft nie doppelt. */
function vorladen() {
  laedtVor ??= ladeAlles().finally(() => {
    laedtVor = null;
  });
  return laedtVor;
}

async function ladeAlles() {
  const cache = await caches.open(CACHE);
  const bekannt = new Set(BAU.dateien);
  await Promise.all(
    SEITEN.map(async (pfad) => {
      // Frisch holen, am HTTP-Cache vorbei.
      const res = await fetch(pfad, { cache: "reload", credentials: "same-origin" });
      if (!res.ok) throw new Error(`Seite ${pfad}: ${res.status}`);
      const html = await res.text();
      // Während eines Deployments kann der Server schon den nächsten Build
      // ausliefern. Eine Seite, deren Skripte nicht zu diesem Build gehören,
      // darf nicht in den Cache: offline fände sie ihren Code nicht.
      for (const s of skripteAus(html)) {
        if (!bekannt.has(s)) throw new Error(`Seite ${pfad} gehört zu einem anderen Build (${s})`);
      }
      await cache.put(
        pfad,
        new Response(html, { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } }),
      );
    }),
  );
  await Promise.all(
    BAU.dateien.map(async (pfad) => {
      // Skripte und Styles sind Pflicht, Schriften und Bilder nicht (die Seite
      // fällt auf die Systemschrift bzw. die Zeichnung zurück).
      const pflicht = /\.(?:js|css)$/.test(pfad);
      try {
        if (await cache.match(pfad)) return;
        const res = await fetch(pfad, {
          credentials: "same-origin",
          cache: pfad.startsWith("/_next/static/") ? "default" : "no-cache",
        });
        if (res.status !== 200) throw new Error(`${pfad}: ${res.status}`);
        await cache.put(pfad, res);
      } catch (e) {
        if (pflicht) throw e;
      }
    }),
  );
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    vorladen().then(() => {
      // Erstinstallation: sofort übernehmen. Bei einem Update wartet der neue
      // Worker auf die Freigabe der Seite.
      if (!self.registration.active) return self.skipWaiting();
    }),
  );
});

self.addEventListener("message", (event) => {
  const d = event.data;
  if (!d) return;
  if (d.type === "SKIP_WAITING") self.skipWaiting();
  // „Läuft in diesem Fenster schon dein Build?“ Die Seite schickt die Skripte,
  // die sie geladen hat. Kennt dieser Worker sie alle, muss sie nach der
  // Übernahme nicht neu laden.
  if (d.type === "GEHOERT_ZU_DIR" && event.ports && event.ports[0]) {
    const bekannt = new Set(BAU.dateien);
    const ja =
      Array.isArray(d.skripte) && d.skripte.length > 0 && d.skripte.every((s) => bekannt.has(s));
    event.ports[0].postMessage({ ja });
  }
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
      await self.clients.claim();
    })(),
  );
});

/** Seitenaufruf: Netz zuerst (höchstens 3 s), sonst die vorgeladene Seite. */
async function seite(event, url) {
  const { request } = event;
  const pfad = url.pathname.length > 1 ? url.pathname.replace(/\/+$/, "") : "/";
  const treffer = await ausCache(pfad);

  if (!treffer) {
    // Nicht vorgeladen: eine Seite wie die Rückkehr von Strava — oder der
    // Browser hat den Cache geräumt. Nur das Netz kann helfen; ohne Netz geht
    // es zur Startseite.
    try {
      const res = await fetch(request);
      if (SEITEN.includes(pfad) && imAmt()) event.waitUntil(vorladen().catch(() => {}));
      return res;
    } catch (e) {
      if (pfad !== "/" && (await ausCache("/"))) return Response.redirect("/", 302);
      throw e;
    }
  }

  const netz = fetch(request);
  const erholt = () =>
    netz.then(
      (res) => {
        if (res.ok) schlechtBis = 0;
      },
      () => {},
    );
  if (netzSchlecht()) {
    erholt();
    return treffer;
  }
  const erste = await Promise.race([netz.catch(() => null), warte(NAV_TIMEOUT_MS)]);
  if (erste && (erste.ok || erste.type === "opaqueredirect")) return erste;
  if (!erste) {
    schlechtBis = Date.now() + SCHLECHT_MS;
    erholt();
  }
  return treffer;
}

/** Daten für den Seitenwechsel: nur aus dem Netz, höchstens 3 s. */
async function seitenDaten(request) {
  if (netzSchlecht()) return Response.error();
  const abbruch = new AbortController();
  const netz = fetch(request, { signal: abbruch.signal }).catch(() => null);
  const erste = await Promise.race([netz, warte(NAV_TIMEOUT_MS)]);
  if (erste) return erste;
  abbruch.abort();
  schlechtBis = Date.now() + SCHLECHT_MS;
  return Response.error();
}

/** Datei des Builds: Cache zuerst, sonst Netz und ablegen. */
async function datei(request) {
  // Ein Anhang wie `?dpl=…` oder `?v=3` ändert nichts am Inhalt.
  const hit = await ausCache(request, { ignoreSearch: true });
  if (hit) return hit;
  const res = await fetch(request);
  if (res.status === 200 && res.type === "basic") ablegen(request, res.clone()).catch(() => {});
  return res;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return;
  if (request.mode === "navigate") event.respondWith(seite(event, url));
  else if (request.headers.get("RSC") === "1") event.respondWith(seitenDaten(request));
  else if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/geraete/"))
    event.respondWith(datei(request));
});
