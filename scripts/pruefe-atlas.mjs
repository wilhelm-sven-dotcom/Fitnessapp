/**
 * Nachweis für ATLAS, am Produktions-Build und OHNE echten Schlüssel: Vor der
 * App steht ein nachgebauter Anthropic-Server. Er spricht das Strom-Protokoll
 * der Messages-Schnittstelle, merkt sich jede Anfrage und antwortet nach
 * Drehbuch. So wird der echte Weg geprüft — Browser → Route → SDK → HTTP —,
 * nur die Antworten des Modells sind gestellt.
 *
 *   A  Zugangsschutz: ohne Code nimmt der Server nichts an und fragt Claude
 *      gar nicht erst; mit dem Code aus den Einstellungen läuft alles.
 *   B  Plan: geht an Fable 5.2 mit strukturierter Ausgabe, ohne erzwungenen
 *      Tool-Aufruf, mit Datum, Zeitmodell und Lage; die Einheit kommt an.
 *   C  Satz-Reaktion: geht an Sonnet 5.5 mit wenig Nachdenken; der Satz steht
 *      im Transkript, die Ansage erscheint.
 *   D  Chat: Text kommt als Strom; lehnt das Modell ab, steht KEIN Fehlersatz
 *      im Verlauf, die Frage bleibt, „Erneut senden“ holt die Antwort.
 *   E  Wochen-Rückblick bleibt nach dem Neuladen stehen.
 *   F  Selbsttest: nimmt Fable die Anfrage nicht an, antwortet der Ersatz, und
 *      die Einstellungen sagen das.
 *
 * Was das NICHT zeigt: ob Anthropic diese Anfragen so annimmt. Das prüft
 * „ATLAS testen“ in den Einstellungen gegen die echte Schnittstelle.
 *
 * Aufruf: npm run build && node scripts/pruefe-atlas.mjs
 */
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import http from "node:http";
import { chromium } from "playwright";
import { starteServer } from "./lib/testdaten.mjs";

const PORT = 3199;
const KI_PORT = 3197;
const CODE = "hantel-42";
const exe = process.env.PW_CHROMIUM || "/opt/pw-browsers/chromium";

const fehler = [];
const pruefe = (ok, text) => {
  console.log(`${ok ? "OK  " : "FEHL"} ${text}`);
  if (!ok) fehler.push(text);
};

// ── Nachgebauter Anthropic-Server ────────────────────────────────────────
/** Alle Anfragen, die bei „Claude“ ankamen. */
const anfragen = [];
/** Drehbuch: was als Nächstes passieren soll. */
const lage = { fableNimmtNichtAn: false, chatLehntAb: false };

