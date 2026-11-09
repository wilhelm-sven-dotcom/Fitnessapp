/**
 * Misst, wo die Hauptaktionen liegen (Messpunkte aus der Mobbin-Prüfung).
 *
 *   npm run build && npm run messen
 *
 * Je Viewport (390 × 844 und 375 × 667): „Los geht’s“ auf Heute,
 * „Satz eintragen“ (Dock) im Training, das Pausenfeld, die ATLAS-Eingabe und die
 * Höhe der Fortschritt-Übersicht. „im Bild“ heißt: ganz innerhalb des Viewports.
 * Port 3197. Gibt JSON aus; Exit 0, die Werte sind zum Vergleichen da.
 */
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { chromium } from "playwright";
import { kontextMitDaten, starteServer } from "./lib/testdaten.mjs";

const exe =
  process.env.SMOKE_CHROMIUM ??
  (existsSync("/opt/pw-browsers/chromium") ? "/opt/pw-browsers/chromium" : undefined);
const { server, base: BASE } = await starteServer(spawn, 3197);
const browser = await chromium.launch(exe ? { executablePath: exe } : {});

const rect = async (loc) => {
  try {
    const b = await loc.first().boundingBox();
    return b ? { y: Math.round(b.y), unten: Math.round(b.y + b.height) } : null;
  } catch {
    return null;
  }
};
const imBild = (r, hoehe) => (r ? r.y >= 0 && r.unten <= hoehe : false);

const ergebnis = {};
try {
  for (const [breite, hoehe] of [[390, 844], [375, 667]]) {
    const key = `${breite}x${hoehe}`;
    const m = (ergebnis[key] = {});
    const ctx = await kontextMitDaten(browser, { breite, hoehe, faktor: 1 });
    const pg = await ctx.newPage();
    await pg.goto(BASE + "/", { waitUntil: "networkidle" });
    await pg.getByRole("button", { name: /^Studio/ }).first().click();
    await pg.getByTestId("start").waitFor({ timeout: 10000 });
    await pg.waitForTimeout(500);
    const start = await rect(pg.getByTestId("start"));
    m.trainingStarten = { ...start, imBild: imBild(start, hoehe) };

    await pg.getByTestId("start").click();
    await pg.waitForURL("**/workout");
    await pg.getByText("Überspringen").first().click();
    await pg.getByLabel("Aufwärmen beenden").click();
    await pg.getByTestId("stage-order").waitFor({ timeout: 10000 });
    await pg.waitForTimeout(800);
    const satz = await rect(pg.getByTestId("satz-protokollieren"));
    m.satzProtokollieren = { ...satz, imBild: imBild(satz, hoehe) };

    const inputs = pg.locator(".set-active input");
    if ((await inputs.count()) >= 2) {
      await inputs.nth(0).fill("25");
      await inputs.nth(1).fill("8");
      await inputs.nth(1).press("Enter");
    } else {
      await inputs.nth(0).fill("45");
      await inputs.nth(0).press("Enter");
    }
    await pg.locator('section[aria-label="Satzpause"]').waitFor({ timeout: 6000 });
    await pg.waitForTimeout(600);
    m.pausenfeld = await rect(pg.locator('section[aria-label="Satzpause"]'));
    await ctx.close();

    const c2 = await kontextMitDaten(browser, { breite, hoehe, faktor: 1 });
    const p2 = await c2.newPage();
    await p2.goto(BASE + "/coach", { waitUntil: "networkidle" });
    await p2.waitForTimeout(800);
    const eingabe = await rect(p2.locator("textarea, input[type=text]"));
    m.atlasEingabe = { ...eingabe, imBild: imBild(eingabe, hoehe) };
    await p2.goto(BASE + "/fortschritt", { waitUntil: "networkidle" });
    await p2.waitForTimeout(800);
    m.uebersichtHoehe = await p2.evaluate(() => document.documentElement.scrollHeight);
    await c2.close();
  }
} finally {
  await browser.close();
  server.kill("SIGTERM");
}
console.log(JSON.stringify(ergebnis, null, 2));
process.exit(0);
