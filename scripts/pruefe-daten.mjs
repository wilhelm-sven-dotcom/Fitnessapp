/**
 * Nachweis „ohne Datenverlust“, am Produktions-Build:
 *
 *   A  Kann das Gerät die Einheit nicht speichern (Speicher voll), sagt die App
 *      das und die Einheit bleibt offen. Der zweite Versuch speichert sie.
 *   B  Eine Einheit von vor mehr als sechs Stunden verschwindet nicht mehr
 *      still: Heute fragt „speichern oder verwerfen“, bis dahin startet keine
 *      neue Einheit. Beides wird geprüft.
 *   C  Die letzte Einheit löschen schreibt eine leere Liste (statt den
 *      Schlüssel zu entfernen) — nur so erfährt die Cloud davon.
 *   D  Der Export enthält keine Zugänge zu Strava und Spotify, aber alles
 *      Übrige; „Ergänzen“ fügt nur Fehlendes hinzu, „Ersetzen“ nimmt den Stand
 *      der Datei, und die Sicherung holt den alten Verlauf zurück.
 *   E  „Alle Daten löschen“ löscht alles; die App startet wie neu.
 *   F  Strava: ist der letzte Abgleich älter als sechs Stunden, holt die App
 *      die Fahrten beim Öffnen selbst; erneuerte Zugänge überschreiben dabei
 *      keine andere Einstellung. Weist Strava die Anmeldung zurück, wird das
 *      vermerkt (die Einstellungen zeigen dann „Neu verbinden“).
 *
 * Aufruf: npm run build && node scripts/pruefe-daten.mjs
 */
import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { chromium } from "playwright";
import { starteServer } from "./lib/testdaten.mjs";

const PORT = 3199;
const exe = process.env.PW_CHROMIUM || "/opt/pw-browsers/chromium";

if (!existsSync(".next/BUILD_ID")) {
  console.error("Kein Build gefunden – zuerst `npm run build`.");
  process.exit(1);
}
const { server, base: BASE } = await starteServer(spawn, PORT);
process.on("exit", () => server.kill("SIGTERM"));

const fehler = [];
const pruefe = (ok, text) => {
  console.log(`${ok ? "OK  " : "FEHL"} ${text}`);
  if (!ok) fehler.push(text);
};

const browser = await chromium.launch({ executablePath: exe });
// Ohne Service Worker: hier geht es um die Daten, nicht um den Cache.
const ctx = await browser.newContext({
  viewport: { width: 390, height: 844 },
  serviceWorkers: "block",
  acceptDownloads: true,
});
await ctx.addInitScript(() => {
  // Nur beim ersten Laden des Fensters: nach „Alle Daten löschen“ soll die
  // App leer starten, nicht wieder mit Testdaten.
  if (sessionStorage.getItem("testdaten")) return;
  sessionStorage.setItem("testdaten", "1");
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
      orteM1: true,
      userName: "Sven",
      // Zugänge, die NICHT in den Export dürfen. `syncedAt` jetzt, damit die
      // App nicht von selbst bei Strava anfragt.
      strava: { accessToken: "geheim-strava", refreshToken: "geheim-strava", expiresAt: 9999999999, syncedAt: Date.now() },
      spotify: { accessToken: "geheim-spotify", refreshToken: "geheim-spotify", expiresAt: 9999999999 },
    }),
  );
  localStorage.setItem("wilhelm-training-jumps", JSON.stringify([{ date: new Date().toISOString(), heightCm: 41 }]));
  localStorage.setItem("wilhelm-training-disabled", JSON.stringify(["burpee"]));
});
const page = await ctx.newPage();
const ls = (key) => page.evaluate((k) => localStorage.getItem(k), key);
const logLaenge = async () => JSON.parse((await ls("wilhelm-training-log")) ?? "[]").length;

