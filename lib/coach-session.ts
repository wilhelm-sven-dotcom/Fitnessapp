import type Anthropic from "@anthropic-ai/sdk";
import { TRAINING_PRINCIPLES } from "@/lib/training-science";
import type { DayItem } from "@/lib/types";

/**
 * Minimal exercise descriptor the model chooses from. Built on the client from
 * the active gym's equipment (so custom exercises and the chosen profile are
 * respected) and sent to the route — the model may only reference these ids.
 */
export interface CoachExercise {
  id: string;
  name: string;
  pattern: string;
}

/**
 * The tool the model MUST call (forced via `tool_choice`). `strict: true` makes
 * the API guarantee the input matches this schema, but `sanitizeAiDay` re-validates
 * server-side regardless — a malformed payload can never reach the builder.
 */
export const BUILD_SESSION_TOOL: Anthropic.Tool = {
  name: "build_session",
  description:
    "Stelle eine konkrete Trainingseinheit zusammen: ein kurzer Name, ein Fokus und eine geordnete Liste von Übungen mit Sätzen und Wiederholungs-Spanne. Wähle die Übungen ausschließlich aus der vorgegebenen Liste (über ihre exakte id) und halte die geschätzte Dauer im Zeitrahmen.",
  input_schema: {
    type: "object",
    properties: {
      name: {
        type: "string",
        description:
          "Kurzer, konkreter Name der Einheit, z. B. Oberkörper Push oder Ganzkörper kurz.",
      },
      focus: {
        type: "string",
        description: "Fokus in 1 bis 3 Wörtern, z. B. Ganzkörper, Push, Unterkörper.",
      },
      items: {
        type: "array",
        description:
          "Die Übungen in sinnvoller Trainingsreihenfolge — große, komplexe zuerst, Isolation und Core danach.",
        items: {
          type: "object",
          properties: {
            exerciseId: {
              type: "string",
              description: "Die id genau einer Übung aus der vorgegebenen Liste.",
            },
            sets: { type: "integer", description: "Arbeitssätze, 1 bis 6." },
            repLow: {
              type: "integer",
              description: "Untere Wiederholungs- bzw. Sekunden-Grenze, mindestens 1.",
            },
            repHigh: {
              type: "integer",
              description: "Obere Grenze, größer oder gleich repLow.",
            },
          },
          required: ["exerciseId", "sets", "repLow", "repHigh"],
          additionalProperties: false,
        },
      },
    },
    required: ["name", "focus", "items"],
    additionalProperties: false,
  },
  strict: true,
};

/**
 * System prompt for the structured session builder. Lists the allowed exercises
 * (id · Name · Pattern) and the time/focus/volume guidance, then asks for one
 * `build_session` tool call.
 */
export function buildSessionSystem(
  exercises: CoachExercise[],
  minutes: number,
  focus: string,
): string {
  const list = exercises.map((e) => `- ${e.id} · ${e.name} · ${e.pattern}`).join("\n");
  const focusText = focus.trim() || "Ganzkörper";
  return `Du bist der persönliche Trainings-Coach von Sven und stellst EINE Trainingseinheit zusammen.

Profil: Ziel Muskelaufbau (Hypertrophie), 1,93 m / ~90 kg.

${TRAINING_PRINCIPLES}

Aufgabe: Baue eine Einheit mit Fokus „${focusText}" für etwa ${minutes} Minuten.
- Wähle Übungen AUSSCHLIESSLICH aus der Liste unten und referenziere sie über ihre exakte id.
- Reihenfolge: große, komplexe Übungen zuerst, Isolation und Core danach.
- Plane realistisch fürs Zeitfenster (Faustregel: ~3–4 Übungen je 15 Min, dann eine weitere je 5–7 Min). Lieber etwas knapper als überladen.
- Sätze 1–6, sinnvolle Wiederholungs-Spanne für Hypertrophie (meist 8–12); bei Halte-/Core-Übungen ggf. Sekunden.
- Sorge für Balance passend zum Fokus, ohne ein Muster unnötig zu doppeln.

Verfügbare Übungen (id · Name · Pattern):
${list}

Rufe danach das Tool build_session mit der fertigen Einheit auf.`;
}

const clampInt = (v: unknown, lo: number, hi: number, fallback: number): number => {
  const n = Math.round(Number(v));
  if (!Number.isFinite(n)) return fallback;
  return Math.max(lo, Math.min(hi, n));
};

/** Hard ceiling on items so a runaway response can't produce an absurd day. */
const MAX_ITEMS = 12;

/**
 * Validate the model's `build_session` input into a safe day. Drops items whose
 * id is not in `allowedIds`, clamps `sets` to 1..6, forces `repLow ≥ 1` and
 * `repHigh ≥ repLow`, caps the list length, and returns `null` when nothing
 * usable remains — the real safety net behind the forced tool call.
 */
export function sanitizeAiDay(
  raw: unknown,
  allowedIds: Set<string> | string[],
): { name: string; focus: string; items: DayItem[] } | null {
  if (!raw || typeof raw !== "object") return null;
  const allowed = allowedIds instanceof Set ? allowedIds : new Set(allowedIds);
  const obj = raw as { name?: unknown; focus?: unknown; items?: unknown };
  const rawItems = Array.isArray(obj.items) ? obj.items : [];

  const items: DayItem[] = [];
  for (const it of rawItems) {
    if (items.length >= MAX_ITEMS) break;
    if (!it || typeof it !== "object") continue;
    const r = it as {
      exerciseId?: unknown;
      sets?: unknown;
      repLow?: unknown;
      repHigh?: unknown;
    };
    const id = typeof r.exerciseId === "string" ? r.exerciseId : "";
    if (!allowed.has(id)) continue;
    const sets = clampInt(r.sets, 1, 6, 3);
    const repLow = clampInt(r.repLow, 1, 999, 8);
    const repHigh = Math.max(repLow, clampInt(r.repHigh, 1, 999, repLow));
    items.push({ exerciseId: id, sets, repLow, repHigh });
  }
  if (!items.length) return null;

  const trim = (v: unknown, max: number, fallback: string): string =>
    typeof v === "string" && v.trim() ? v.trim().slice(0, max) : fallback;

  return {
    name: trim(obj.name, 60, "Coach-Einheit"),
    focus: trim(obj.focus, 40, "Ganzkörper"),
    items,
  };
}
