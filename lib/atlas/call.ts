import Anthropic from "@anthropic-ai/sdk";
import type {
  BetaMessage,
  BetaMessageStreamParams,
  BetaRawMessageStreamEvent,
  BetaTextBlockParam,
} from "@anthropic-ai/sdk/resources/beta/messages/messages";
import { STROM_ENDE, type AtlasFehlerArt } from "@/lib/atlas/fehler";
import {
  ATLAS_ERSATZ_MODEL,
  AUFGABEN,
  kannServerFallback,
  type AtlasAufgabe,
} from "@/lib/atlas/models";

/**
 * Der EINE Weg zu Claude für alle ATLAS-Routen (Plan, Satz, Chat, Auswertung,
 * Wochen-Rückblick). Vorher baute jede Route ihre Anfrage selbst, und keine
 * prüfte, WARUM eine Antwort endete.
 *
 * Was hier für alle gilt:
 *  · Modell, Gründlichkeit (`effort`) und Längengrenze kommen aus
 *    `lib/atlas/models.ts`. Kein `thinking`-Parameter, keine Temperatur: die
 *    Modelle der Reihen Fable 5.2 und Sonnet 5.5 denken von selbst mit und
 *    weisen diese Felder ab.
 *  · Strukturierte Antworten über `output_config.format` (ein JSON-Schema).
 *    Früher erzwang die Anfrage einen Tool-Aufruf (`tool_choice`); das weisen
 *    diese Modelle mit Fehler 400 ab.
 *  · Immer als Strom, auch wenn nur das Endergebnis zählt: lange Antworten
 *    laufen so nicht in ein HTTP-Zeitlimit.
 *  · Der Grund des Endes wird geprüft: Ablehnung (`refusal`) und abgeschnitten
 *    (`max_tokens`) sind Fehler, kein Ergebnis.
 *  · Lehnt das Modell aus Sicherheitsgründen ab, lässt die API die Anfrage von
 *    selbst von einem anderen Modell beantworten (`fallbacks: "default"`).
 *  · Nimmt das Modell die Anfrage gar nicht an (400, 403, 404 — etwa weil das
 *    Konto es nicht nutzen darf), geht sie EINMAL an das Ersatzmodell.
 *  · Jeder Aufruf schreibt eine Zeile ins Server-Protokoll: Aufgabe, Modell,
 *    Dauer, Token, Cache-Treffer. Nie Inhalte.
 */

/** Fehler einer ATLAS-Anfrage, mit der Art für die Oberfläche. */
export class AtlasFehler extends Error {
  constructor(
    public readonly art: AtlasFehlerArt,
    /** Technischer Grund (für Protokoll und Selbsttest, nie für den Chat). */
    public readonly grund = "",
  ) {
    super(grund ? `${art}: ${grund}` : art);
    this.name = "AtlasFehler";
  }
}

/** Was die Aufrufe vom SDK brauchen — schmal gehalten, damit die Tests einen
 *  nachgestellten Client einsetzen können. */
export interface AtlasStrom extends AsyncIterable<BetaRawMessageStreamEvent> {
  finalMessage(): Promise<BetaMessage>;
  abort(): void;
}
export interface AtlasClient {
  beta: {
    messages: {
      stream(
        params: BetaMessageStreamParams,
        opts?: { signal?: AbortSignal; timeout?: number; maxRetries?: number },
      ): AtlasStrom;
    };
  };
}

export interface AtlasNachricht {
  role: "user" | "assistant";
  content: string;
}

interface Auftrag {
  aufgabe: AtlasAufgabe;
  system: BetaTextBlockParam[];
  messages: AtlasNachricht[];
  /** JSON-Schema der Antwort; ohne Schema kommt freier Text. */
  schema?: Record<string, unknown>;
  /** Bricht die Anfrage ab, wenn der Aufrufer weg ist. */
  signal?: AbortSignal;
  /** Nur für Tests und den Selbsttest. */
  client?: AtlasClient;
  /** Modell abweichend von der Aufgabe (Selbsttest). */
  model?: string;
  apiKey?: string;
}

/** So lange darf ein Versuch laufen, bevor das SDK aufgibt (Millisekunden). */
const FRIST_MS: Record<AtlasAufgabe, number> = {
  plan: 180_000,
  chat: 180_000,
  bericht: 180_000,
  auswertung: 90_000,
  // Eine Reaktion, die später kommt, liest niemand mehr: die Pause ist vorbei.
  satz: 25_000,
};

