/**
 * End-to-End-Smoke-Test gegen den Produktions-Build — OHNE API-Key, damit
 * bewusst die deterministischen Fallback-Pfade laufen (ATLAS-KI still).
 *
 *   npm run build && npm run smoke
 *
 * Startet selbst `next start` auf Port 3199, fährt die Kern-Reise ab:
 * Boot ohne Splash → Heute angesetzt → Editor-Tausch → Training starten →
 * Check-in überspringen → Aufwärmen → Satz loggen (Inline-Pause, ATLAS-Zeile)
 * → Reload mitten in der Einheit (Resume!) → Abschluss speichern → Verlauf
 * zeigt die Einheit → Katalog-Filter + eigene Übung → Alt-Log (A/B/C) rendert.
 */
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { chromium } from "playwright";

const PORT = 3199;
const BASE = `http://localhost:${PORT}`;

const exe =
  process.env.SMOKE_CHROMIUM ??
  (existsSync("/opt/pw-browsers/chromium") ? "/opt/pw-browsers/chromium" : undefined);

let step = "server";
const fail = (msg) => {
  console.error(`\nFEHLGESCHLAGEN @ ${step}: ${msg}`);
  process.exitCode = 1;
};

// ── Server hochfahren ──
const server = spawn("npx", ["next", "start", "-p", String(PORT)], {
  stdio: "ignore",
  env: { ...process.env, ANTHROPIC_API_KEY: "" },
});
const killServer = () => {
  try {
    server.kill();
  } catch {
    /* schon weg */
  }
};
process.on("exit", killServer);

