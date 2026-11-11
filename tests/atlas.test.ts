/**
 * ATLAS-Aufrufe (lib/atlas/call.ts) mit einem nachgestellten Client: Form der
 * Anfrage, Endegrund, Ersatzmodell, Stromformat. Dazu Schemas, Transkript,
 * Datum und Zugangsschutz. Gegen die echte Schnittstelle prüft der Selbsttest
 * in den Einstellungen („ATLAS testen“).
 */
import assert from "node:assert/strict";
import { beforeEach, describe, test } from "node:test";
import Anthropic from "@anthropic-ai/sdk";
import type { ActiveSessionState } from "@/lib/active-session";
import {
  AtlasFehler,
  atlasJson,
  atlasTextAntwort,
  baueAnfrage,
  type AtlasClient,
  type AtlasStrom,
} from "@/lib/atlas/call";
import { heuteZeile } from "@/lib/atlas/eingang";
import { STROM_ENDE, ZUGANG_KOPF } from "@/lib/atlas/fehler";
import { COACH_REACT_SCHEMA, sanitizeCoachReact } from "@/lib/atlas/live-tool";
import { ATLAS_ERSATZ_MODEL, AUFGABEN, kannServerFallback } from "@/lib/atlas/models";
import { atlasSystem, zeitmodell } from "@/lib/atlas/prompts";
import { DAILY_SESSION_SCHEMA, sanitizeDailySession } from "@/lib/atlas/session-tool";
import { buildSessionTranscript, TRANSKRIPT_MAX } from "@/lib/atlas/transcript";
import { zugangStatus } from "@/lib/atlas/zugang";
import { LIB } from "@/lib/exercises";

console.info = () => {}; // das Protokoll der Aufrufe gehört nicht in die Testausgabe

type Params = Parameters<AtlasClient["beta"]["messages"]["stream"]>[0];

/** Was ein nachgestellter Versuch tun soll. */
interface Drehbuch {
  wirft?: unknown;
  text?: string[];
  ende?: string;
  model?: string;
}

function attrappe(drehbuch: Drehbuch[]) {
  const anfragen: Params[] = [];
  let abgebrochen = 0;
  const client: AtlasClient = {
    beta: {
      messages: {
        stream(params) {
          anfragen.push(params);
          const d = drehbuch[anfragen.length - 1] ?? {};
          const stuecke = d.text ?? [];
          const strom: AtlasStrom = {
            async *[Symbol.asyncIterator]() {
              if (d.wirft) throw d.wirft;
              for (const t of stuecke)
                yield {
                  type: "content_block_delta",
                  index: 0,
                  delta: { type: "text_delta", text: t },
                } as never;
            },
            async finalMessage() {
              if (d.wirft) throw d.wirft;
              return {
                model: d.model ?? params.model,
                stop_reason: d.ende ?? "end_turn",
                stop_details: d.ende === "refusal" ? { type: "refusal", category: "cyber" } : null,
                content: [
                  { type: "thinking", thinking: "", signature: "x" },
                  { type: "text", text: stuecke.join("") },
                ],
                usage: { input_tokens: 10, output_tokens: 5 },
              } as never;
            },
            abort() {
              abgebrochen++;
            },
          };
          return strom;
        },
      },
    },
  };
  return { client, anfragen, abgebrochen: () => abgebrochen };
}

const apiFehler = (status: number, text = "abgelehnt") =>
  Anthropic.APIError.generate(
    status,
    { type: "error", error: { type: "invalid_request_error", message: text } },
    text,
    new Headers(),
  );

const system = atlasSystem("Regeln der Route");
const frage = [{ role: "user" as const, content: "Hallo" }];
const SCHEMA = { type: "object", properties: {}, required: [], additionalProperties: false };

async function art(p: Promise<unknown>): Promise<string> {
  try {
    await p;
    return "kein Fehler";
  } catch (e) {
    return e instanceof AtlasFehler ? e.art : `fremder Fehler: ${String(e)}`;
  }
}