export function baueAnfrage(model: string, a: Auftrag): BetaMessageStreamParams {
  const profil = AUFGABEN[a.aufgabe];
  return {
    model,
    max_tokens: profil.maxTokens,
    system: a.system,
    messages: a.messages,
    output_config: {
      effort: profil.effort,
      ...(a.schema ? { format: { type: "json_schema" as const, schema: a.schema } } : {}),
    },
    ...(kannServerFallback(model)
      ? { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" as const }
      : {}),
  };
}

/** Der Grund eines Fehlers als kurzer Satz: Status und die Meldung von
 *  Anthropic, ohne das JSON drumherum. */
export function grundAus(e: unknown): string {
  if (e instanceof Anthropic.APIError) {
    const meldung = (e.error as { error?: { message?: unknown } } | undefined)?.error?.message;
    const text = typeof meldung === "string" && meldung ? meldung : e.message;
    return e.status ? `${e.status}: ${text}` : text;
  }
  return e instanceof Error ? e.message : String(e);
}

/** Ordnet einen geworfenen Fehler einer Art zu. */
export function alsAtlasFehler(e: unknown): AtlasFehler {
  if (e instanceof AtlasFehler) return e;
  if (e instanceof Anthropic.APIUserAbortError) return new AtlasFehler("abgebrochen");
  if (e instanceof Error && e.name === "AbortError") return new AtlasFehler("abgebrochen");
  const grund = grundAus(e);
  if (e instanceof Anthropic.RateLimitError) return new AtlasFehler("limit", grund);
  if (e instanceof Anthropic.AuthenticationError) return new AtlasFehler("schluessel", grund);
  if (e instanceof Anthropic.APIConnectionError) return new AtlasFehler("netz", grund);
  if (e instanceof Anthropic.InternalServerError) return new AtlasFehler("ueberlastet", grund);
  if (e instanceof Anthropic.APIError)
    return new AtlasFehler((e.status ?? 0) >= 500 ? "ueberlastet" : "anfrage", grund);
  return new AtlasFehler("netz", grund);
}

/** Hat das Modell die Anfrage als solche zurückgewiesen (nicht: überlastet,
 *  nicht: zu viele Anfragen)? Dann lohnt der eine Versuch mit dem Ersatz. */
function nimmtNichtAn(e: unknown): boolean {
  return (
    e instanceof Anthropic.BadRequestError ||
    e instanceof Anthropic.PermissionDeniedError ||
    e instanceof Anthropic.NotFoundError
  );
}

function protokoll(a: Auftrag, model: string, ms: number, msg: BetaMessage | null, fehler?: AtlasFehler) {
  const u = msg?.usage;
  console.info(
    "[atlas]",
    JSON.stringify({
      aufgabe: a.aufgabe,
      angefragt: model,
      geantwortet: msg?.model,
      ms,
      ende: msg?.stop_reason ?? null,
      ein: u?.input_tokens,
      aus: u?.output_tokens,
      cache_gelesen: u?.cache_read_input_tokens ?? 0,
      cache_geschrieben: u?.cache_creation_input_tokens ?? 0,
      ...(fehler ? { fehler: fehler.art, grund: fehler.grund.slice(0, 300) } : {}),
    }),
  );
}

function clientFuer(a: Auftrag): AtlasClient {
  if (a.client) return a.client;
  return new Anthropic({ apiKey: a.apiKey }) as unknown as AtlasClient;
}

/** Prüft, warum die Antwort endete. */
function pruefeEnde(msg: BetaMessage): void {
  if (msg.stop_reason === "refusal")
    throw new AtlasFehler("ablehnung", msg.stop_details?.category ?? "");
  if (msg.stop_reason === "max_tokens") throw new AtlasFehler("abgeschnitten");
}

/** Der sichtbare Text einer Antwort. Blöcke nach `type` lesen: eine Antwort
 *  kann mit (leeren) `thinking`-Blöcken beginnen oder `fallback`-Marken
 *  enthalten. */
function textAus(msg: BetaMessage): string {
  return msg.content
    .map((b) => (b.type === "text" ? b.text : ""))
    .join("");
}

export interface AtlasErgebnis<T> {
  wert: T;
  /** Modell, das wirklich geantwortet hat. */
  model: string;
  /** Lief der Aufruf über das Ersatzmodell? */
  ersatz: boolean;
  ms: number;
  /** Warum das eigentliche Modell nicht antwortete (nur mit `ersatz`). */
  ersatzGrund?: string;
}

/** Ein Versuch mit einem Modell; `beiText` bekommt jedes Textstück. */
async function versuch(
  a: Auftrag,
  model: string,
  beiText?: (stueck: string) => void,
  merke?: (s: AtlasStrom) => void,
): Promise<{ msg: BetaMessage; ms: number }> {
  const t0 = Date.now();
  const strom = clientFuer(a).beta.messages.stream(baueAnfrage(model, a), {
    signal: a.signal,
    timeout: FRIST_MS[a.aufgabe],
    // Die Satz-Reaktion wartet nicht auf Wiederholungen.
    maxRetries: a.aufgabe === "satz" ? 0 : 1,
  });
  merke?.(strom);
  try {
    for await (const ev of strom) {
      if (beiText && ev.type === "content_block_delta" && ev.delta.type === "text_delta")
        beiText(ev.delta.text);
    }
    const msg = await strom.finalMessage();
    const ms = Date.now() - t0;
    try {
      pruefeEnde(msg);
    } catch (e) {
      protokoll(a, model, ms, msg, alsAtlasFehler(e));
      throw e;
    }
    protokoll(a, model, ms, msg);
    return { msg, ms };
  } catch (e) {
    if (!(e instanceof AtlasFehler)) protokoll(a, model, Date.now() - t0, null, alsAtlasFehler(e));
    throw e;
  }
}

/**
 * Strukturierte Antwort: gibt das geparste JSON zurück. Wirft `AtlasFehler`.
 * Der Aufrufer prüft den Inhalt selbst (Sanitizer der Route) — das Schema
 * sichert die Form, nicht die Werte.
 */
export async function atlasJson(a: Auftrag & { schema: Record<string, unknown> }): Promise<AtlasErgebnis<unknown>> {
  const haupt = a.model ?? AUFGABEN[a.aufgabe].model;
  let model = haupt;
  let ersatzGrund: string | undefined;
  let lauf: { msg: BetaMessage; ms: number };
  try {
    lauf = await versuch(a, model);
  } catch (e) {
    if (!nimmtNichtAn(e) || haupt === ATLAS_ERSATZ_MODEL) throw alsAtlasFehler(e);
    ersatzGrund = grundAus(e);
    model = ATLAS_ERSATZ_MODEL;
    try {
      lauf = await versuch(a, model);
    } catch (e2) {
      throw alsAtlasFehler(e2);
    }
  }
  const text = textAus(lauf.msg).trim();
  let wert: unknown;
  try {
    wert = JSON.parse(text);
  } catch {
    throw new AtlasFehler("unbrauchbar", "Antwort ist kein JSON");
  }
  return {
    wert,
    model: lauf.msg.model,
    ersatz: model !== haupt,
    ms: lauf.ms,
    ...(ersatzGrund ? { ersatzGrund } : {}),
  };
}

/**
 * Freier Text als Strom an den Browser. Mit `v2` endet der Strom mit
 * `STROM_ENDE` und einer JSON-Zeile (`ok` oder die Fehlerart); ohne `v2`
 * bekommt ein noch nicht aktualisiertes Fenster das frühere Format (reiner
 * Text, im Fehlerfall ein freundlicher Satz).
 */
export function atlasTextAntwort(a: Auftrag & { v2: boolean }): Response {
  const encoder = new TextEncoder();
  let aktiv: AtlasStrom | null = null;
  const haupt = a.model ?? AUFGABEN[a.aufgabe].model;

  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      let zu = false;
      const sende = (s: string) => {
        if (!zu) controller.enqueue(encoder.encode(s));
      };
      let gesendet = false;
      const beiText = (s: string) => {
        gesendet = true;
        sende(s);
      };
      const merke = (s: AtlasStrom) => {
        aktiv = s;
      };
      try {
        try {
          await versuch(a, haupt, beiText, merke);
        } catch (e) {
          // Nur wenn noch nichts beim Nutzer steht: sonst stünden zwei
          // Antworten hintereinander.
          if (gesendet || !nimmtNichtAn(e) || haupt === ATLAS_ERSATZ_MODEL) throw e;
          await versuch(a, ATLAS_ERSATZ_MODEL, beiText, merke);
        }
        if (a.v2) sende(STROM_ENDE + JSON.stringify({ ok: true }));
      } catch (e) {
        const f = alsAtlasFehler(e);
        if (f.art !== "abgebrochen") {
          if (a.v2) sende(STROM_ENDE + JSON.stringify({ ok: false, fehler: f.art }));
          else sende("\n\n(ATLAS war kurz nicht erreichbar — versuch es gleich nochmal.)");
        }
      } finally {
        zu = true;
        try {
          controller.close();
        } catch {
          /* der Browser hat schon geschlossen */
        }
      }
    },
    cancel() {
      aktiv?.abort();
    },
  });

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
      // Kein Puffern durch Zwischenstationen: der Text soll Stück für Stück ankommen.
      "X-Accel-Buffering": "no",
    },
  });
}
