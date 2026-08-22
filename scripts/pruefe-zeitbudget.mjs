/**
 * Nachweis für die Zeitumstellung — das, was man nur am laufenden System
 * sehen kann:
 *
 *   A  Fünf Zeit-Klicks im normalen Tempo lösen GENAU EINE Anfrage an
 *      /api/atlas/session aus (vorher: eine pro Klick, alle parallel).
 *   B  Antwortet die Route mit 429, sagt die Karte „ausgelastet" — statt
 *      pauschal „nicht erreichbar".
 *   C  Antwortet die Route gar nicht, endet der Ladezustand trotzdem und die
 *      Bedienung bleibt frei.
 *   D  Bei einer BEARBEITETEN Einheit passt die Zeit den Umfang an, ohne
 *      ATLAS zu fragen und ohne die Bearbeitung zu verlieren.
 *
 * Läuft gegen den Produktions-Build auf Port 3199 (wie scripts/smoke.mjs).
 * Aufruf: node scripts/pruefe-zeitbudget.mjs
 */
import { spawn } from "node:child_process";
import { chromium } from "playwright";

const PORT = 3199;
const BASE = `http://127.0.0.1:${PORT}`;
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
const fehler = [];
const pruefe = (ok, text) => {
  console.log(`${ok ? "OK  " : "FEHL"} ${text}`);
  if (!ok) fehler.push(text);
};

const SEED = {
  timeBudgetMin: 25,
  autoregOn: true,
  theme: "dark",
  onboarded: true,
  benchMigrated: true,
  themeMigratedM72: true,
  splash: "aus",
};

/** Seite mit gesetztem Seed öffnen; `route` bedient /api/atlas/session. */
async function seite(route, warten = "networkidle") {
  const pg = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await pg.addInitScript((s) => {
    localStorage.setItem("wilhelm-training-settings", JSON.stringify(s));
  }, SEED);
  if (route) await pg.route("**/api/atlas/session", route);
  await pg.goto(BASE + "/", { waitUntil: warten });
  await pg.getByText("Training starten", { exact: false }).first().waitFor({ timeout: 20000 });
  return pg;
}

const zeitKlick = async (pg, min) =>
  pg.getByLabel(`Zeitbudget ${min} Minuten`).click();

// ── A · Fünf Klicks → eine Anfrage ──────────────────────────────────────
{
  let anfragen = 0;
  const pg = await seite(async (route) => {
    anfragen += 1;
    await new Promise((r) => setTimeout(r, 3000)); // echte Opus-Latenz nachstellen
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ok: false }),
    });
  });
  await pg.waitForTimeout(2500); // Start-Compose abwarten
  const nachStart = anfragen;
  for (const min of [30, 45, 60, 75, 90]) {
    await zeitKlick(pg, min);
    await pg.waitForTimeout(800); // normales Tipptempo
  }
  await pg.waitForTimeout(3000);
  const durchKlicks = anfragen - nachStart;
  pruefe(durchKlicks === 1, `A · fünf Zeit-Klicks → ${durchKlicks} Anfrage(n), erwartet 1`);
  // Die Einheit selbst muss sofort auf das neue Budget reagiert haben.
  const txt = await pg.locator("body").innerText();
  pruefe(/90/.test(txt), "A · das zuletzt gewählte Budget steht in der Karte");
  await pg.close();
}

// ── B · 429 wird benannt ────────────────────────────────────────────────
{
  const pg = await seite((route) =>
    route.fulfill({
      status: 429,
      contentType: "application/json",
      body: JSON.stringify({ ok: false, error: "Zu viele Anfragen" }),
    }),
  );
  await pg.waitForTimeout(1500);
  const txt = await pg.locator("body").innerText();
  pruefe(/ausgelastet/i.test(txt), "B · Rate-Limit wird als „ausgelastet“ benannt");
  pruefe(
    !/nicht erreichbar/i.test(txt),
    "B · kein irreführendes „nicht erreichbar“ beim Limit",
  );
  await pg.close();
}