describe("Form der Anfrage", () => {
  test("Plan geht an Fable 5.2, die Satz-Reaktion an Sonnet 5.5", () => {
    assert.equal(AUFGABEN.plan.model, "claude-fable-5-2");
    assert.equal(AUFGABEN.chat.model, "claude-fable-5-2");
    assert.equal(AUFGABEN.satz.model, "claude-sonnet-5-5");
    assert.equal(ATLAS_ERSATZ_MODEL, "claude-opus-5-5");
  });

  test("kein erzwungener Tool-Aufruf, kein thinking, keine Temperatur", () => {
    const p = baueAnfrage("claude-fable-5-2", {
      aufgabe: "plan",
      system,
      messages: frage,
      schema: SCHEMA,
    }) as unknown as Record<string, unknown>;
    for (const feld of ["tool_choice", "tools", "thinking", "temperature", "top_p", "top_k"])
      assert.equal(feld in p, false, `${feld} darf nicht in der Anfrage stehen`);
    assert.deepEqual(p.output_config, { effort: "medium", format: { type: "json_schema", schema: SCHEMA } });
    assert.equal(p.max_tokens, AUFGABEN.plan.maxTokens);
  });

  test("Ablehnungen gehen serverseitig an ein anderes Modell", () => {
    const p = baueAnfrage("claude-fable-5-2", { aufgabe: "chat", system, messages: frage });
    assert.deepEqual(p.betas, ["server-side-fallback-2026-07-01"]);
    assert.equal(p.fallbacks, "default");
    // Ein Modell, das den Parameter nicht kennt, bekommt ihn nicht.
    const alt = baueAnfrage("claude-haiku-4-5", { aufgabe: "chat", system, messages: frage });
    assert.equal("fallbacks" in alt, false);
    assert.equal(kannServerFallback("claude-opus-5-5"), true);
    assert.equal(kannServerFallback("claude-sonnet-5"), false);
  });

  test("die letzte Nachricht kommt vom Nutzer (kein Vorschreiben der Antwort)", () => {
    const p = baueAnfrage("claude-sonnet-5-5", { aufgabe: "satz", system, messages: frage });
    assert.equal(p.messages[p.messages.length - 1].role, "user");
    assert.equal(p.output_config?.effort, "low");
  });

  test("der feste Teil des System-Prompts trägt den Cache-Marker und ändert sich nicht", () => {
    const a = atlasSystem("eins");
    const b = atlasSystem("zwei");
    assert.equal(a[0].text, b[0].text);
    assert.deepEqual(a[0].cache_control, { type: "ephemeral" });
    assert.equal(a[1].text, "eins");
    assert.match(a[0].text, /Pause 2:00/);
    assert.equal(/Peloton/.test(a[0].text), false, "nichts Persönliches im festen Teil");
  });
});

describe("Strukturierte Antwort", () => {
  test("liefert das JSON und nennt das Modell, das geantwortet hat", async () => {
    const { client } = attrappe([{ text: ['{"a":', "1}"] }]);
    const r = await atlasJson({ client, aufgabe: "plan", system, messages: frage, schema: SCHEMA });
    assert.deepEqual(r.wert, { a: 1 });
    assert.equal(r.ersatz, false);
  });

  test("Ablehnung ist ein Fehler, kein Ergebnis", async () => {
    const { client } = attrappe([{ text: [], ende: "refusal" }]);
    assert.equal(await art(atlasJson({ client, aufgabe: "plan", system, messages: frage, schema: SCHEMA })), "ablehnung");
  });

  test("abgeschnittene Antwort ist ein Fehler", async () => {
    const { client } = attrappe([{ text: ['{"a":'], ende: "max_tokens" }]);
    assert.equal(
      await art(atlasJson({ client, aufgabe: "plan", system, messages: frage, schema: SCHEMA })),
      "abgeschnitten",
    );
  });

  test("kein JSON → unbrauchbar", async () => {
    const { client } = attrappe([{ text: ["Gern, hier ist dein Plan"] }]);
    assert.equal(await art(atlasJson({ client, aufgabe: "plan", system, messages: frage, schema: SCHEMA })), "unbrauchbar");
  });

  test("nimmt das Modell die Anfrage nicht an (400), springt einmal der Ersatz ein", async () => {
    const { client, anfragen } = attrappe([{ wirft: apiFehler(400, "retention") }, { text: ['{"ok":true}'] }]);
    const r = await atlasJson({ client, aufgabe: "plan", system, messages: frage, schema: SCHEMA });
    assert.deepEqual(anfragen.map((a) => a.model), ["claude-fable-5-2", "claude-opus-5-5"]);
    assert.equal(r.ersatz, true);
    assert.match(r.ersatzGrund ?? "", /retention/);
  });

  test("auch der Ersatz lehnt ab → Fehler „anfrage“, kein dritter Versuch", async () => {
    const { client, anfragen } = attrappe([{ wirft: apiFehler(400) }, { wirft: apiFehler(400) }]);
    assert.equal(await art(atlasJson({ client, aufgabe: "plan", system, messages: frage, schema: SCHEMA })), "anfrage");
    assert.equal(anfragen.length, 2);
  });

  test("zu viele Anfragen (429) und Überlastung (529) lösen keinen Ersatz aus", async () => {
    for (const [status, erwartet] of [
      [429, "limit"],
      [529, "ueberlastet"],
      [401, "schluessel"],
    ] as const) {
      const { client, anfragen } = attrappe([{ wirft: apiFehler(status) }]);
      assert.equal(await art(atlasJson({ client, aufgabe: "plan", system, messages: frage, schema: SCHEMA })), erwartet);
      assert.equal(anfragen.length, 1, `Status ${status}`);
    }
  });
});

