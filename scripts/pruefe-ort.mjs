/**
 * Nachweis für die Ortswahl (Zuhause / Studio) — was man nur am laufenden
 * System sehen kann:
 *
 *   A  Zwei Orte → Heute fragt „Wo trainierst du heute?“, und VOR der Wahl
 *      geht keine Anfrage an ATLAS (keine Opus-Runde für den falschen Ort).
 *   B  Studio gewählt → genau eine Anfrage; sie nennt den Ort mit seinen
 *      Einzelgeräten und „nur an Geräten“ und bietet NUR Maschinen- und
 *      Kabel-Übungen an (keine Hanteln, kein Körpergewicht).
 *   C  Umschalten auf Zuhause → neu komponiert: weder Anfrage noch Liste
 *      enthalten Maschinen- oder Kabel-Übungen.
 *   D  Reload → keine Frage mehr, der gewählte Ort bleibt.
 *   E  Bearbeitete Einheit + Umschalten → Hinweis statt stiller
 *      Neukomposition (0 Anfragen); der Knopf stellt dann für den Ort neu
 *      zusammen.
 *   F  Im Studio „Kraftgeräte“ (Sammelknopf) abwählen → Heute stellt die
 *      unberührte Einheit ohne Maschinen neu zusammen.
 *
 * Läuft gegen den Produktions-Build auf Port 3199 (wie scripts/smoke.mjs).
 * Aufruf: npm run build && npm run pruefe:ort
 */
import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { chromium } from "playwright";

const PORT = 3199;
const BASE = `http://127.0.0.1:${PORT}`;
const exe = process.env.PW_CHROMIUM || "/opt/pw-browsers/chromium";

const server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "-p", String(PORT)], {
  stdio: "ignore",
  env: { ...process.env, PORT: String(PORT), ANTHROPIC_API_KEY: "" },
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

const fehler = [];
const pruefe = (ok, text) => {
  console.log(`${ok ? "OK  " : "FEHL"} ${text}`);
  if (!ok) fehler.push(text);
};

// Maschinen- und Kabel-Übungen direkt aus dem Katalog (eine Quelle).
const katalog = readFileSync(new URL("../lib/exercises.ts", import.meta.url), "utf8");
// Maschinen sind die Einzelgeräte `m_*` (vorher ein Sammel-Key `machine`).
const idsMit = (passt) =>
  new Set(
    [...katalog.matchAll(/id: "([a-z0-9_]+)"[^\n]*?req: \[([^\]]*)\]/g)]
      .filter((m) => passt(m[2]))
      .map((m) => m[1]),
  );
const MASCHINE = idsMit((req) => /"m_[a-z]+"/.test(req));
const KABEL = idsMit((req) => req.includes('"cable"'));
pruefe(MASCHINE.size >= 5 && KABEL.size >= 5, `Katalog gelesen (${MASCHINE.size} Maschine, ${KABEL.size} Kabel)`);

const browser = await chromium.launch({ executablePath: exe });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
// Seed nur, wenn noch nichts da ist — ein Reload soll den gewählten Ort
// behalten (der Seed würde activeGymId sonst jedes Mal verwerfen).
await ctx.addInitScript(() => {
  if (!localStorage.getItem("wilhelm-training-settings"))
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

/** Jede ATLAS-Anfrage wird mitgeschrieben und mit „nichts“ beantwortet —
 *  der Basisplan bleibt stehen, die Anfrage selbst ist das Prüfobjekt. */
const anfragen = [];
await ctx.route("**/api/atlas/session", async (route) => {
  anfragen.push(route.request().postDataJSON());
  await route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ ok: false }),
  });
});

const pg = await ctx.newPage();
const listenIds = () =>
  pg.locator("[data-exercise-id]").evaluateAll((els) => els.map((e) => e.getAttribute("data-exercise-id")));
const ohne = (ids, ...sets) => ids.filter((id) => sets.some((s) => s.has(id)));
const ortKnopf = (name) => pg.getByRole("button", { name, exact: true });