const sse = (res, typ, daten) => res.write(`event: ${typ}\ndata: ${JSON.stringify({ type: typ, ...daten })}\n\n`);
async function antworte(res, model, stuecke, ende = "end_turn") {
  res.writeHead(200, { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" });
  sse(res, "message_start", {
    message: {
      id: "msg_test", type: "message", role: "assistant", model, content: [],
      stop_reason: null, stop_sequence: null, usage: { input_tokens: 100, output_tokens: 1 },
    },
  });
  if (stuecke.length) {
    sse(res, "content_block_start", { index: 0, content_block: { type: "text", text: "" } });
    for (const t of stuecke) {
      sse(res, "content_block_delta", { index: 0, delta: { type: "text_delta", text: t } });
      await new Promise((r) => setTimeout(r, 40));
    }
    sse(res, "content_block_stop", { index: 0 });
  }
  sse(res, "message_delta", {
    delta: {
      stop_reason: ende, stop_sequence: null,
      ...(ende === "refusal" ? { stop_details: { type: "refusal", category: "general_harms", explanation: "Test" } } : {}),
    },
    usage: { output_tokens: 20 },
  });
  sse(res, "message_stop", {});
  res.end();
}

const ki = http.createServer((req, res) => {
  if (req.method !== "POST" || !req.url.startsWith("/v1/messages")) {
    res.writeHead(404).end();
    return;
  }
  const teile = [];
  req.on("data", (c) => teile.push(c));
  req.on("end", () => {
    const body = JSON.parse(Buffer.concat(teile).toString("utf8"));
    const system = (body.system ?? []).map((b) => b.text).join("\n\n");
    const frage = body.messages?.at(-1)?.content ?? "";
    anfragen.push({ body, system, frage, beta: req.headers["anthropic-beta"] ?? "" });

    if (lage.fableNimmtNichtAn && body.model === "claude-fable-5-2") {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({
        type: "error",
        error: { type: "invalid_request_error", message: "Dieses Modell verlangt 30 Tage Datenaufbewahrung." },
      }));
      return;
    }
    const schema = body.output_config?.format?.schema;
    if (schema?.properties?.bereit) return void antworte(res, body.model, ['{"bereit":true}']);
    if (schema?.properties?.items) {
      const ids = (system.match(/Heute verfügbar[^\n]*\n([^\n]+)/)?.[1] ?? "").split(", ").slice(0, 4);
      const plan = {
        name: "Ganzkörper · Probe",
        focus: "Probe",
        briefing: "Vier Übungen, weil der Test es so will.",
        items: ids.map((id) => ({ exerciseId: id, sets: 3, repLow: 8, repHigh: 12, why: "Rückstand diese Woche.", intro: "Sauber anfangen." })),
      };
      const text = JSON.stringify(plan);
      return void antworte(res, body.model, [text.slice(0, 60), text.slice(60)]);
    }
    if (schema?.properties?.say)
      return void antworte(res, body.model, ['{"say":"Sauber gezogen. Der nächste Satz bleibt gleich schwer.","adjustment":null}']);
    if (/Wochen-Rückblick/.test(system))
      return void antworte(res, body.model, ["Die Woche war ruhig. ", "Nächste Woche zählt der Rücken."]);
    if (lage.chatLehntAb) return void antworte(res, body.model, ["Halber Satz, der "], "refusal");
    return void antworte(res, body.model, ["Beobachtung: Du bist dran geblieben.\n", "Plan: Morgen Zug."]);
  });
});

if (!existsSync(".next/BUILD_ID")) {
  console.error("Kein Build gefunden – zuerst `npm run build`.");
  process.exit(1);
}
await new Promise((ok, nein) => {
  ki.once("error", nein);
  ki.listen(KI_PORT, "127.0.0.1", ok);
});
const { server, base: BASE } = await starteServer(spawn, PORT, {
  ANTHROPIC_API_KEY: "sk-ant-test-nur-lokal",
  ANTHROPIC_BASE_URL: `http://127.0.0.1:${KI_PORT}`,
  ATLAS_ZUGANGSCODE: CODE,
});
const aufraeumen = () => {
  server.kill("SIGTERM");
  ki.close();
};
process.on("exit", aufraeumen);

const browser = await chromium.launch({ executablePath: exe });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: "block" });
await ctx.addInitScript(() => {
  if (localStorage.getItem("wilhelm-training-settings")) return;
  localStorage.setItem(
    "wilhelm-training-settings",
    JSON.stringify({
      timeBudgetMin: 25, autoregOn: true, theme: "light", onboarded: true, benchMigrated: true,
      themeMigratedM72: true, splash: "aus", orteM1: true, userName: "Sven",
    }),
  );
});
const page = await ctx.newPage();
const quelle = () => page.getByText(/^Plan: /).first();
const letzte = (filter) => anfragen.filter(filter).at(-1);