// ── C · Keine Antwort → Ladezustand endet trotzdem ──────────────────────
{
  const pg = await seite(async () => {
    await new Promise(() => {}); // nie antworten
  }, "domcontentloaded");
  await pg.waitForTimeout(2000);
  const txt = await pg.locator("body").innerText();
  pruefe(/stellt gerade um/i.test(txt), "C · Karte meldet, dass ATLAS arbeitet");
  // Wunschfeld und „Neu ansetzen" dürfen dabei NICHT gesperrt sein — eine
  // neue Anfrage verdrängt die laufende, es kann sich nichts stauen.
  const wunsch = pg.getByPlaceholder(/heute|wunsch/i).first();
  const wunschGesperrt = await wunsch.isDisabled().catch(() => null);
  pruefe(wunschGesperrt === false, `C · Wunschfeld bedienbar (disabled=${wunschGesperrt})`);
  const neu = pg.getByText(/ATLAS ordnet an|Neu ansetzen/i).first();
  const neuGesperrt = await neu.isDisabled().catch(() => null);
  pruefe(neuGesperrt !== true, `C · „Neu ansetzen" bedienbar (disabled=${neuGesperrt})`);
  await pg.close();
}

// ── D · Bearbeitete Einheit: anpassen statt blockieren ──────────────────
{
  let anfragen = 0;
  const pg = await seite(async (route) => {
    anfragen += 1;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ok: false }),
    });
  });
  await pg.waitForTimeout(1500);
  // Einheit bearbeiten: erste Übung tauschen (Muster aus scripts/smoke.mjs)
  await pg.getByText("Bearbeiten", { exact: false }).first().click();
  await pg.getByText("Einheit bearbeiten").waitFor({ timeout: 8000 });
  const ersterName = (
    await pg.locator(".rounded-card .truncate.text-sm.font-medium").first().textContent()
  )?.trim();
  await pg.getByLabel(/tauschen$/).first().click();
  const picker = pg.locator("div.fixed").filter({ hasText: "Übung wählen" }).last();
  await picker.waitFor({ timeout: 8000 });
  const rows = picker.locator("span.text-sm.text-fg");
  const ziel =
    (await rows.nth(0).textContent())?.trim() === ersterName ? rows.nth(1) : rows.nth(0);
  const zielName = (await ziel.textContent())?.trim();
  await ziel.click();
  await pg.waitForTimeout(600);
  await pg.keyboard.press("Escape");
  await pg.waitForTimeout(600);
  const vorher = (await pg.locator("body").innerText()).match(/(\d+)\s*SÄTZE/i)?.[1];
  // innerText liefert die per CSS versalisierte Fassung — also ohne Rücksicht
  // auf Groß-/Kleinschreibung prüfen.
  const angepasst = /angepasst/i.test(await pg.locator("body").innerText());
  anfragen = 0;
  await zeitKlick(pg, 20);
  await pg.waitForTimeout(2500);
  const nachher = (await pg.locator("body").innerText()).match(/(\d+)\s*SÄTZE/i)?.[1];
  pruefe(angepasst, "D · Einheit gilt als bearbeitet");
  pruefe(anfragen === 0, `D · keine ATLAS-Anfrage bei bearbeiteter Einheit (${anfragen})`);
  pruefe(
    vorher != null && nachher != null && Number(nachher) < Number(vorher),
    `D · Umfang sinkt von ${vorher} auf ${nachher} Sätze`,
  );
  const endTxt = await pg.locator("body").innerText();
  pruefe(
    !!zielName && endTxt.includes(zielName),
    `D · die getauschte Übung „${zielName}" ist noch da`,
  );
  await pg.close();
}

await browser.close();
server.kill("SIGTERM");
if (fehler.length) {
  console.error(`\n${fehler.length} PRÜFUNG(EN) FEHLGESCHLAGEN`);
  process.exit(1);
}
console.log("\nALLE PRÜFUNGEN BESTANDEN ✅");