describe("Textstrom", () => {
  const lies = async (r: Response) => await r.text();

  test("neues Format: Text, dann die Ende-Zeile", async () => {
    const { client } = attrappe([{ text: ["Gute ", "Einheit."] }]);
    const roh = await lies(atlasTextAntwort({ client, aufgabe: "chat", system, messages: frage, v2: true }));
    assert.equal(roh, `Gute Einheit.${STROM_ENDE}{"ok":true}`);
  });

  test("Fehler steht in der Ende-Zeile, nie im Text", async () => {
    const { client } = attrappe([{ text: ["Halber "], ende: "max_tokens" }]);
    const roh = await lies(atlasTextAntwort({ client, aufgabe: "chat", system, messages: frage, v2: true }));
    const [text, ende] = roh.split(STROM_ENDE);
    assert.equal(text, "Halber ");
    assert.deepEqual(JSON.parse(ende), { ok: false, fehler: "abgeschnitten" });
  });

  test("Ablehnung vor dem ersten Wort: leerer Text, Fehlerart „ablehnung“", async () => {
    const { client } = attrappe([{ text: [], ende: "refusal" }]);
    const roh = await lies(atlasTextAntwort({ client, aufgabe: "chat", system, messages: frage, v2: true }));
    assert.equal(roh, `${STROM_ENDE}{"ok":false,"fehler":"ablehnung"}`);
  });

  test("Ersatzmodell springt ein, solange noch nichts gesendet wurde", async () => {
    const { client, anfragen } = attrappe([{ wirft: apiFehler(404) }, { text: ["Da bin ich."] }]);
    const roh = await lies(atlasTextAntwort({ client, aufgabe: "chat", system, messages: frage, v2: true }));
    assert.equal(roh, `Da bin ich.${STROM_ENDE}{"ok":true}`);
    assert.equal(anfragen[1].model, "claude-opus-5-5");
  });

  test("ältere Fenster bekommen reinen Text ohne Ende-Zeile", async () => {
    const { client } = attrappe([{ text: ["Gute Einheit."] }]);
    const roh = await lies(atlasTextAntwort({ client, aufgabe: "chat", system, messages: frage, v2: false }));
    assert.equal(roh, "Gute Einheit.");
  });
});

describe("Schemas und Härtung", () => {
  /** Strukturierte Ausgabe verlangt `additionalProperties: false` an jedem
   *  Objekt und kennt keine Zahlen- oder Längengrenzen. */
  const pruefe = (s: unknown, pfad = "$"): void => {
    if (!s || typeof s !== "object") return;
    const o = s as Record<string, unknown>;
    for (const verboten of ["minimum", "maximum", "multipleOf", "minLength", "maxLength", "minItems", "maxItems", "pattern"])
      assert.equal(verboten in o, false, `${pfad}: ${verboten} wird nicht unterstützt`);
    if (o.type === "object") assert.equal(o.additionalProperties, false, `${pfad}: additionalProperties`);
    for (const [k, v] of Object.entries(o)) {
      if (Array.isArray(v)) v.forEach((x, i) => pruefe(x, `${pfad}.${k}[${i}]`));
      else pruefe(v, `${pfad}.${k}`);
    }
  };

  test("beide Schemas halten die Regeln der strukturierten Ausgabe ein", () => {
    pruefe(DAILY_SESSION_SCHEMA);
    pruefe(COACH_REACT_SCHEMA);
  });

  test("der Plan nimmt nur erlaubte Übungen, ohne Dubletten, in Grenzen", () => {
    const roh = {
      name: "Zug",
      focus: "Rücken",
      briefing: "x".repeat(900),
      items: [
        { exerciseId: "row1", sets: 99, repLow: 8, repHigh: 4, why: "w", intro: "i" },
        { exerciseId: "row1", sets: 3, repLow: 8, repHigh: 12, why: "w", intro: "i" },
        { exerciseId: "erfunden", sets: 3, repLow: 8, repHigh: 12, why: "w", intro: "i" },
        { exerciseId: "goblet", sets: 3, repLow: 8, repHigh: 12, why: "w", intro: "i" },
        { exerciseId: "bench_db", sets: 3, repLow: 8, repHigh: 12, why: "w", intro: "i" },
      ],
    };
    const s = sanitizeDailySession(roh, ["row1", "goblet", "bench_db"]);
    assert.deepEqual(s?.items.map((i) => i.exerciseId), ["row1", "goblet", "bench_db"]);
    assert.equal(s?.items[0].sets, 6);
    assert.equal(s?.items[0].repHigh, 8, "obere Grenze nie unter der unteren");
    assert.equal(s?.briefing.length, 400);
    assert.equal(sanitizeDailySession({ items: [] }, ["row1"]), null);
  });

  test("die Satz-Reaktion: null heißt kein Eingriff, Werte außer Grenzen fallen weg", () => {
    assert.deepEqual(sanitizeCoachReact({ say: "Stark.", adjustment: null }), { say: "Stark.", adjustment: undefined });
    assert.deepEqual(sanitizeCoachReact({ say: "Stark.", adjustment: { kind: "rest", value: 600 } })?.adjustment, undefined);
    assert.deepEqual(sanitizeCoachReact({ say: "Stark.", adjustment: { kind: "weight", value: 42.4 } })?.adjustment, {
      kind: "weight",
      value: 42.5,
    });
    assert.equal(sanitizeCoachReact({ say: "  " }), null);
  });
});