try {
  // ── A · Zugangsschutz ──────────────────────────────────────────────────
  await page.goto(BASE + "/", { waitUntil: "networkidle" });
  await page.getByText("ATLAS braucht den Zugangscode", { exact: false }).first().waitFor({ timeout: 15000 });
  pruefe(true, "A · ohne Code bleibt der Basisplan, und Heute sagt warum");
  pruefe(anfragen.length === 0, `A · ohne Code geht keine Anfrage an Claude (${anfragen.length})`);

  await page.goto(BASE + "/settings", { waitUntil: "networkidle" });
  await page.getByLabel("Zugangscode").fill("falsch");
  await page.getByRole("button", { name: "Speichern" }).click();
  await page.getByText("Der Code stimmt nicht.").waitFor({ timeout: 8000 });
  await page.getByLabel("Zugangscode").fill(CODE);
  await page.getByRole("button", { name: "Speichern" }).click();
  await page.getByText("Der Code stimmt.", { exact: true }).waitFor({ timeout: 8000 });
  pruefe(true, "A · die Einstellungen prüfen den Code: falsch wird abgewiesen, richtig angenommen");
  const modelle = await page.getByText(/Plan, Chat, Auswertung: /).innerText();
  pruefe(
    /claude-fable-5-2/.test(modelle) && /claude-sonnet-5-5/.test(modelle) && /claude-opus-5-5/.test(modelle),
    "A · die Einstellungen zeigen die drei Modelle",
  );

  // ── B · Plan ───────────────────────────────────────────────────────────
  // Der Basisplan von eben gilt für heute weiter; „Neu ansetzen“ fragt ATLAS.
  await page.goto(BASE + "/", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Neu ansetzen" }).click();
  await page.getByText("Plan: von ATLAS zusammengestellt").first().waitFor({ timeout: 20000 });
  pruefe(/Probe/.test(await page.locator("body").innerText()), "B · die Einheit von ATLAS steht auf Heute");
  const plan = letzte((a) => a.body.output_config?.format?.schema?.properties?.items);
  pruefe(plan?.body.model === "claude-fable-5-2", `B · der Plan geht an Fable 5.2 (${plan?.body.model})`);
  pruefe(
    plan && !("tool_choice" in plan.body) && !("tools" in plan.body) && !("thinking" in plan.body) && !("temperature" in plan.body),
    "B · ohne erzwungenen Tool-Aufruf, ohne thinking, ohne Temperatur",
  );
  pruefe(
    plan?.body.output_config?.effort === "medium" && plan.body.output_config.format.type === "json_schema",
    "B · strukturierte Ausgabe mit mittlerem Nachdenken",
  );
  pruefe(
    plan?.body.fallbacks === "default" && /server-side-fallback-2026-07-01/.test(plan.beta),
    "B · eine Ablehnung ginge serverseitig an ein anderes Modell",
  );
  pruefe(
    /Heute ist \p{L}+, der \d+\. \p{L}+ \d{4}\./u.test(plan?.system ?? "") &&
      /Zeitfenster: 25 Minuten/.test(plan.system) &&
      /2:30 bei Grundübungen/.test(plan.system) &&
      /Trainingsblock: Woche/.test(plan.system),
    "B · im Prompt stehen Datum, Zeitfenster, das echte Zeitmodell und die Lage im Block",
  );
  pruefe(
    plan?.body.system?.[0]?.cache_control?.type === "ephemeral" && !/Heute ist/.test(plan.body.system[0].text),
    "B · der feste Teil trägt den Cache-Marker und enthält nichts Veränderliches",
  );

  // ── C · Satz-Reaktion ──────────────────────────────────────────────────
  await page.getByText("Los geht", { exact: false }).first().click();
  await page.getByText("Überspringen").first().click();
  await page.getByLabel("Aufwärmen beenden").click();
  await page.getByTestId("stage-order").waitFor({ timeout: 15000 });
  const felder = page.locator(".set-active input");
  if ((await felder.count()) >= 2) {
    await felder.nth(0).fill("20");
    await felder.nth(1).fill("40");
    await felder.nth(1).press("Enter");
  } else {
    await felder.nth(0).fill("40");
    await felder.nth(0).press("Enter");
  }
  await page.getByText("Sauber gezogen.", { exact: false }).first().waitFor({ timeout: 15000 });
  pruefe(true, "C · die Ansage von ATLAS erscheint in der Pause");
  const satz = letzte((a) => a.body.output_config?.format?.schema?.properties?.say);
  pruefe(
    satz?.body.model === "claude-sonnet-5-5" && satz.body.output_config.effort === "low" && !("tool_choice" in satz.body),
    `C · die Reaktion geht an Sonnet 5.5 mit wenig Nachdenken (${satz?.body.model})`,
  );
  pruefe(/AKTUELL: Eben Satz 1\/\d+ von .* 40 Wdh/.test(satz?.frage ?? ""), "C · der eben beendete Satz steht im Transkript");

  // ── D · Chat ───────────────────────────────────────────────────────────
  /**
   * Der gespeicherte Chat-Verlauf, sobald er `laenge` Nachrichten hat. Der Text
   * steht schon WÄHREND des Stroms auf dem Bildschirm, gespeichert wird erst
   * nach dessen Ende — wer sofort nachsieht, liest manchmal den alten Stand.
   */
  const verlauf = async (laenge) => {
    await page
      .waitForFunction(
        (n) => JSON.parse(localStorage.getItem("wilhelm-training-chat") || "[]").length >= n,
        laenge,
        { timeout: 8000 },
      )
      .catch(() => {});
    return JSON.parse(await page.evaluate(() => localStorage.getItem("wilhelm-training-chat") || "[]"));
  };
  await page.goto(BASE + "/coach", { waitUntil: "networkidle" });
  const feld = page.getByLabel("Nachricht an ATLAS");
  await feld.fill("Wie lief die Woche?");
  await page.getByLabel("Senden").click();
  await page.getByText("Morgen Zug.", { exact: false }).first().waitFor({ timeout: 15000 });
  const chat1 = await verlauf(2);
  pruefe(
    chat1.length === 2 && chat1[1].content === "Beobachtung: Du bist dran geblieben.\nPlan: Morgen Zug.",
    "D · die Antwort kommt als Strom an und steht sauber im Verlauf",
  );
  const chatAnfrage = letzte((a) => /Protokollform/.test(a.system));
  pruefe(
    chatAnfrage?.body.model === "claude-fable-5-2" && !("output_config" in chatAnfrage.body ? chatAnfrage.body.output_config.format : false),
    "D · der Chat geht an Fable 5.2, als freier Text",
  );

  lage.chatLehntAb = true;
  await feld.fill("Und jetzt?");
  await page.getByLabel("Senden").click();
  await page.getByText("Dazu kann ATLAS nichts sagen.").waitFor({ timeout: 15000 });
  const chat2 = await verlauf(3);
  pruefe(
    chat2.length === 3 && chat2[2].role === "user" && !JSON.stringify(chat2).includes("Halber Satz"),
    "D · bei einer Ablehnung steht kein Fehlersatz und kein halber Text im Verlauf, die Frage bleibt",
  );
  pruefe(!(await page.locator("body").innerText()).includes("Halber Satz"), "D · der halbe Text verschwindet auch vom Bildschirm");
  lage.chatLehntAb = false;
  await page.reload({ waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Erneut senden" }).click();
  await page.getByText("Morgen Zug.", { exact: false }).nth(1).waitFor({ timeout: 15000 });
  const chat3 = await verlauf(4);
  pruefe(
    chat3.length === 4 && chat3[2].content === "Und jetzt?" && chat3[3].role === "assistant",
    "D · „Erneut senden“ steht auch nach dem Neuladen da und holt die Antwort, ohne die Frage zu verdoppeln",
  );

  // ── E · Wochen-Rückblick ───────────────────────────────────────────────
  await page.getByRole("button", { name: "Ausführlicher Rückblick" }).click();
  await page.getByText("Nächste Woche zählt der Rücken.", { exact: false }).waitFor({ timeout: 15000 });
  // Auch hier: gespeichert wird nach dem Ende des Stroms, nicht beim ersten Wort.
  await page
    .waitForFunction(() => !!localStorage.getItem("wilhelm-training-rapport"), null, { timeout: 8000 })
    .catch(() => {});
  const vorher = anfragen.length;
  await page.reload({ waitUntil: "networkidle" });
  const nochDa = await page
    .getByText("Nächste Woche zählt der Rücken.", { exact: false })
    .waitFor({ timeout: 8000 })
    .then(() => true, () => false);
  pruefe(nochDa && anfragen.length === vorher, "E · der Wochen-Rückblick bleibt nach dem Neuladen stehen, ohne neue Anfrage");

  // ── F · Selbsttest und Ersatzmodell ────────────────────────────────────
  await page.goto(BASE + "/settings", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "ATLAS testen" }).click();
  await page.getByText(/Plan und Chat: claude-fable-5-2 antwortet/).waitFor({ timeout: 20000 });
  await page.getByText(/Im Training: claude-sonnet-5-5 antwortet/).waitFor({ timeout: 8000 });
  pruefe(true, "F · der Selbsttest meldet beide Modelle mit Antwortzeit");
  lage.fableNimmtNichtAn = true;
  await page.getByRole("button", { name: "ATLAS testen" }).click();
  const ersatz = await page
    .getByText(/claude-fable-5-2 nimmt die Anfrage nicht an, der Ersatz claude-opus-5-5 antwortet/)
    .waitFor({ timeout: 20000 })
    .then(() => true, () => false);
  pruefe(ersatz, "F · nimmt Fable die Anfrage nicht an, antwortet der Ersatz, und der Test sagt es");
  pruefe(
    /30 Tage Datenaufbewahrung/.test(await page.locator("body").innerText()),
    "F · mit dem Grund, den Anthropic nennt",
  );
} catch (e) {
  pruefe(false, `Ablauf abgebrochen: ${String(e).split("\n")[0]}`);
} finally {
  await browser.close();
  aufraeumen();
}

if (fehler.length) {
  console.error(`\n${fehler.length} Prüfung(en) fehlgeschlagen.`);
  process.exit(1);
}
console.log("\nATLAS-Prüfung bestanden.");
process.exit(0);
