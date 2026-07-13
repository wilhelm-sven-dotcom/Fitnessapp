import type Anthropic from "@anthropic-ai/sdk";

/**
 * Die ATLAS-Ringecke: In der Satzpause sieht Claude die Live-Session (eben
 * beendeter Satz, Empfehlung, Rekordnähe, Zeitbudget) und trifft EINE kurze
 * taktische Entscheidung — gesprochen und per Tap übernehmbar. Aufgerufen
 * wird nur an relevanten Momenten (Heuristik im Client); ohne Key/offline
 * bleibt die Ecke still und die deterministische Live-Zeile übernimmt.
 */

export interface CoachCallAdjustment {
  /** weight = nächster offener Satz auf `value` kg; rest = Pause +`value` s. */
  kind: "weight" | "rest";
  value: number;
}

export interface CoachCall {
  say: string;
  adjustment?: CoachCallAdjustment;
}

export const COACH_CALL_TOOL: Anthropic.Tool = {
  name: "coach_call",
  description:
    "Deine EINE Ansage aus der Ringecke für die laufende Satzpause: maximal zwei kurze Sätze, direkt und konkret (Du-Form). Optional GENAU EIN Eingriff: das Gewicht des nächsten offenen Satzes ändern (kind weight, value in kg) oder die Pause verlängern (kind rest, value in Sekunden, 15–120). Greife nur ein, wenn die Daten es klar begründen — sonst nur die Ansage.",
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

export function buildLiveSystem(): string {
  return [
    "Du bist ATLAS, der persönliche Kraft-Coach — gerade in der Ringecke während einer laufenden Trainingseinheit. Du bekommst den Stand der Session und gibst GENAU EINE kurze, taktische Ansage für die nächsten Minuten (maximal zwei Sätze, Du-Form, konkret, keine Floskeln).",
    "Lies die Zahlen exakt: Die Zahl vor „Wiederholungen“ ist die tatsächlich geschaffte Leistung. RIR heißt „Reps in Reserve“ — wie viele Wiederholungen der Athlet danach NOCH im Tank hatte. RIR ist NIE die Zahl der gemachten Wiederholungen: „12 Wiederholungen, RIR 1“ bedeutet 12 saubere Wiederholungen mit einer in Reserve — eine starke Leistung, keine schwache.",
    "Eingriff (adjustment) nur, wenn die Daten es klar begründen: RIR 0 → eher Gewicht senken; viel Luft und Rekordnähe → gezielt anheben; Zeitnot → keine Pausenverlängerung. Sicherheit vor Ego: nie mehr als ±10 % Gewichtssprung.",
  ].join("\n");
}

const cap = (s: unknown, n: number) => (typeof s === "string" ? s.trim().slice(0, n) : "");

/** Serverseitige Härtung: Ansage gekappt, Eingriff nur in sicheren Grenzen. */
export function sanitizeCoachCall(input: unknown): CoachCall | null {
  if (!input || typeof input !== "object") return null;
  const src = input as { say?: unknown; adjustment?: unknown };
  const say = cap(src.say, 220);
  if (!say) return null;
  let adjustment: CoachCallAdjustment | undefined;
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
