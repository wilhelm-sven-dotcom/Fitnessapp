/**
 * ATLAS' Reaktion auf einen eben beendeten Satz: EINE kurze Ansage mit Blick
 * auf die ganze Einheit (Transkript), dazu höchstens EIN Eingriff. Die
 * Oberfläche zeigt sofort eine feste Zeile; die Antwort ersetzt sie, sobald
 * sie da ist. Ohne Schlüssel oder ohne Netz bleibt es bei der festen Zeile.
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

/** Form der Antwort (`output_config.format`). `adjustment` ist Pflichtfeld
 *  und darf `null` sein: das Modell entscheidet so ausdrücklich, ob es
 *  eingreift, statt ein Feld nur wegzulassen. */
export const COACH_REACT_SCHEMA: Record<string, unknown> = {
  type: "object",
  properties: {
    say: {
      type: "string",
      description: "Die Ansage: höchstens zwei kurze Sätze, Du-Form.",
    },
    adjustment: {
      anyOf: [
        {
          type: "object",
          properties: {
            kind: { type: "string", enum: ["weight", "rest"] },
            value: {
              type: "number",
              description: "Bei weight: das neue Gewicht in kg. Bei rest: zusätzliche Pause in Sekunden.",
            },
          },
          required: ["kind", "value"],
          additionalProperties: false,
        },
        { type: "null" },
      ],
      description: "Der Eingriff, oder null, wenn keiner nötig ist.",
    },
  },
  required: ["say", "adjustment"],
  additionalProperties: false,
};

/** Regeln für die Satz-Reaktion — veränderlicher System-Block NACH dem
 *  gecachten Präfix (Persona + Prinzipien + Katalog). */
export const LIVE_RULES = [
  "Du begleitest gerade eine laufende Einheit. Die Nachricht ist das Transkript: Plan, alle bisherigen Sätze, Tagesform und unter „AKTUELL“ der eben beendete Satz. Antworte auf diesen Satz, mit Blick auf den ganzen Verlauf.",
  "Jede Zahl im Transkript trägt ihre Einheit. „80 kg × 12 Wdh“ heißt: 80 Kilo bewegt, 12 Wiederholungen geschafft. Übernimm die Zahlen, wie sie dastehen. Hohe Wiederholungszahlen sind bei leichtem Gewicht und Eigengewicht normal: 40 Wdh sind 40 Wdh.",
  "RIR heißt „Reps in Reserve“: wie viele Wiederholungen nach dem Satz noch möglich gewesen wären. „12 Wdh, RIR 1“ ist ein harter, guter Satz.",
  "say ist deine Ansage. Sie steht in der Pause in einer kleinen Sprechblase und wird auf Wunsch vorgelesen, darum höchstens zwei kurze Sätze. Du kannst dich auf frühere Sätze oder Übungen der Einheit beziehen.",
  "adjustment ist ein Eingriff und bleibt null, solange die Zahlen ihn nicht klar begründen. weight setzt das Gewicht des nächsten offenen Satzes dieser Übung (in kg, höchstens 10 Prozent vom eben bewegten Gewicht entfernt). rest verlängert die laufende Pause um 15 bis 120 Sekunden. Anhaltspunkte: RIR 0 und Ziel verfehlt spricht für weniger Gewicht; viel Luft (RIR 3 oder mehr) nahe am Bestwert für mehr; ist die Zeit laut Transkript knapp, keine längere Pause. Im Zweifel zählt Sicherheit mehr als ein Rekord.",
].join("\n\n");

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
