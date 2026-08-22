/**
 * Nachweis für die drei Beschwerden, die man nur am laufenden Bild prüfen kann:
 *
 *   A  40 Wiederholungen bleiben 40 (nichts wird stillschweigend gekappt).
 *   B  Das Pausen-Dock verdeckt die Satzliste nicht mehr — per Bounding-Box
 *      gemessen, nicht nach Augenmaß.
 *   C  Ist die Übung fertig, steht der Knopf zur nächsten Übung da.
 *
 * Läuft gegen den Produktions-Build auf Port 3199 (wie scripts/smoke.mjs).
 * Aufruf: node scripts/pruefe-training.mjs [screenshot-verzeichnis]
 */
import { spawn } from "node:child_process";
import { chromium } from "playwright";

const PORT = 3199;
const BASE = `http://127.0.0.1:${PORT}`;
const SHOTS = process.argv[2] ?? null;
const exe = process.env.PW_CHROMIUM || "/opt/pw-browsers/chromium";

const server = spawn("npx", ["next", "start", "-p", String(PORT)], {
  stdio: "ignore",
  env: { ...process.env, PORT: String(PORT) },
});
process.on("exit", () => server.kill("SIGTERM"));

for (let i = 0; i < 60; i++) {
  try {
    if ((await fetch(BASE + "/")).ok) break;
  } catch {
    /* noch nicht oben */
  }
  await new Promise((r) => setTimeout(r, 500));
}

const browser = await chromium.launch({ executablePath: exe });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
const fehler = [];
const pruefe = (ok, text) => {
  console.log(`${ok ? "OK  " : "FEHL"} ${text}`);
  if (!ok) fehler.push(text);
};

await page.addInitScript(() => {
  localStorage.setItem(
    "wilhelm-training-settings",
    JSON.stringify({
      timeBudgetMin: 25,
      autoregOn: true,
      theme: "dark",
      onboarded: true,
      benchMigrated: true,
      themeMigratedM72: true,
      splash: "aus",
    }),
  );
});

await page.goto(BASE + "/", { waitUntil: "networkidle" });
await page.getByText("Training starten", { exact: false }).first().waitFor({ timeout: 15000 });
await page.getByText("Training starten", { exact: false }).first().click();
await page.getByText("Überspringen").first().click();
await page.getByLabel("Aufwärmen beenden").click();
await page.getByTestId("stage-order").waitFor({ timeout: 15000 });

// ── A · 40 Wiederholungen ───────────────────────────────────────────────
const inputs = page.locator(".set-active input");
const zwei = (await inputs.count()) >= 2;
if (zwei) {
  await inputs.nth(0).fill("20");
  await inputs.nth(1).fill("40");
  await inputs.nth(1).press("Enter");
} else {
  await inputs.nth(0).fill("40");
  await inputs.nth(0).press("Enter");
}
await page.getByText("Pause", { exact: false }).first().waitFor({ timeout: 8000 });
const stageText = (await page.getByTestId("stage-order").innerText()) ?? "";
pruefe(/\b40\b/.test(stageText), `A · 40 Wiederholungen stehen im Logbuch`);
pruefe(!/\b20 Wdh\b/.test(stageText.replace(/20 kg/g, "")), "A · keine Verwechslung kg ↔ Wdh");

// ── B · Dock verdeckt nichts ────────────────────────────────────────────
const dock = page.locator('section[aria-label="Satzpause"]');
await dock.waitFor({ state: "visible", timeout: 8000 });
await page.waitForTimeout(400);
const dockBox = await dock.boundingBox();
// Ein festes Dock überdeckt zwangsläufig alles, was gerade darunter
// durchscrollt. Die Frage ist nicht „liegt etwas darunter", sondern: kann man
// WEIT GENUG scrollen, dass die letzte Satzzeile frei steht? Genau das war
// vorher nicht möglich — der Auslauf war zu knapp bemessen.
await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
await page.waitForTimeout(400);
const zeilen = page.locator('[data-testid="stage-order"] input');
const n = await zeilen.count();
let tiefste = 0;
for (let i = 0; i < n; i++) {
  const b = await zeilen.nth(i).boundingBox();
  if (b) tiefste = Math.max(tiefste, b.y + b.height);
}
pruefe(
  dockBox != null && tiefste > 0 && tiefste <= dockBox.y + 1,
  `B · nach dem Scrollen endet die Satzliste bei ${Math.round(tiefste)} px, Dock beginnt bei ${Math.round(dockBox?.y ?? -1)} px`,
);
// Der Inhalt muss so weit auslaufen, dass man bis unter das Dock scrollen kann.
const auslauf = await page.evaluate(() => {
  const el = document.querySelector('[data-testid="stage-order"]')?.parentElement;
  return el ? parseFloat(getComputedStyle(el).paddingBottom) : 0;
});
pruefe(
  dockBox != null && auslauf >= dockBox.height,
  `B · Auslauf ${Math.round(auslauf)} px ≥ Dock-Höhe ${Math.round(dockBox?.height ?? 0)} px`,
);
if (SHOTS) await page.screenshot({ path: `${SHOTS}/dock.png` });

// ── C · Knopf zur nächsten Übung, sobald die Übung fertig ist ───────────
for (let runde = 0; runde < 8; runde++) {
  const offen = page.locator(".set-active input");
  if ((await offen.count()) === 0) break;
  const mehrere = (await offen.count()) >= 2;
  if (mehrere) {
    await offen.nth(0).fill("20");
    await offen.nth(1).fill("12");
    await offen.nth(1).press("Enter");
  } else {
    await offen.nth(0).fill("12");
    await offen.nth(0).press("Enter");
  }
  await page.waitForTimeout(350);
}
const weiter = page.getByRole("button", { name: /Nächste Übung|Zum Abschluss/ }).first();
const sichtbar = await weiter.isVisible().catch(() => false);
pruefe(sichtbar, "C · Knopf zur nächsten Übung erscheint nach dem letzten Satz");
if (sichtbar) {
  const box = await weiter.boundingBox();
  const stage = await page.getByTestId("stage-order").boundingBox();
  pruefe(
    box != null && stage != null && box.y >= stage.y,
    "C · Knopf liegt in der Bühne, nicht am Seitenende",
  );
}
if (SHOTS) await page.screenshot({ path: `${SHOTS}/fertig.png` });

await browser.close();
server.kill("SIGTERM");
if (fehler.length) {
  console.error(`\n${fehler.length} PRÜFUNG(EN) FEHLGESCHLAGEN`);
  process.exit(1);
}
console.log("\nALLE PRÜFUNGEN BESTANDEN ✅");
