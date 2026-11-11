/**
 * Tempo-Prüfung mit langem Verlauf.
 *
 * Mit wenigen Einheiten fühlt sich alles schnell an; langsam wird es erst,
 * wenn Rechenwege mit dem Verlauf wachsen. Darum misst dieses Skript mit 150
 * Einheiten (rund ein Jahr bei drei pro Woche), was der Browser an Rechenzeit
 * braucht — und bricht ab, wenn eine Grenze reißt:
 *
 *   Heute laden · Verlauf öffnen · Satz eintragen · vier Zeichen tippen ·
 *   drei Sekunden laufende Satzpause
 *
 * Gemessen wird die Skript-Zeit des Browsers (CDP `Performance.getMetrics`,
 * `ScriptDuration`), nicht die Wanduhr: die hängt an Wartezeiten des Skripts.
 * Die Grenzen haben reichlich Luft für langsamere Rechner; sie sollen
 * Rückfälle um Größenordnungen fangen (der Verlauf lag einmal bei 18 s).
 *
 *   npm run build && node scripts/tempo.mjs [--json] [--einheiten=150]
 */
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { chromium } from "playwright";
import { BODY, SETTINGS, starteServer } from "./lib/testdaten.mjs";

const PORT = 3199;
const args = process.argv.slice(2);
const JSON_AUS = args.includes("--json");
const N = Number((args.find((a) => a.startsWith("--einheiten=")) ?? "").split("=")[1]) || 150;

/** Grenzen in Millisekunden Skript-Zeit. */
const GRENZE = {
  heute: 900,
  verlauf: 1500,
  satz: 200,
  tippen: 80,
  pause: 80,
};

const exe =
  process.env.PW_CHROMIUM ??
  (existsSync("/opt/pw-browsers/chromium") ? "/opt/pw-browsers/chromium" : undefined);

const UEBUNGEN = [
  ["goblet", "Goblet Squat"],
  ["bench_db", "Kurzhantel-Bankdrücken"],
  ["glutebridge", "Glute Bridge mit Gewicht"],
  ["lat_pulldown", "Latzug am Kabel"],
  ["leg_press", "Beinpresse"],
  ["rdl_db", "Rumänisches Kreuzheben (KH)"],
  ["row_machine", "Rudermaschine"],
  ["pec_deck", "Butterfly (Maschine)"],
  ["shoulder_press_machine", "Schulterpresse (Maschine)"],
  ["cable_curl", "Bizeps am Kabel"],
  ["pushdown", "Trizepsdrücken am Kabel"],
  ["calf_seated", "Wadenheben sitzend (Maschine)"],
];

/** n Einheiten à 6 Übungen à 3 Sätze, alle 2,4 Tage, die letzte vor 2 Tagen. */
function verlauf(n) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const date = new Date(Date.now() - (n - i) * 2.4 * 86400000 - 2 * 86400000).toISOString();
    const exercises = [];
    for (let k = 0; k < 6; k++) {
      const [id, name] = UEBUNGEN[(i * 5 + k) % UEBUNGEN.length];
      const w = 20 + Math.floor(i / 6) * 2.5 + k * 5;
      exercises.push({
        id,
        name,
        unit: "Wdh",
        sets: [0, 1, 2].map((s) => ({ weight: String(w), reps: String(12 - s), rir: s === 2 ? 1 : 2 })),
      });
    }
    out.push({ date, dayKey: "today", dayName: "Ganzkörper", focus: "", ort: i % 2 ? "Studio" : "Zuhause", exercises });
  }
  return out;
}

const { server, base: BASE } = await starteServer(spawn, PORT);
const browser = await chromium.launch(exe ? { executablePath: exe } : {});
const werte = {};
let fehler = null;