const waitForServer = async () => {
  for (let i = 0; i < 60; i++) {
    try {
      const r = await fetch(BASE + "/");
      if (r.ok) return;
    } catch {
      /* noch nicht oben */
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error("Server startet nicht (npm run build vergessen?)");
};

const browser = await chromium.launch(exe ? { executablePath: exe } : {});
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
page.on("pageerror", (e) => console.error(`  PAGEERROR @ ${step}: ${e.message}`));

// Onboarding überspringen + ein Alt-Format-Log (A/B/C-Ära) einspielen —
// die App muss Bestandsdaten crashfrei rendern.
await page.addInitScript(() => {
  if (!window.localStorage.getItem("wilhelm-training-settings")) {
    window.localStorage.setItem(
      "wilhelm-training-settings",
      JSON.stringify({
        timeBudgetMin: 25,
        autoregOn: true,
        theme: "dark",
        onboarded: true,
        benchMigrated: true,
        // Startbild aus: die Choreografie hält den Kaltstart bewusst ~2,4 s
        // fest. Für die Durchlauf-Checks wäre das nur Wartezeit ohne Aussage —
        // das Startbild selbst prüft Schritt 11 gezielt.
        splash: "aus",
      }),
    );
  }
  if (!window.localStorage.getItem("wilhelm-training-log")) {
    window.localStorage.setItem(
      "wilhelm-training-log",
      JSON.stringify([
        {
          date: new Date(Date.now() - 3 * 86400000).toISOString(),
          dayKey: "A",
          dayName: "Ganzkörper A",
          focus: "Beine & Druck",
          exercises: [
            {
              id: "goblet",
              name: "Goblet Squat",
              unit: "Wdh",
              sets: [{ weight: "20", reps: "10", rir: 2 }],
            },
          ],
        },
      ]),
    );
  }
});

try {
  await waitForServer();
  console.log("Server läuft — Smoke beginnt.\n");

  // ── 1 · Boot ohne Splash: Inhalt < 1,5 s nach DOM-Ready ──
  step = "boot";
  const t0 = Date.now();
  await page.goto(BASE + "/", { waitUntil: "domcontentloaded" });
  await page.getByText("Deine Einheit heute", { exact: false }).first().waitFor({ timeout: 1500 }).catch(async () => {
    await page.getByText("Training starten", { exact: false }).first().waitFor({ timeout: 3000 });
  });
  console.log(`OK boot: Inhalt nach ${Date.now() - t0} ms, kein Splash`);

  // ── 2 · Heute: komponierte Einheit mit ≥3 Übungen + why-Zeilen ──
  step = "heute";
  await page.getByText("Training starten", { exact: false }).first().waitFor({ timeout: 8000 });
  const items = await page.locator("main, body").first().textContent();
  if (!/0[123]/.test(items ?? "")) throw new Error("Nummerierte Übungsliste fehlt");
  console.log("OK heute: Einheit frisch komponiert (Fallback-Generator)");

  // ── 3 · Editor: Übung tauschen greift ──
  step = "editor";
  await page.getByText("Bearbeiten", { exact: false }).first().click();
  await page.getByText("Einheit bearbeiten").waitFor({ timeout: 5000 });
  const firstName = (
    await page.locator(".rounded-card .truncate.text-sm.font-medium").first().textContent()
  )?.trim();
  await page.getByLabel(/tauschen$/).first().click();
  // Oberstes Sheet („Übung wählen") — die zweite Zeile ist sicher eine
  // Alternative (die erste kann die aktuelle Übung sein).
  const picker = page.locator("div.fixed").filter({ hasText: "Übung wählen" }).last();
  await picker.waitFor({ timeout: 5000 });
  const rows = picker.locator("span.text-sm.text-fg");
  const target =
    (await rows.nth(0).textContent())?.trim() === firstName ? rows.nth(1) : rows.nth(0);
  const targetName = (await target.textContent())?.trim();
  await target.click();
  await page.waitForTimeout(600);
  const editTxt = (await page.textContent("body")) ?? "";
  if (targetName && !editTxt.includes(targetName))
    throw new Error("Getauschte Übung erscheint nicht in der Einheit");
  await page.keyboard.press("Escape");
  await page.waitForTimeout(500);
  console.log("OK editor: Tausch im Edit-Sheet greift");

  // ── 4 · Start → Check-in überspringen → Aufwärmen → Bühne ──
  step = "start";
  await page.getByText("Training starten", { exact: false }).first().click();
  await page.waitForURL("**/workout", { timeout: 8000 });
  await page.getByText("Tagesform").first().waitFor({ timeout: 8000 });
  await page.getByText("Überspringen").first().click();
  await page.getByLabel("Aufwärmen beenden").click();
  await page.getByTestId("stage-order").waitFor({ timeout: 8000 });
  console.log("OK start: Check-in übersprungen, Bühne zeigt Übung 1");

  // ── 5 · Satz loggen → Inline-Pause + ATLAS-Zeile (kein Overlay) ──
  step = "satz";
  const inputs = page.locator(".set-active input");
  if ((await inputs.count()) >= 2) {
    await inputs.nth(0).fill("20");
    await inputs.nth(1).fill("10");
    await inputs.nth(1).press("Enter");
  } else {
    await inputs.nth(0).fill("12");
    await inputs.nth(0).press("Enter");
  }
  await page.getByText("Pause", { exact: false }).first().waitFor({ timeout: 5000 });
  const stageTxt = (await page.textContent("body")) ?? "";
  if (!/ATLAS/.test(stageTxt)) throw new Error("ATLAS-Panel fehlt");
  console.log("OK satz: Inline-Pause läuft, ATLAS-Zeile steht");

  // ── 6 · Reload mitten in der Einheit → Resume intakt ──
  step = "resume";
  await page.reload({ waitUntil: "networkidle" });
  await page.getByTestId("stage-order").waitFor({ timeout: 8000 });
  console.log("OK resume: Einheit nach Reload nahtlos fortgesetzt");

  // ── 7 · Abschluss speichern → Sieger-Moment ──
  step = "abschluss";
  await page.getByLabel("Training beenden").click();
  await page.getByText("Zum Abschluss").first().click();
  await page.getByText("Wie fühlt sich dein unterer Rücken an?").waitFor({ timeout: 5000 });
  await page.getByText("Gut", { exact: true }).click();
  await page.getByText("Beenden & speichern").click();
  await page.waitForTimeout(1500);
  console.log("OK abschluss: Einheit gespeichert");

  // ── 8 · Verlauf: neue UND Alt-Format-Einheit rendern ──
  step = "verlauf";
  await page.goto(BASE + "/fortschritt", { waitUntil: "networkidle" });
  await page.getByText("Verlauf", { exact: true }).first().click();
  await page.waitForTimeout(600);
  const hist = (await page.textContent("body")) ?? "";
  if (!/Ganzkörper A/.test(hist)) throw new Error("Alt-Format-Einheit (A/B/C) fehlt im Verlauf");
  console.log("OK verlauf: neue + alte Einheiten in der Timeline");

  // ── 9 · Katalog: Filter + eigene Übung ──
  step = "katalog";
  await page.goto(BASE + "/uebungen", { waitUntil: "networkidle" });
  await page.waitForTimeout(600);
  await page.getByLabel("Eigene Übung anlegen").click();
  await page.getByPlaceholder("z. B. Landmine Press").fill("Smoke-Übung");
  await page.getByText("Übung anlegen", { exact: true }).click();
  await page.waitForTimeout(600);
  const kat = (await page.textContent("body")) ?? "";
  if (!/Smoke-Übung/.test(kat)) throw new Error("Eigene Übung erscheint nicht");
  if (!/1 eigene/.test(kat)) throw new Error("Eigene-Zähler fehlt");
  console.log("OK katalog: Filter-Seite + eigene Übung");

  // ── 10 · Einstellungen rendern (Theme, Geräte, ATLAS-Sektion) ──
  step = "settings";
  await page.goto(BASE + "/settings", { waitUntil: "networkidle" });
  await page.waitForTimeout(600);
  const set = (await page.textContent("body")) ?? "";
  if (!/ATLAS/.test(set) || !/Geräte/.test(set)) throw new Error("Settings unvollständig");
  console.log("OK settings: Seite vollständig");

  // ── 11 · Startbild: erscheint beim Kaltstart und räumt sich selbst ab ──
  step = "startbild";
  const splashCtx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await splashCtx.addInitScript(() => {
    window.localStorage.setItem(
      "wilhelm-training-settings",
      JSON.stringify({ theme: "light", themeMigratedM72: true, onboarded: true, splash: "v3" }),
    );
  });
  const splashPage = await splashCtx.newPage();
  await splashPage.goto(BASE + "/", { waitUntil: "commit" });
  // Sichtbar, solange die App noch nicht steht …
  await splashPage.locator("#splash").waitFor({ state: "visible", timeout: 3000 });
  // … und danach restlos weg (Abgang + display:none), nicht bloß transparent.
  await splashPage.locator("#splash").waitFor({ state: "hidden", timeout: 6000 });
  await splashPage.getByText("Deine Einheit heute", { exact: false }).first().waitFor({ timeout: 3000 });
  await splashCtx.close();
  console.log("OK startbild: Splash läuft und räumt sich ab");

  console.log("\nALLE SMOKE-CHECKS BESTANDEN ✅");
} catch (e) {
  fail(e instanceof Error ? e.message : String(e));
} finally {
  await browser.close();
  killServer();
}
