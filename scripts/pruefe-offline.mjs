/**
 * Nachweis „ohne Netz“: Die App wird im Studio benutzt. Geprüft wird am
 * Produktions-Build, mit einem Zwischenstück vor dem Server, das das Netz
 * abschalten (Verbindung reißt ab) oder hängen lassen kann (verbunden, aber
 * nichts kommt an) — beides gibt es im Studio.
 *
 *   A  Erster Besuch: der Service Worker lädt alle Hauptseiten, ALLE Skripte
 *      und Styles des Builds und die Gerätebilder vor; nichts von `/api/`.
 *   B  Ohne Netz zwischen allen Seiten wechseln.
 *   C  Ohne Netz ein Training starten, einen Satz eintragen, neu laden: die
 *      Einheit läuft weiter.
 *   D  Ein neuer Build wartet, solange trainiert wird. Erst nach dem Speichern
 *      übernimmt er; ein Fenster mit altem Code lädt einmal neu, die Einheit
 *      steht im Verlauf.
 *   E  Außerhalb des Trainings übernimmt ein neuer Build gleich: ohne Neuladen,
 *      wenn im Fenster schon der neue Code läuft; mit Neuladen, wenn nicht —
 *      aber nie, solange der Nutzer in einem Eingabefeld tippt.
 *   F  Hängt das Netz, kommt die Seite nach rund 3 s aus dem Cache, die
 *      nächsten Aufrufe sofort.
 *
 * Aufruf: npm run build && node scripts/pruefe-offline.mjs
 */
import { spawn } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import http from "node:http";
import path from "node:path";
import { chromium } from "playwright";
import { starteServer } from "./lib/testdaten.mjs";

const PORT = 3199; // next start
const VORN = 3198; // Zwischenstück, mit dem der Browser spricht
const BASE = `http://127.0.0.1:${VORN}`;
const exe = process.env.PW_CHROMIUM || "/opt/pw-browsers/chromium";

const fehler = [];
const pruefe = (ok, text) => {
  console.log(`${ok ? "OK  " : "FEHL"} ${text}`);
  if (!ok) fehler.push(text);
};

// ── Zwischenstück ────────────────────────────────────────────────────────
/** "an" · "aus" (Verbindung reißt ab) · "haengt" (keine Antwort). */
let modus = "an";
/** Simuliert einen neuen Build: hängt etwas an die Kennung in `/sw.js`. */
let swAnhang = "";
const haengend = new Set();
const setzeModus = (m) => {
  modus = m;
  for (const s of haengend) s.destroy();
  haengend.clear();
};

const proxy = http.createServer((req, res) => {
  if (modus === "aus") return void req.socket.destroy();
  if (modus === "haengt") {
    haengend.add(req.socket);
    req.socket.on("close", () => haengend.delete(req.socket));
    return;
  }
  const istWorker = (req.url ?? "").split("?")[0] === "/sw.js";
  const kopf = { ...req.headers };
  if (istWorker) delete kopf["accept-encoding"]; // Klartext, damit sich die Kennung ändern lässt
  const weiter = http.request(
    { host: "127.0.0.1", port: PORT, path: req.url, method: req.method, headers: kopf },
    (antwort) => {
      if (!istWorker || !swAnhang) {
        res.writeHead(antwort.statusCode ?? 502, antwort.headers);
        antwort.pipe(res);
        return;
      }
      const teile = [];
      antwort.on("data", (c) => teile.push(c));
      antwort.on("end", () => {
        const text = Buffer.concat(teile)
          .toString("utf8")
          .replace(/"v":"([0-9a-f]+)"/, `"v":"$1${swAnhang}"`);
        const k = { ...antwort.headers };
        delete k["content-length"];
        res.writeHead(antwort.statusCode ?? 502, k);
        res.end(text);
      });
    },
  );
  weiter.on("error", () => res.destroy());
  req.pipe(weiter);
});

