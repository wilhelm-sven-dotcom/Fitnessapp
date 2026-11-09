/**
 * Bildschirmfotos der ganzen App gegen den Produktions-Build, mit Testdaten.
 *
 *   npm run build && npm run fotos -- [ausgabe] [--klein]
 *
 * Ausgabe (Standard `.fotos/`): je Bildschirm ein PNG bei Faktor 2. Mit
 * `--klein` zusätzlich Heute und Training bei 375 × 667 pt (iPhone SE).
 * Port 3198, damit es neben den Prüfskripten (3199) laufen kann.
 */
import { spawn } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import { chromium } from "playwright";
import { LOG, kontextMitDaten, starteServer } from "./lib/testdaten.mjs";

const args = process.argv.slice(2);
const OUT = args.find((a) => !a.startsWith("--")) ?? ".fotos";
const KLEIN = args.includes("--klein");
mkdirSync(OUT, { recursive: true });

const exe =
  process.env.SMOKE_CHROMIUM ??
  (existsSync("/opt/pw-browsers/chromium") ? "/opt/pw-browsers/chromium" : undefined);

const { server, base: BASE } = await starteServer(spawn, 3198);
const browser = await chromium.launch(exe ? { executablePath: exe } : {});
let fehler = 0;

async function shot(pg, name, opts = {}) {
  await pg.waitForTimeout(opts.wait ?? 700);
  await pg.screenshot({ path: `${OUT}/${name}.png`, fullPage: !!opts.full });
  console.log("FOTO", name);
}
async function schritt(name, fn) {
  try {
    await fn();
  } catch (e) {
    fehler++;
    console.log("FEHLER", name, String(e).split("\n")[0]);
  }
}

/** Erste Übung von heute bekommt einen Vorwert, damit der Rekord-Moment greift. */
async function rekordVorwert(pg) {
  const erste = await pg.evaluate(() => {
    const t = JSON.parse(localStorage.getItem("wilhelm-training-today") || "null");
    return t?.items?.[0]?.exerciseId ?? null;
  });
  if (!erste || LOG.some((s) => s.exercises.some((e) => e.id === erste))) return;
  await pg.evaluate((id) => {
    const log = JSON.parse(localStorage.getItem("wilhelm-training-log") || "[]");
    log.unshift({
      date: new Date(Date.now() - 20 * 86400000).toISOString(),
      dayKey: "today",
      dayName: "Ganzkörper · Zug",
      focus: "",
      ort: "Studio",
      exercises: [{ id, name: id, unit: "Wdh", sets: [{ weight: "20", reps: "8", rir: 2 }] }],
    });
    localStorage.setItem("wilhelm-training-log", JSON.stringify(log));
  }, erste);
  await pg.reload({ waitUntil: "networkidle" });
  if (await pg.getByText("Wo trainierst du heute?").count()) {
    await pg.getByRole("button", { name: /^Studio/ }).first().click();
  }
  await pg.getByTestId("start").waitFor({ timeout: 10000 });
}