/** Startet die heutige Einheit und trägt einen Satz ein. */
async function trainiere(wdh) {
  await page.goto(BASE + "/", { waitUntil: "networkidle" });
  await page.getByText("Los geht", { exact: false }).first().click();
  await page.getByText("Überspringen").first().click();
  await page.getByLabel("Aufwärmen beenden").click();
  await page.getByTestId("stage-order").waitFor({ timeout: 15000 });
  const felder = page.locator(".set-active input");
  if ((await felder.count()) >= 2) {
    await felder.nth(0).fill("20");
    await felder.nth(1).fill(String(wdh));
    await felder.nth(1).press("Enter");
  } else {
    await felder.nth(0).fill(String(wdh));
    await felder.nth(0).press("Enter");
  }
  await page.locator('section[aria-label="Satzpause"]').waitFor({ state: "visible", timeout: 8000 });
}
/** Zum Abschluss gehen und „Beenden & speichern“ tippen. */
async function beende() {
  await page.getByLabel("Training beenden").click();
  await page.getByText("Zum Abschluss").first().click();
  await page.getByText("Wie fühlt sich dein unterer Rücken an?").waitFor({ timeout: 8000 });
  await page.getByText("Gut", { exact: true }).click();
  await page.getByText("Beenden & speichern").click();
}
/** Macht aus der laufenden Einheit eine von vor acht Stunden. */
async function lasseLiegen() {
  await page.goto(BASE + "/", { waitUntil: "networkidle" });
  await page.evaluate(() => {
    const a = JSON.parse(localStorage.getItem("wilhelm-training-active"));
    a.startedAt = new Date(Date.now() - 8 * 3600_000).toISOString();
    localStorage.setItem("wilhelm-training-active", JSON.stringify(a));
  });
  await page.reload({ waitUntil: "networkidle" });
}
const karte = page.getByRole("region", { name: "Offene Einheit" });