if (!existsSync(".next/BUILD_ID")) {
  console.error("Kein Build gefunden – zuerst `npm run build`.");
  process.exit(1);
}
const { server } = await starteServer(spawn, PORT);
await new Promise((ok, nein) => {
  proxy.once("error", nein);
  proxy.listen(VORN, "127.0.0.1", ok);
});
const aufraeumen = () => {
  server.kill("SIGTERM");
  proxy.close();
};
process.on("exit", aufraeumen);

// ── Browser ──────────────────────────────────────────────────────────────
const browser = await chromium.launch({ executablePath: exe });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
await ctx.addInitScript(() => {
  if (localStorage.getItem("wilhelm-training-settings")) return;
  localStorage.setItem(
    "wilhelm-training-settings",
    JSON.stringify({
      timeBudgetMin: 25,
      autoregOn: true,
      theme: "light",
      onboarded: true,
      benchMigrated: true,
      themeMigratedM72: true,
      splash: "aus",
      orteM1: true, // ein Ort → keine Ortsfrage
    }),
  );
});
const page = await ctx.newPage();
const codeFehler = [];
const CHUNK = /ChunkLoadError|Loading chunk|dynamically imported module/i;
page.on("pageerror", (e) => codeFehler.push(String(e)));
page.on("console", (m) => {
  if (m.type() === "error" && CHUNK.test(m.text())) codeFehler.push(m.text());
});

const cacheInhalt = () =>
  page.evaluate(async () => {
    const out = {};
    for (const k of await caches.keys()) {
      const reqs = await (await caches.open(k)).keys();
      out[k] = reqs.map((r) => new URL(r.url).pathname);
    }
    return out;
  });
/** Setzt eine Marke ins Fenster; verschwindet sie, wurde die Seite neu geladen. */
const marke = () => page.evaluate(() => void (window.__marke = true));
const hatMarke = () => page.evaluate(() => window.__marke === true).catch(() => false);
const pfad = () => new URL(page.url()).pathname;
/**
 * Wartet, bis nur noch der Cache `name` da ist. Fragt von außen in Abständen
 * nach statt im Fenster zu warten: nach dem Training lädt die Seite ein- oder
 * zweimal neu (einmal mehr, wenn der Wechsel zur Startseite als ganzer
 * Seitenaufruf lief, wie in der Minute nach einem Netzausfall), und ein
 * Warten im Fenster reißt bei jedem Neuladen ab.
 */
async function nurNochCache(name, ms = 30000) {
  const bis = Date.now() + ms;
  let inhalt = {};
  while (Date.now() < bis) {
    try {
      inhalt = await cacheInhalt();
      const k = Object.keys(inhalt);
      if (k.length === 1 && k[0] === name) return { ok: true, inhalt };
    } catch {
      /* Seite lädt gerade neu */
    }
    await new Promise((r) => setTimeout(r, 300));
  }
  return { ok: false, inhalt };
}
/** Simuliert einen neuen Build: `/sw.js` bekommt eine andere Kennung, dann
 *  fragt die Seite nach einem Update. */
async function neuerBuild(anhang) {
  swAnhang = anhang;
  await page.evaluate(async () => {
    const reg = await navigator.serviceWorker.getRegistration();
    await reg.update();
  });
}
/** Macht aus dem Fenster eines mit altem Code: es hat ein Skript geladen, das
 *  der neue Build nicht kennt. */
const machAlt = () =>
  page.evaluate(() => {
    const s = document.createElement("script");
    s.src = "/_next/static/chunks/alter-build-0000.js";
    document.head.appendChild(s);
  });
const beschreibe = (inhalt) =>
  Object.keys(inhalt)
    .map((k) => `${k}: ${inhalt[k].length} Einträge`)
    .join(", ");