try {
  // ── Begrüßung: frisches Gerät ──
  await schritt("begruessung", async () => {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
    const pg = await ctx.newPage();
    await pg.goto(BASE + "/", { waitUntil: "networkidle" });
    await pg.waitForTimeout(3500);
    await shot(pg, "01-begruessung");
    await ctx.close();
  });

  const ctx = await kontextMitDaten(browser, { theme: "light" });
  const pg = await ctx.newPage();
  pg.on("pageerror", (e) => console.log("PAGEERROR", e.message));

  await schritt("ortsfrage", async () => {
    await pg.goto(BASE + "/", { waitUntil: "networkidle" });
    await pg.getByText("Wo trainierst du heute?").first().waitFor({ timeout: 8000 });
    await shot(pg, "02-ortsfrage");
  });
  await schritt("heute", async () => {
    await pg.getByRole("button", { name: /^Studio/ }).first().click();
    await pg.getByTestId("start").waitFor({ timeout: 10000 });
    await rekordVorwert(pg);
    await shot(pg, "03-heute");
    await shot(pg, "03b-heute-voll", { full: true, wait: 100 });
  });
  await schritt("bearbeiten", async () => {
    await pg.getByText("Bearbeiten", { exact: false }).first().click();
    await pg.getByText("Einheit bearbeiten").waitFor({ timeout: 5000 });
    await shot(pg, "04-bearbeiten");
    await pg.keyboard.press("Escape");
    await pg.waitForTimeout(600);
  });
  await schritt("tagesform", async () => {
    await pg.getByTestId("start").click();
    await pg.waitForURL("**/workout", { timeout: 10000 });
    await pg.getByText("Tagesform").first().waitFor({ timeout: 10000 });
    await shot(pg, "05-tagesform");
  });
  await schritt("aufwaermen", async () => {
    await pg.getByText("Überspringen").first().click();
    await pg.getByLabel("Aufwärmen beenden").waitFor({ timeout: 8000 });
    await shot(pg, "06-aufwaermen", { wait: 1200 });
  });
  await schritt("uebung", async () => {
    await pg.getByLabel("Aufwärmen beenden").click();
    await pg.getByTestId("stage-order").waitFor({ timeout: 10000 });
    await shot(pg, "07-uebung", { wait: 1000 });
    await shot(pg, "07b-uebung-voll", { full: true, wait: 100 });
  });
  await schritt("pause", async () => {
    const inputs = pg.locator(".set-active input");
    if ((await inputs.count()) >= 2) {
      await inputs.nth(0).fill("25");
      await inputs.nth(1).fill("8");
      await inputs.nth(1).press("Enter");
    } else {
      await inputs.nth(0).fill("45");
      await inputs.nth(0).press("Enter");
    }
    await pg.getByText("Pause", { exact: false }).first().waitFor({ timeout: 6000 });
    await shot(pg, "08-pause", { wait: 1200 });
  });
  await schritt("abschluss", async () => {
    await pg.getByLabel("Training beenden").click();
    await shot(pg, "09-beenden", { wait: 900 });
    await pg.getByText("Zum Abschluss").first().click();
    await pg.getByText("Wie fühlt sich dein unterer Rücken an?").waitFor({ timeout: 6000 });
    await shot(pg, "10-abschluss", { wait: 900 });
    await pg.getByText("Gut", { exact: true }).click();
    await pg.getByText("Beenden & speichern").click();
    await pg.getByText(/Neuer Rekord|Gespeichert/).first().waitFor({ timeout: 8000 });
    await shot(pg, "11-rekord", { wait: 2500 });
  });
  const reiter = [["uebersicht", "Übersicht"], ["verlauf", "Verlauf"], ["koerper", "Körper"], ["muskeln", "Muskeln"]];
  for (const [i, [key, label]] of reiter.entries()) {
    await schritt("fortschritt-" + key, async () => {
      if (i === 0) await pg.goto(BASE + "/fortschritt", { waitUntil: "networkidle" });
      else await pg.getByText(label, { exact: true }).first().click();
      await shot(pg, `${12 + i}-fortschritt-${key}`, { wait: 1200 });
      await shot(pg, `${12 + i}b-fortschritt-${key}-voll`, { full: true, wait: 100 });
    });
  }
  await schritt("katalog", async () => {
    await pg.goto(BASE + "/uebungen", { waitUntil: "networkidle" });
    // Studio = „nur an Geräten“: Katalog nach Geräten, Detail mit dem
    // mitgelieferten Bild (Butterfly) und mit der Zeichnung (Beinpresse).
    await shot(pg, "16-katalog", { wait: 1000 });
    await pg.getByRole("button", { name: /^Butterfly/ }).first().click();
    await shot(pg, "17-guide", { wait: 1200 });
    await pg.keyboard.press("Escape");
    await pg.waitForTimeout(400);
    await pg.getByRole("button", { name: /^Beinpresse/ }).first().click();
    await shot(pg, "17b-guide-zeichnung", { wait: 1200 });
    await pg.keyboard.press("Escape");
    await pg.getByRole("button", { name: "Alle", exact: true }).first().click();
    await shot(pg, "16b-katalog-alle", { wait: 800 });
  });
  await schritt("atlas", async () => {
    await pg.goto(BASE + "/coach", { waitUntil: "networkidle" });
    await shot(pg, "18-atlas", { wait: 1200 });
    await shot(pg, "18b-atlas-voll", { full: true, wait: 100 });
  });
  await schritt("einstellungen", async () => {
    await pg.goto(BASE + "/settings", { waitUntil: "networkidle" });
    await shot(pg, "19-einstellungen", { wait: 1000 });
  });
  await ctx.close();

  await schritt("heute-dunkel", async () => {
    const c2 = await kontextMitDaten(browser, { theme: "dark" });
    const p2 = await c2.newPage();
    await p2.goto(BASE + "/", { waitUntil: "networkidle" });
    await p2.getByRole("button", { name: /^Zuhause/ }).first().click();
    await p2.getByTestId("start").waitFor({ timeout: 10000 });
    await shot(p2, "20-heute-dunkel");
    await c2.close();
  });

  if (KLEIN) {
    await schritt("klein", async () => {
      const c3 = await kontextMitDaten(browser, { theme: "light", breite: 375, hoehe: 667 });
      const p3 = await c3.newPage();
      await p3.goto(BASE + "/", { waitUntil: "networkidle" });
      await p3.getByRole("button", { name: /^Studio/ }).first().click();
      await p3.getByTestId("start").waitFor({ timeout: 10000 });
      await shot(p3, "21-klein-heute");
      await p3.getByTestId("start").click();
      await p3.waitForURL("**/workout");
      await p3.getByText("Überspringen").first().click();
      await p3.getByLabel("Aufwärmen beenden").click();
      await p3.getByTestId("stage-order").waitFor({ timeout: 10000 });
      await shot(p3, "22-klein-uebung", { wait: 1000 });
      await c3.close();
    });
  }
} finally {
  await browser.close();
  server.kill("SIGTERM");
}
console.log(fehler ? `\n${fehler} Schritt(e) fehlgeschlagen` : "\nAlle Fotos gemacht.");
process.exit(fehler ? 1 : 0);
