import type Anthropic from "@anthropic-ai/sdk";

/**
 * ATLAS' Live-Reaktion auf einen abgeschlossenen Satz: EINE kurze Ansage mit
 * vollem Session-Kontext (Transkript), optional GENAU EIN Eingriff. Client
 * zeigt sofort die deterministische Zeile; die KI-Reaktion ersetzt sie, sobald
 * sie da ist. Ohne Key/offline bleibt es bei der deterministischen Zeile.
 */

export interface CoachReactAdjustment {
  /** weight = nächster offener Satz auf `value` kg; rest = Pause +`value` s. */
  kind: "weight" | "rest";
  value: number;
}

export interface CoachReact {
  say: string;
  adjustment?: CoachReactAdjustment;
}

export const COACH_REACT_TOOL: Anthropic.Tool = {
  name: "coach_react",
  description:
    "Deine Reaktion auf den eben protokollierten Satz — mit Blick auf den GESAMTEN Verlauf der Studie (Transkript). Maximal zwei kurze Sätze, direkt und konkret (Du-Form); beziehe dich ruhig auf frühere Sätze oder Übungen der Studie. Optional GENAU EIN Eingriff: Gewicht des nächsten offenen Satzes dieser Übung (kind weight, value in kg, höchstens ±10 % vom eben bewegten Gewicht) oder Verschlusszeit verlängern (kind rest, value in Sekunden, 15–120). Greife nur ein, wenn die Daten es klar begründen — sonst nur die Ansage.",
  input_schema: {
    type: "object",
    properties: {
      say: {
        type: "string",
        description: "Die Ansage, maximal zwei Sätze, deutsch, Du-Form.",
      },
      adjustment: {
        type: "object",
        description: "Optionaler Eingriff — nur wenn klar begründet.",
        properties: {
          kind: { type: "string", enum: ["weight", "rest"] },
          value: { type: "number", description: "kg (weight) bzw. Sekunden (rest)." },
        },
        required: ["kind", "value"],
        additionalProperties: false,
      },
    },
    required: ["say"],
    additionalProperties: false,
  },
  strict: true,
};

/** Regeln für den Live-Modus — kommen als dynamischer System-Block NACH dem
 *  gecachten Präfix (Persona + Prinzipien + Katalog). */
export const LIVE_RULES = [
  "Du begleitest gerade LIVE eine laufende Studie. Unten steht das Transkript: Plan, alle bisherigen Sätze, Tagesform und der eben beendete Satz (AKTUELL).",
  "Lies die Zahlen exakt: Die Zahl vor „Wiederholungen” ist die geschaffte Leistung. RIR heißt „Reps in Reserve” — wie viele Wiederholungen danach NOCH im Tank waren. „12 Wiederholungen, RIR 1” ist eine starke Leistung, keine schwache.",
  "Eingriff nur mit klarer Begründung: RIR 0 und Ziel verfehlt → eher Gewicht senken; viel Luft (RIR ≥ 3) und Nähe zum Maximum → gezielt anheben; Zeitnot laut Transkript → keine Pausenverlängerung. Sicherheit vor Ego.",
  "Rufe das Tool coach_react mit deiner Reaktion auf.",
].join("\n");

const cap = (s: unknown, n: number) => (typeof s === "string" ? s.trim().slice(0, n) : "");

/** Serverseitige Härtung: Ansage gekappt, Eingriff nur in sicheren Grenzen. */
export function sanitizeCoachReact(input: unknown): CoachReact | null {
  if (!input || typeof input !== "object") return null;
  const src = input as { say?: unknown; adjustment?: unknown };
  const say = cap(src.say, 220);
  if (!say) return null;
  let adjustment: CoachReactAdjustment | undefined;
  const adj = src.adjustment as { kind?: unknown; value?: unknown } | undefined;
  if (adj && typeof adj === "object") {
    const value = Number(adj.value);
    if (adj.kind === "weight" && Number.isFinite(value) && value >= 1 && value <= 300) {
      adjustment = { kind: "weight", value: Math.round(value * 4) / 4 };
    } else if (adj.kind === "rest" && Number.isFinite(value) && value >= 15 && value <= 120) {
      adjustment = { kind: "rest", value: Math.round(value) };
    }
  }
  return { say, adjustment };
}