try {
  // ── A · Speichern schlägt fehl ─────────────────────────────────────────
  await trainiere(11);
  await page.evaluate(() => {
    const echt = Storage.prototype.setItem;
    window.__echtesSetItem = echt;
    Storage.prototype.setItem = function (k, v) {
      if (k === "wilhelm-training-log") throw new Error("QuotaExceededError");
      return echt.call(this, k, v);
    };
  });
  await beende();
  const meldung = await page
    .getByText("Speichern hat nicht geklappt", { exact: false })
    .first()
    .waitFor({ timeout: 8000 })
    .then(() => true, () => false);
  pruefe(meldung, "A · die App sagt, dass das Speichern nicht geklappt hat");
  pruefe((await ls("wilhelm-training-active")) != null, "A · die Einheit bleibt offen (Live-Stand noch da)");
  pruefe((await logLaenge()) === 0, "A · im Verlauf steht nichts Halbes");
  await page.evaluate(() => {
    Storage.prototype.setItem = window.__echtesSetItem;
  });

  // ── B · Liegengebliebene Einheit ───────────────────────────────────────
  await lasseLiegen();
  await karte.waitFor({ timeout: 8000 });
  pruefe(true, "B · Heute zeigt die offene Einheit von vor acht Stunden");
  pruefe(
    (await page.getByText("Los geht", { exact: false }).count()) === 0 &&
      (await page.getByText("Weiter geht", { exact: false }).count()) === 0,
    "B · solange sie offen ist, startet keine neue Einheit",
  );
  await page.goto(BASE + "/workout", { waitUntil: "networkidle" });
  await page.waitForFunction(() => location.pathname === "/", null, { timeout: 8000 }).catch(() => {});
  pruefe(
    new URL(page.url()).pathname === "/" && (await ls("wilhelm-training-active")) != null,
    "B · auch der direkte Weg ins Training überschreibt sie nicht",
  );
  await karte.getByRole("button", { name: "Verwerfen" }).click();
  await page.getByRole("button", { name: "Verwerfen" }).last().click();
  await karte.waitFor({ state: "detached", timeout: 8000 });
  pruefe((await ls("wilhelm-training-active")) == null && (await logLaenge()) === 0, "B · „Verwerfen“ (mit Rückfrage) räumt sie weg");

  await trainiere(12);
  await lasseLiegen();
  await karte.getByRole("button", { name: "Speichern" }).click();
  await karte.waitFor({ state: "detached", timeout: 8000 });
  const log1 = JSON.parse((await ls("wilhelm-training-log")) ?? "[]");
  const alterH = log1[0] ? (Date.now() - new Date(log1[0].date).getTime()) / 3600_000 : 0;
  pruefe(log1.length === 1 && (await ls("wilhelm-training-active")) == null, "B · „Speichern“ legt sie in den Verlauf");
  pruefe(alterH > 7.9 && alterH < 8.2, `B · mit dem Tag und der Uhrzeit, an dem sie begann (vor ${alterH.toFixed(1)} h)`);
  pruefe(log1[0]?.durationMin == null, "B · ohne erfundene Dauer");

  // ── D · Export und Import (vor dem Löschen, solange eine Einheit da ist) ─
  await page.goto(BASE + "/settings?seg=daten", { waitUntil: "networkidle" });
  const [download] = await Promise.all([
    page.waitForEvent("download", { timeout: 15000 }),
    page.getByRole("button", { name: "Daten exportieren" }).click(),
  ]);
  const exportText = readFileSync(await download.path(), "utf8");
  const exportiert = JSON.parse(exportText);
  pruefe(!exportText.includes("geheim-"), "D · der Export enthält keine Zugänge zu Strava und Spotify");
  pruefe(
    exportiert.log?.length === 1 &&
      exportiert.jumps?.length === 1 &&
      exportiert.disabledExercises?.[0] === "burpee" &&
      Array.isArray(exportiert.chat) &&
      exportiert.settings?.userName === "Sven",
    "D · der Export enthält Verlauf, Sprungtests, abgeschaltete Übungen, Chat und Einstellungen",
  );
  // Eine Datei mit zwei fremden Einheiten und der eigenen in älterer Fassung.
  const fremd = (tage, name) => ({
    ...exportiert.log[0],
    date: new Date(Date.now() - tage * 86400_000).toISOString(),
    dayName: name,
  });
  const datei = {
    ...exportiert,
    log: [fremd(20, "Aus der Datei A"), { ...exportiert.log[0], dayName: "Alte Fassung" }, fremd(10, "Aus der Datei B")],
    settings: { ...exportiert.settings, userName: "Aus der Datei", strava: { accessToken: "alt", refreshToken: "alt", expiresAt: 1 } },
  };
  const spieleEin = async (knopf) => {
    await page.locator('input[type="file"]').setInputFiles({
      name: "backup.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(datei)),
    });
    await page.getByRole("button", { name: knopf, exact: true }).click();
    await page.getByText(knopf === "Ergänzen" ? "Backup ergänzt." : "Backup eingespielt.").first().waitFor({ timeout: 8000 });
  };
  const eigenerName = exportiert.log[0].dayName;
  await spieleEin("Ergänzen");
  const nachErg = JSON.parse(await ls("wilhelm-training-log"));
  const settingsErg = JSON.parse(await ls("wilhelm-training-settings"));
  pruefe(
    nachErg.length === 3 && nachErg.map((s) => s.dayName).join("|") === `Aus der Datei A|Aus der Datei B|${eigenerName}`,
    "D · „Ergänzen“ fügt Fehlendes hinzu, lässt die eigene Einheit unverändert und sortiert nach Datum",
  );
  pruefe(settingsErg.userName === "Sven" && settingsErg.strava?.accessToken === "geheim-strava", "D · „Ergänzen“ lässt die Einstellungen in Ruhe");
  await spieleEin("Ersetzen");
  const nachErs = JSON.parse(await ls("wilhelm-training-log"));
  const settingsErs = JSON.parse(await ls("wilhelm-training-settings"));
  pruefe(
    nachErs.length === 3 && nachErs[2].dayName === "Alte Fassung",
    "D · „Ersetzen“ nimmt den Stand der Datei",
  );
  pruefe(
    settingsErs.userName === "Aus der Datei" && settingsErs.strava?.accessToken === "geheim-strava",
    "D · dabei bleiben die Zugänge des Geräts (nicht die aus der Datei)",
  );
  await page.getByRole("button", { name: "Sicherung zurückholen" }).click();
  await page.getByRole("button", { name: "Zurückholen", exact: true }).click();
  await page.getByText("Verlauf zurückgeholt.").first().waitFor({ timeout: 8000 });
  const zurueck = JSON.parse(await ls("wilhelm-training-log"));
  pruefe(
    zurueck.length === 3 && zurueck[2].dayName === eigenerName,
    "D · die Sicherung holt den Verlauf von vor dem Ersetzen zurück",
  );

  // ── C · Letzte Einheit löschen ─────────────────────────────────────────
  await page.goto(BASE + "/fortschritt", { waitUntil: "networkidle" });
  await page.getByText("Verlauf", { exact: true }).first().click();
  for (let i = 0; i < 3; i++) {
    await page.locator('button[aria-expanded="false"]').first().click();
    await page.getByRole("button", { name: "Einheit löschen" }).click();
    await page.getByRole("button", { name: "Ja, löschen" }).click();
    await page.waitForFunction((n) => JSON.parse(localStorage.getItem("wilhelm-training-log") ?? "null")?.length === n, 2 - i, { timeout: 8000 });
  }
  pruefe((await ls("wilhelm-training-log")) === "[]", "C · nach dem Löschen der letzten Einheit steht eine leere Liste im Speicher");

  // ── E · Alle Daten löschen ─────────────────────────────────────────────
  await page.goto(BASE + "/settings?seg=daten", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Alle Daten löschen" }).click();
  await page.getByRole("button", { name: "Unwiderruflich löschen" }).click();
  await page.getByText("Dein Name").first().waitFor({ timeout: 15000 });
  const rest = await page.evaluate(() => {
    const out = {};
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      out[k] = localStorage.getItem(k);
    }
    return out;
  });
  const settingsNeu = JSON.parse(rest["wilhelm-training-settings"] ?? "{}");
  pruefe(new URL(page.url()).pathname === "/", "E · nach „Alle Daten löschen“ startet die App neu mit der Begrüßung");
  pruefe(
    !("wilhelm-training-log" in rest) &&
      !("wilhelm-training-jumps" in rest) &&
      !("wilhelm-training-disabled" in rest) &&
      !("wilhelm-training-log-sicherung" in rest) &&
      !JSON.stringify(rest).includes("geheim-") &&
      settingsNeu.onboarded !== true &&
      settingsNeu.userName == null,
    `E · nichts Altes bleibt zurück (${Object.keys(rest).join(", ") || "leer"})`,
  );

  // ── F · Strava gleicht selbst ab ───────────────────────────────────────
  const stravaLauf = async (antwort) => {
    const c = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: "block" });
    await c.addInitScript(() => {
      if (localStorage.getItem("wilhelm-training-settings")) return;
      localStorage.setItem(
        "wilhelm-training-settings",
        JSON.stringify({
          timeBudgetMin: 25, theme: "light", onboarded: true, benchMigrated: true, themeMigratedM72: true,
          splash: "aus", orteM1: true,
          strava: { accessToken: "a1", refreshToken: "r1", expiresAt: 1, athleteName: "Sven W.", syncedAt: Date.now() - 7 * 3600_000 },
        }),
      );
    });
    const p = await c.newPage();
    let anfragen = 0;
    await p.route("**/api/strava", async (route) => {
      anfragen++;
      // Während die Antwort unterwegs ist, stellt der Nutzer die Zeit um.
      // Früher schrieb Strava danach den Stand von VOR der Änderung zurück.
      if (anfragen === 1) await p.getByLabel("Zeitbudget 45 Minuten").click({ timeout: 15000 });
      await route.fulfill({ contentType: "application/json", body: JSON.stringify(antwort) });
    });
    await p.goto(BASE + "/", { waitUntil: "networkidle" });
    await p.waitForTimeout(800);
    const st = JSON.parse(await p.evaluate(() => localStorage.getItem("wilhelm-training-settings")));
    await p.reload({ waitUntil: "networkidle" });
    await p.waitForTimeout(500);
    const nachNeuladen = anfragen;
    await c.close();
    return { anfragen, nachNeuladen, strava: st.strava, st };
  };
  const gut = await stravaLauf({ ok: true, rides: [], tokens: { accessToken: "a2", refreshToken: "r2", expiresAt: 2 } });
  pruefe(gut.anfragen === 1, `F · beim Öffnen fragt die App Strava einmal selbst (${gut.anfragen})`);
  pruefe(
    gut.strava?.accessToken === "a2" && gut.strava?.athleteName === "Sven W." && Date.now() - gut.strava?.syncedAt < 60000,
    "F · erneuerte Zugänge sind gespeichert, der Name bleibt, der Zeitpunkt steht",
  );
  pruefe(
    gut.st.timeBudgetMin === 45 && gut.st.onboarded === true,
    `F · eine Einstellung, die währenddessen geändert wurde, bleibt (Zeit ${gut.st.timeBudgetMin} Min)`,
  );
  pruefe(gut.nachNeuladen === 1, "F · frisch abgeglichen fragt sie beim nächsten Öffnen nicht noch einmal");
  const abgelaufen = await stravaLauf({ ok: false, reauth: true, error: "Strava-Sitzung abgelaufen (401)." });
  pruefe(abgelaufen.strava?.reauth === true, "F · weist Strava die Anmeldung zurück, ist das vermerkt");
  pruefe(abgelaufen.nachNeuladen === 1, "F · und die App fragt nicht bei jedem Öffnen wieder");
} catch (e) {
  pruefe(false, `Ablauf abgebrochen: ${String(e).split("\n")[0]}`);
} finally {
  await browser.close();
  server.kill("SIGTERM");
}

if (fehler.length) {
  console.error(`\n${fehler.length} Prüfung(en) fehlgeschlagen.`);
  process.exit(1);
}
console.log("\nDaten-Prüfung bestanden.");
process.exit(0);