describe("Kontext", () => {
  test("das Zeitmodell nennt die echten Pausen der App", () => {
    const z = zeitmodell();
    assert.match(z, /2:00 bei Grundübungen/);
    assert.match(z, /1:30 bei eingelenkigen/);
    assert.match(z, /etwa 7,9 Minuten/);
    assert.match(z, /etwa 6,4 Minuten/);
  });

  test("das Datum kommt vom Gerät, sonst aus deutscher Zeit", () => {
    assert.equal(heuteZeile("2026-11-10"), "Heute ist Dienstag, der 10. November 2026.");
    assert.match(heuteZeile("kein Datum"), /^Heute ist \p{L}+, der \d+\. \p{L}+ \d{4}\.$/u);
  });

  test("im langen Transkript bleibt der aktuelle Satz stehen", () => {
    const uebungen = LIB.filter((e) => e.pattern !== "cardio" && e.unit !== "Sek").slice(0, 14);
    const items = uebungen.map((e, i) => ({ id: `i${i + 1}`, exerciseId: e.id, sets: 6, repLow: 8, repHigh: 12 }));
    const entries: Record<string, unknown[]> = {};
    for (const it of items)
      entries[it.id] = Array.from({ length: 6 }, () => ({ weight: "102.5", reps: "12", rir: 2 }));
    const state = {
      schemaVersion: 1,
      session: { name: "Lange Einheit", focus: "Alles", items },
      entries,
      currentIndex: 13,
      phase: "exercise",
      startedAt: new Date(Date.now() - 90 * 60000).toISOString(),
      backSafe: false,
    } as unknown as ActiveSessionState;
    const notizen = Object.fromEntries(uebungen.map((e) => [e.id, "Unterstützungsband, mittlere Stärke, beide Schlaufen"]));
    const t = buildSessionTranscript({
      state,
      allLib: LIB,
      itemId: "i14",
      setIdx: 5,
      records: new Map(),
      exerciseNotes: notizen,
      budgetMin: 90,
    });
    assert.ok(t.length <= TRANSKRIPT_MAX, `Länge ${t.length}`);
    assert.match(t, /AKTUELL: Eben Satz 6\/6 von /);
    assert.match(t, /← AKTUELLE ÜBUNG/);
    assert.match(t, /Einheit: Lange Einheit/);
  });

  test("ein kurzes Transkript bleibt vollständig", () => {
    const e = LIB.find((x) => x.id === "row1")!;
    const state = {
      schemaVersion: 1,
      session: { name: "Kurz", focus: "", items: [{ id: "i1", exerciseId: e.id, sets: 3, repLow: 8, repHigh: 12 }] },
      entries: { i1: [{ weight: "20", reps: "40", rir: 1 }] },
      currentIndex: 0,
      phase: "exercise",
      startedAt: new Date().toISOString(),
      backSafe: false,
    } as unknown as ActiveSessionState;
    const t = buildSessionTranscript({
      state,
      allLib: LIB,
      itemId: "i1",
      setIdx: 0,
      records: new Map(),
      exerciseNotes: {},
      budgetMin: 25,
    });
    assert.match(t, /Geschaffte Sätze: 20 kg × 40 Wdh, RIR 1\./);
    assert.equal(/ausgelassen/.test(t), false);
  });
});

describe("Zugangsschutz", () => {
  const anfrage = (code?: string) =>
    new Request("http://x/api/atlas/chat", { headers: code ? { [ZUGANG_KOPF]: code } : {} });
  beforeEach(() => {
    delete process.env.ATLAS_ZUGANGSCODE;
  });

  test("ohne Variable ist alles offen", () => {
    assert.equal(zugangStatus(anfrage()), "frei");
  });

  test("mit Variable zählt nur der richtige Code", () => {
    process.env.ATLAS_ZUGANGSCODE = "hantel-42";
    assert.equal(zugangStatus(anfrage()), "noetig");
    assert.equal(zugangStatus(anfrage("falsch")), "falsch");
    assert.equal(zugangStatus(anfrage("hantel-42")), "ok");
  });
});