try {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  await ctx.addInitScript(
    ([settings, log, body]) => {
      if (!localStorage.getItem("wilhelm-training-settings")) {
        localStorage.setItem("wilhelm-training-settings", JSON.stringify(settings));
        localStorage.setItem("wilhelm-training-log", JSON.stringify(log));
        localStorage.setItem("wilhelm-training-body", JSON.stringify(body));
      }
    },
    [SETTINGS("light"), verlauf(N), BODY],
  );
  const pg = await ctx.newPage();
  const cdp = await ctx.newCDPSession(pg);
  await cdp.send("Performance.enable");
  const skript = async () => {
    const m = (await cdp.send("Performance.getMetrics")).metrics;
    return (m.find((x) => x.name === "ScriptDuration")?.value ?? 0) * 1000;
  };
  /** Skript-Zeit (ms), die `fn` im Browser kostet. */
  const messe = async (fn) => {
    const a = await skript();
    await fn();
    return Math.round((await skript()) - a);
  };

  werte.heute = await messe(async () => {
    await pg.goto(BASE + "/", { waitUntil: "networkidle" });
    if (await pg.getByText("Wo trainierst du heute?").count())
      await pg.getByRole("button", { name: /^Studio/ }).first().click();
    await pg.getByTestId("start").waitFor({ timeout: 30000 });
    await pg.waitForTimeout(800);
  });

  await pg.goto(BASE + "/fortschritt", { waitUntil: "networkidle" });
  await pg.waitForTimeout(600);
  werte.verlauf = await messe(async () => {
    await pg.getByText("Verlauf", { exact: true }).first().click();
    await pg.getByText(new RegExp(`Einheit ${N}\\b`)).first().waitFor({ timeout: 60000 });
    await pg.waitForTimeout(500);
  });

  await pg.goto(BASE + "/", { waitUntil: "networkidle" });
  await pg.getByTestId("start").click();
  await pg.waitForURL("**/workout", { timeout: 30000 });
  await pg.getByText("Überspringen").first().click();
  await pg.getByLabel("Aufwärmen beenden").click();
  await pg.getByTestId("stage-order").waitFor({ timeout: 30000 });
  await pg.waitForTimeout(800);
  const felder = pg.locator(".set-active input");

  werte.tippen = await messe(async () => {
    await felder.nth(0).fill("");
    await felder.nth(0).pressSequentially("22.5", { delay: 60 });
    await pg.waitForTimeout(500);
  });

  await felder.nth(1).fill("9");
  await pg.waitForTimeout(500);
  werte.satz = await messe(async () => {
    await felder.nth(1).press("Enter");
    await pg.getByText("Pause beenden").first().waitFor({ timeout: 30000 });
    await pg.waitForTimeout(400);
  });

  werte.pause = await messe(async () => {
    await pg.waitForTimeout(3000);
  });
  await ctx.close();
} catch (e) {
  fehler = e instanceof Error ? e.message : String(e);
} finally {
  await browser.close();
  server.kill("SIGTERM");
}

const NAMEN = {
  heute: "Heute laden",
  verlauf: "Fortschritt → Verlauf öffnen",
  satz: "Satz eintragen",
  tippen: "Vier Zeichen ins Gewichtsfeld",
  pause: "Drei Sekunden laufende Pause",
};

if (JSON_AUS) {
  console.log(JSON.stringify({ einheiten: N, werte, grenzen: GRENZE, fehler }));
} else {
  console.log(`\nTempo mit ${N} Einheiten (Skript-Zeit im Browser):`);
  for (const k of Object.keys(NAMEN)) {
    const v = werte[k];
    const ok = v != null && v <= GRENZE[k];
    console.log(`${ok ? "OK  " : "FEHL"} ${NAMEN[k].padEnd(32)} ${v == null ? "–" : `${v} ms`.padStart(8)}   (Grenze ${GRENZE[k]} ms)`);
  }
}

const gerissen = Object.keys(NAMEN).filter((k) => werte[k] == null || werte[k] > GRENZE[k]);
if (fehler) {
  console.error(`\nFEHLGESCHLAGEN: ${fehler.slice(0, 400)}`);
  process.exit(1);
}
if (gerissen.length) {
  console.error(`\nFEHLGESCHLAGEN: zu langsam: ${gerissen.map((k) => NAMEN[k]).join(", ")}`);
  process.exit(1);
}
if (!JSON_AUS) console.log("\nTEMPO IM RAHMEN ✅");