try {
  // ── A · Erster Besuch ──────────────────────────────────────────────────
  await page.goto(BASE + "/", { waitUntil: "load" });
  await marke();
  await page.waitForFunction(() => !!navigator.serviceWorker.controller, null, { timeout: 60000 });
  const caches1 = await cacheInhalt();
  const namen1 = Object.keys(caches1);
  pruefe(namen1.length === 1 && /^spotter-[0-9a-f]{12}$/.test(namen1[0]), `A · genau ein Cache (${namen1.join(", ")})`);
  const drin = new Set(caches1[namen1[0]] ?? []);

  // Alle Seiten der App (ohne die Rückkehr von Strava/Spotify, die Netz braucht).
  const seiten = [];
  const sucheSeiten = (dir, route) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      if (e.isDirectory()) sucheSeiten(path.join(dir, e.name), `${route}/${e.name}`);
      else if (e.name === "page.tsx") seiten.push(route || "/");
    }
  };
  sucheSeiten("app", "");
  const hauptseiten = seiten.filter((s) => !s.includes("callback"));
  const seiteFehlt = hauptseiten.filter((s) => !drin.has(s));
  pruefe(seiteFehlt.length === 0, `A · alle ${hauptseiten.length} Seiten vorgeladen${seiteFehlt.length ? ` (fehlt: ${seiteFehlt.join(", ")})` : ""}`);

  // Alle Skripte und Styles, die der Build auf die Platte gelegt hat.
  const aufPlatte = [];
  const sucheDateien = (dir) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const voll = path.join(dir, e.name);
      if (e.isDirectory()) sucheDateien(voll);
      else if (/\.(js|css)$/.test(e.name) && !e.name.startsWith("_"))
        aufPlatte.push("/_next/static/" + path.relative(".next/static", voll).split(path.sep).map(encodeURIComponent).join("/"));
    }
  };
  sucheDateien(".next/static");
  const dateiFehlt = aufPlatte.filter((d) => !drin.has(d));
  pruefe(dateiFehlt.length === 0, `A · alle ${aufPlatte.length} Skripte und Styles des Builds vorgeladen${dateiFehlt.length ? ` (fehlt: ${dateiFehlt.slice(0, 3).join(", ")})` : ""}`);
  for (const ordner of ["geraete", "bewegung", "momente"]) {
    const bilder = readdirSync(`public/${ordner}`).filter((f) => f.endsWith(".webp"));
    pruefe(
      bilder.length > 0 && bilder.every((b) => drin.has(`/${ordner}/${b}`)),
      `A · alle ${bilder.length} Bilder aus public/${ordner} vorgeladen`,
    );
  }
  pruefe(![...drin].some((p) => p.startsWith("/api/")), "A · nichts von /api/ im Cache");
  pruefe(await hatMarke(), "A · erste Installation lädt die Seite nicht neu");

  // ── B · Ohne Netz zwischen den Seiten wechseln ─────────────────────────
  setzeModus("aus");
  await page.reload({ waitUntil: "load" });
  await page.getByText("Los geht", { exact: false }).first().waitFor({ timeout: 15000 });
  pruefe(true, "B · Heute lädt ohne Netz");
  for (const ziel of ["/uebungen", "/fortschritt", "/coach", "/settings", "/"]) {
    await page.locator(`a[href="${ziel}"]`).first().click();
    const ok = await page
      .waitForFunction((z) => location.pathname === z && document.body.innerText.length > 200, ziel, { timeout: 15000 })
      .then(() => true, () => false);
    pruefe(ok, `B · ohne Netz nach ${ziel}`);
  }
  // Bilder kommen ohne Netz aus dem Cache, auch mit Versions-Anhang (`?v=`).
  const bildOffline = await page.evaluate(async () => {
    const urls = ["/bewegung/goblet-klein.webp?v=1", "/bewegung/march_high.webp?v=1", "/momente/rekord.webp?v=1", "/geraete/m_beinpresse-klein.webp?v=1"];
    const r = await Promise.all(urls.map((u) => fetch(u).then((x) => x.ok, () => false)));
    return r.every(Boolean);
  });
  pruefe(bildOffline, "B · Bewegungs-, Moment- und Gerätebilder kommen ohne Netz aus dem Cache");

  // ── C · Ohne Netz trainieren ───────────────────────────────────────────
  await page.getByText("Los geht", { exact: false }).first().click();
  const imTraining = await page
    .getByText("Überspringen")
    .first()
    .waitFor({ timeout: 15000 })
    .then(() => true, () => false);
  pruefe(imTraining && pfad() === "/workout", `C · „Los geht’s“ öffnet ohne Netz das Training (${pfad()})`);
  await page.getByText("Überspringen").first().click();
  await page.getByLabel("Aufwärmen beenden").click();
  await page.getByTestId("stage-order").waitFor({ timeout: 15000 });
  const felder = page.locator(".set-active input");
  if ((await felder.count()) >= 2) {
    await felder.nth(0).fill("20");
    await felder.nth(1).fill("11");
    await felder.nth(1).press("Enter");
  } else {
    await felder.nth(0).fill("11");
    await felder.nth(0).press("Enter");
  }
  await page.locator('section[aria-label="Satzpause"]').waitFor({ state: "visible", timeout: 8000 });
  pruefe(true, "C · Satz eingetragen, Pause läuft");
  await page.reload({ waitUntil: "load" });
  const weiter = await page
    .getByTestId("stage-order")
    .waitFor({ timeout: 15000 })
    .then(() => true, () => false);
  const satzDa = weiter && /\b11\b/.test(await page.getByTestId("stage-order").innerText());
  pruefe(weiter && satzDa, "C · nach dem Neuladen ohne Netz läuft die Einheit weiter, der Satz steht da");

  // ── D · Ein neuer Build wartet, solange trainiert wird ─────────────────
  setzeModus("an");
  // Einmal mit Netz laden: der Worker merkt, dass es wieder da ist, und der
  // Wechsel zur Startseite läuft danach wieder weich (ohne ganzen Seitenaufruf).
  await page.reload({ waitUntil: "load" });
  await page.getByTestId("stage-order").waitFor({ timeout: 15000 });
  await page.waitForTimeout(800);
  const alt = Object.keys(await cacheInhalt())[0];
  await machAlt();
  await marke();
  await neuerBuild("d");
  const wartet = await page
    .waitForFunction(async () => !!(await navigator.serviceWorker.getRegistration())?.waiting, null, { timeout: 60000 })
    .then(() => true, () => false);
  await page.waitForTimeout(2500);
  pruefe(wartet && (await hatMarke()), "D · neuer Build ist geladen und wartet, das Training läuft ungestört weiter");
  pruefe(Object.keys(await cacheInhalt()).includes(alt), "D · der Cache des laufenden Builds bleibt, solange gewartet wird");

  await page.getByLabel("Training beenden").click();
  await page.getByText("Zum Abschluss").first().click();
  await page.getByText("Wie fühlt sich dein unterer Rücken an?").waitFor({ timeout: 8000 });
  await page.getByText("Gut", { exact: true }).click();
  await page.getByText("Beenden & speichern").click();
  await page.getByRole("button", { name: "Weiter" }).first().click({ timeout: 15000 });
  const nachD = await nurNochCache(`${alt}d`);
  pruefe(nachD.ok, `D · nach dem Speichern übernimmt der neue Build, der alte Cache ist weg (${beschreibe(nachD.inhalt)})`);
  const neuGeladen = await page
    .waitForFunction(() => window.__marke !== true && location.pathname === "/", null, { timeout: 15000 })
    .then(() => true, () => false);
  pruefe(neuGeladen, "D · das Fenster mit dem alten Code lädt einmal neu");
  await page.waitForLoadState("load");
  const gespeichert = await page.evaluate(() => {
    const log = JSON.parse(localStorage.getItem("wilhelm-training-log") || "[]");
    return { anzahl: log.length, offen: localStorage.getItem("wilhelm-training-active") != null };
  });
  pruefe(gespeichert.anzahl === 1 && !gespeichert.offen, `D · die Einheit steht im Verlauf (${gespeichert.anzahl})`);

  // ── E · Außerhalb des Trainings ────────────────────────────────────────
  // E1 · Das Fenster hat schon den neuen Code (der Normalfall nach einem
  // Deployment: die Seite kam frisch aus dem Netz): übernehmen OHNE Neuladen.
  await page.getByText("Geschafft", { exact: false }).first().waitFor({ timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(500);
  await marke();
  await neuerBuild("e");
  const nachE1 = await nurNochCache(`${alt}e`);
  await page.waitForTimeout(1500);
  pruefe(
    nachE1.ok && (await hatMarke()),
    `E · läuft im Fenster schon der neue Code, übernimmt der neue Build ohne Neuladen (${beschreibe(nachE1.inhalt)})`,
  );

  // E2 · Das Fenster hat alten Code: übernehmen und einmal neu laden.
  await machAlt();
  await marke();
  await neuerBuild("f");
  const nachE2 = await nurNochCache(`${alt}f`);
  const neuE2 = await page
    .waitForFunction(() => window.__marke !== true, null, { timeout: 15000 })
    .then(() => true, () => false);
  pruefe(nachE2.ok && neuE2, `E · mit altem Code im Fenster lädt die Seite einmal neu (${beschreibe(nachE2.inhalt)})`);

  // E3 · Altes Fenster, aber der Nutzer tippt gerade: erst nach dem Tippen.
  await page.waitForLoadState("load");
  await page.locator('nav a[href="/coach"]').click();
  const feld = page.getByLabel("Nachricht an ATLAS");
  await feld.waitFor({ timeout: 15000 });
  await page.waitForTimeout(500);
  await machAlt();
  await marke();
  await feld.fill("Wie steigere ich");
  await neuerBuild("g");
  const nachE3 = await nurNochCache(`${alt}g`);
  await page.waitForTimeout(2000);
  pruefe(
    nachE3.ok && (await hatMarke()) && (await feld.inputValue()) === "Wie steigere ich",
    "E · tippt der Nutzer gerade, wird nicht neu geladen, der Text bleibt stehen",
  );
  await page.evaluate(() => document.activeElement?.blur?.());
  const neuE3 = await page
    .waitForFunction(() => window.__marke !== true, null, { timeout: 15000 })
    .then(() => true, () => false);
  pruefe(neuE3, "E · sobald das Eingabefeld verlassen ist, lädt die Seite neu");

  // ── F · Das Netz hängt ─────────────────────────────────────────────────
  await page.waitForLoadState("load");
  await page.waitForTimeout(500);
  setzeModus("haengt");
  const messe = async (ziel) => {
    const t0 = Date.now();
    await page.goto(BASE + ziel, { waitUntil: "commit" });
    await page.waitForFunction(() => document.body.innerText.length > 200, null, { timeout: 20000 });
    return Date.now() - t0;
  };
  const erster = await messe("/fortschritt");
  pruefe(erster >= 2500 && erster < 6000, `F · hängt das Netz, kommt die Seite nach rund 3 s aus dem Cache (${erster} ms)`);
  const zweiter = await messe("/uebungen");
  pruefe(zweiter < 1500, `F · der nächste Aufruf kommt sofort (${zweiter} ms)`);
  const t0 = Date.now();
  await page.locator('nav a[href="/"]').click();
  await page.waitForFunction(() => location.pathname === "/" && document.body.innerText.length > 200, null, { timeout: 20000 });
  const dritter = Date.now() - t0;
  pruefe(dritter < 1500, `F · der Wechsel über die Leiste ebenso (${dritter} ms)`);

  pruefe(codeFehler.length === 0, `kein Code-Fehler im ganzen Ablauf${codeFehler.length ? `: ${codeFehler.slice(0, 3).join(" | ")}` : ""}`);
} catch (e) {
  pruefe(false, `Ablauf abgebrochen: ${String(e).split("\n")[0]}`);
} finally {
  setzeModus("an");
  await browser.close();
  aufraeumen();
}

if (fehler.length) {
  console.error(`\n${fehler.length} Prüfung(en) fehlgeschlagen.`);
  process.exit(1);
}
console.log("\nOffline-Prüfung bestanden.");
process.exit(0);