try {
  // ── A · Frage vor der Einheit, keine Anfrage vor der Wahl ─────────────
  await pg.goto(BASE + "/", { waitUntil: "networkidle" });
  await pg.getByText("Wo trainierst du heute?").first().waitFor({ timeout: 15000 });
  await pg.waitForTimeout(1500);
  pruefe(anfragen.length === 0, `A · keine ATLAS-Anfrage vor der Wahl (${anfragen.length})`);
  const startSichtbar = await pg.getByText("Los geht").first().isVisible().catch(() => false);
  pruefe(!startSichtbar, "A · noch kein „Los geht’s“");
  pruefe(
    (await pg.getByRole("button", { name: /^Zuhause/ }).count()) > 0 &&
      (await pg.getByRole("button", { name: /^Studio/ }).count()) > 0,
    "A · Kacheln Zuhause und Studio stehen",
  );

  // ── B · Studio → eine Anfrage mit Ort und Maschinen ───────────────────
  await pg.getByRole("button", { name: /^Studio/ }).first().click();
  await pg.getByText("Los geht").first().waitFor({ timeout: 8000 });
  await pg.waitForTimeout(1000);
  pruefe(anfragen.length === 1, `B · genau eine Anfrage nach der Wahl (${anfragen.length})`);
  const b = anfragen[anfragen.length - 1] ?? {};
  pruefe(b.ort?.name === "Studio", `B · Anfrage nennt den Ort („${b.ort?.name}“)`);
  pruefe(
    Array.isArray(b.ort?.geraete) && b.ort.geraete.includes("Beinpresse"),
    "B · Geräte-Liste nennt die Einzelgeräte (Beinpresse)",
  );
  pruefe(b.ort?.nurGeraete === true, "B · Anfrage sagt „nur an Geräten“");
  pruefe(
    (b.availableIds ?? []).some((id) => MASCHINE.has(id)),
    "B · Maschinen-Übungen sind im Studio wählbar",
  );
  const frei = (b.availableIds ?? []).filter((id) => !MASCHINE.has(id) && !KABEL.has(id));
  pruefe(
    (b.availableIds ?? []).length > 0 && frei.length === 0,
    `B · Studio nur an Geräten: keine freien Übungen (${frei.slice(0, 4).join(", ") || "keine"})`,
  );

  // ── C · Umschalten auf Zuhause → ohne Maschinen und Kabel ─────────────
  await ortKnopf("Zuhause").click();
  await pg.waitForTimeout(1500);
  pruefe(anfragen.length === 2, `C · Umschalten komponiert neu (${anfragen.length} Anfragen)`);
  const c = anfragen[anfragen.length - 1] ?? {};
  pruefe(c.ort?.name === "Zuhause", `C · Anfrage nennt Zuhause („${c.ort?.name}“)`);
  pruefe(
    ohne(c.availableIds ?? [], MASCHINE, KABEL).length === 0,
    "C · keine Maschinen-/Kabel-Ids in der Anfrage",
  );
  const zuhauseIds = await listenIds();
  pruefe(zuhauseIds.length >= 3, `C · Einheit steht (${zuhauseIds.length} Übungen)`);
  pruefe(
    ohne(zuhauseIds, MASCHINE, KABEL).length === 0,
    `C · Liste ohne Maschinen/Kabel (${ohne(zuhauseIds, MASCHINE, KABEL).join(", ") || "keine"})`,
  );

  // ── D · Reload → keine Frage, Ort bleibt ──────────────────────────────
  await pg.reload({ waitUntil: "networkidle" });
  await pg.getByText("Los geht").first().waitFor({ timeout: 8000 });
  const frageNachReload = await pg.getByText("Wo trainierst du heute?").count();
  pruefe(frageNachReload === 0, "D · nach Reload keine Ortsfrage");
  pruefe(
    (await ortKnopf("Zuhause").getAttribute("aria-pressed")) === "true",
    "D · Zuhause bleibt gewählt",
  );

  // ── E · Bearbeitet + Umschalten → Hinweis, keine stille Neukomposition ─
  await pg.getByText("Bearbeiten", { exact: false }).first().click();
  await pg.getByText("Einheit bearbeiten").waitFor({ timeout: 8000 });
  await pg.getByLabel(/tauschen$/).first().click();
  const picker = pg.locator("div.fixed").filter({ hasText: "Übung wählen" }).last();
  await picker.waitFor({ timeout: 8000 });
  await picker.getByTestId("picker-row-name").nth(1).click();
  await pg.waitForTimeout(600);
  await pg.keyboard.press("Escape");
  await pg.waitForTimeout(600);
  const vorE = anfragen.length;
  await ortKnopf("Studio").click();
  await pg.waitForTimeout(1500);
  pruefe(anfragen.length === vorE, `E · keine Anfrage für die bearbeitete Einheit (${anfragen.length - vorE})`);
  const hinweis = await pg.getByText("Diese Einheit ist für Zuhause geplant", { exact: false }).count();
  pruefe(hinweis > 0, "E · Hinweis „für Zuhause geplant“ steht");
  await pg.getByText("Für Studio neu zusammenstellen", { exact: false }).first().click();
  await pg.waitForTimeout(1500);
  pruefe(anfragen.length === vorE + 1, `E · Knopf stellt neu zusammen (${anfragen.length - vorE} Anfrage)`);
  pruefe(
    (await pg.getByText("Diese Einheit ist für Zuhause geplant", { exact: false }).count()) === 0,
    "E · Hinweis ist danach weg",
  );

  // ── F · Geräte im Studio ändern → Heute komponiert ohne Maschinen ─────
  await pg.goto(BASE + "/settings", { waitUntil: "networkidle" });
  await pg.getByText("Orte & Geräte").first().waitFor({ timeout: 8000 });
  const kraft = pg.getByRole("button", { name: "Kraftgeräte" });
  pruefe((await kraft.getAttribute("aria-pressed")) === "true", "F · Studio hat Kraftgeräte");
  await kraft.click();
  await pg.waitForTimeout(400);
  pruefe((await kraft.getAttribute("aria-pressed")) === "false", "F · Kraftgeräte abgewählt");
  const vorF = anfragen.length;
  await pg.goto(BASE + "/", { waitUntil: "networkidle" });
  await pg.getByText("Los geht").first().waitFor({ timeout: 8000 });
  await pg.waitForTimeout(1500);
  pruefe(anfragen.length === vorF + 1, `F · Heute stellt neu zusammen (${anfragen.length - vorF} Anfrage)`);
  const f = anfragen[anfragen.length - 1] ?? {};
  pruefe(
    ohne(f.availableIds ?? [], MASCHINE).length === 0,
    "F · keine Maschinen-Ids mehr in der Anfrage",
  );
  pruefe(ohne(await listenIds(), MASCHINE).length === 0, "F · Liste ohne Maschinen");
} catch (e) {
  pruefe(false, `Ablauf abgebrochen: ${e instanceof Error ? e.message : String(e)}`);
}

await browser.close();
server.kill("SIGTERM");
if (fehler.length) {
  console.error(`\n${fehler.length} PRÜFUNG(EN) FEHLGESCHLAGEN`);
  process.exit(1);
}
console.log("\nALLE PRÜFUNGEN BESTANDEN ✅");
