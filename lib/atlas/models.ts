/**
 * Zentrale Modell-Wahl für alle ATLAS-Endpunkte: welches Modell welche
 * Aufgabe übernimmt, wie gründlich es dabei nachdenkt (`effort`) und wie viel
 * es höchstens schreiben darf. Ein Ort statt fünf Hartkodierungen.
 *
 * Nutzer-Entscheid Nov 2026: Fable 5.2 für alles, bei dem Qualität zählt
 * (Plan, Chat, Auswertung, Wochen-Rückblick), Sonnet 5.5 für die Reaktion auf
 * jeden Satz (da zählt die Wartezeit in der Pause).
 *
 * Per Umgebungsvariable überschreibbar (`ATLAS_MODEL`, `ATLAS_FAST_MODEL`,
 * `ATLAS_FALLBACK_MODEL`) — z. B. um ein neues Modell ohne Code-Änderung zu
 * probieren. `/api/atlas/status` zeigt, was gerade gilt.
 */

const HAUPT_VORGABE = "claude-fable-5-2";
const SCHNELL_VORGABE = "claude-sonnet-5-5";
const ERSATZ_VORGABE = "claude-opus-5-5";

/** Planung, Chat, Auswertung, Wochen-Rückblick — Qualität zählt. */
export const ATLAS_MODEL = process.env.ATLAS_MODEL || HAUPT_VORGABE;

/** Live-Reaktion auf einzelne Sätze — Wartezeit zählt. */
export const ATLAS_FAST_MODEL = process.env.ATLAS_FAST_MODEL || SCHNELL_VORGABE;

/**
 * Ersatz, wenn das eigentliche Modell die Anfrage gar nicht annimmt (Fehler
 * 400, 403, 404): Fable 5.2 verlangt z. B. 30 Tage Datenaufbewahrung im
 * Anthropic-Konto und antwortet sonst mit 400. Dann einmal hiermit.
 */
export const ATLAS_ERSATZ_MODEL = process.env.ATLAS_FALLBACK_MODEL || ERSATZ_VORGABE;

/** Welche Modelle gelten und ob eine Umgebungsvariable die Vorgabe ersetzt. */
export function modellUebersicht() {
  return {
    haupt: ATLAS_MODEL,
    schnell: ATLAS_FAST_MODEL,
    ersatz: ATLAS_ERSATZ_MODEL,
    ueberschrieben: {
      haupt: ATLAS_MODEL !== HAUPT_VORGABE,
      schnell: ATLAS_FAST_MODEL !== SCHNELL_VORGABE,
      ersatz: ATLAS_ERSATZ_MODEL !== ERSATZ_VORGABE,
    },
  };
}

export type AtlasAufgabe = "plan" | "chat" | "bericht" | "auswertung" | "satz";
export type AtlasEffort = "low" | "medium" | "high";

export interface AufgabenProfil {
  model: string;
  /**
   * Wie gründlich das Modell nachdenkt. Bei Fable 5.2 und Sonnet 5.5 lässt
   * sich das Nachdenken nicht abschalten und nicht per Prompt verkürzen —
   * `effort` ist der eine Regler. `medium` für alles, worauf jemand wartet
   * und das Urteil braucht; `low` für kurze, klar umrissene Antworten.
   */
  effort: AtlasEffort;
  /**
   * Obergrenze für Nachdenken PLUS Antwort (das Nachdenken zählt mit, auch
   * wenn sein Text nicht zurückkommt). Großzügig: eine zu knappe Grenze
   * endet mitten im Nachdenken, ohne ein Wort Antwort.
   */
  maxTokens: number;
}

export const AUFGABEN: Record<AtlasAufgabe, AufgabenProfil> = {
  plan: { model: ATLAS_MODEL, effort: "medium", maxTokens: 16000 },
  chat: { model: ATLAS_MODEL, effort: "medium", maxTokens: 12000 },
  bericht: { model: ATLAS_MODEL, effort: "medium", maxTokens: 12000 },
  auswertung: { model: ATLAS_MODEL, effort: "low", maxTokens: 8000 },
  satz: { model: ATLAS_FAST_MODEL, effort: "low", maxTokens: 4000 },
};

/**
 * Modelle, die eine Ablehnung serverseitig an ein anderes Modell weitergeben
 * können (`fallbacks: "default"`). Bei allen anderen bleibt der Parameter weg
 * — ein unbekannter Parameter wäre dort ein Fehler 400.
 */
export function kannServerFallback(model: string): boolean {
  return /^claude-(fable-5-[12]|mythos-5-[12]|opus-5(-5)?|sonnet-5-5)$/.test(model);
}
