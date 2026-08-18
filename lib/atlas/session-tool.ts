import type Anthropic from "@anthropic-ai/sdk";
import type { PlannedExercise, SessionVariant } from "@/lib/session-model";

/**
 * Tool-Vertrag der täglichen Einheiten-Komposition. Evolution des früheren
 * `build_session`: zusätzlich pro Übung `why` (Warum heute?) und `intro`
 * (Coach-Ansage beim Start) sowie ein Session-`briefing` — so bekommt jede
 * Übung ATLAS-Coaching OHNE weitere API-Calls zur Laufzeit.
 */
export const BUILD_DAILY_SESSION_TOOL: Anthropic.Tool = {
  name: "build_daily_session",
  description:
    "Stelle die heutige Trainingseinheit zusammen: Name, Fokus, ein kurzes Briefing (warum die Einheit heute so aussieht) und die geordnete Übungsliste. Wähle Übungen ausschließlich über ihre exakte id aus der erlaubten Liste. Zu jeder Übung: Sätze, Wiederholungs-Spanne, ein kurzes Warum (bezogen auf Historie/Bedarf) und eine kurze Ansage für den Start der Übung.",
  input_schema: {
    type: "object",
    properties: {
      name: {
        type: "string",
        description: "Kurzer, konkreter Name, z. B. „Ganzkörper · Zug-Fokus”.",
      },
      focus: {
        type: "string",
        description: "Fokus in 1–3 Wörtern, z. B. „Rücken & Schultern”.",
      },
      briefing: {
        type: "string",
        description:
          "2–3 Sätze an den Athleten: warum diese Einheit heute so aussieht (Bedarf, Erholung, Tagesform). Max 400 Zeichen.",
      },
      items: {
        type: "array",
        description:
          "Übungen in Trainingsreihenfolge — große, komplexe zuerst, Isolation und Core danach.",
        items: {
          type: "object",
          properties: {
            exerciseId: {
              type: "string",
              description: "Exakte id aus der erlaubten Liste.",
            },
            sets: { type: "integer", description: "Arbeitssätze, 1 bis 6." },
            repLow: { type: "integer", description: "Untere Wdh-/Sekunden-Grenze, ≥ 1." },
            repHigh: { type: "integer", description: "Obere Grenze, ≥ repLow." },
            why: {
              type: "string",
              description:
                "Ein Satz: warum DIESE Übung heute (Bedarf, Abwechslung, Schwachstelle). Max 140 Zeichen.",
            },
            intro: {
              type: "string",
              description:
                "Ansage beim Start der Übung: worauf heute achten, was zählt. Max 200 Zeichen.",
            },
          },
          required: ["exerciseId", "sets", "repLow", "repHigh", "why", "intro"],
          additionalProperties: false,
        },
      },
    },
    required: ["name", "focus", "briefing", "items"],
    additionalProperties: false,
  },
  strict: true,
};

const clampInt = (v: unknown, lo: number, hi: number, fallback: number): number => {
  const n = Math.round(Number(v));
  if (!Number.isFinite(n)) return fallback;
  return Math.max(lo, Math.min(hi, n));
};

const trim = (v: unknown, max: number, fallback: string): string =>
  typeof v === "string" && v.trim() ? v.trim().slice(0, max) : fallback;

const MAX_ITEMS = 10;
const MIN_ITEMS = 3;

export interface SanitizedDailySession {
  name: string;
  focus: string;
  briefing: string;
  items: PlannedExercise[];
}

/**
 * Server-seitige Härtung hinter dem forced tool call: ID-Allowlist, Dedupe,
 * Clamps, String-Caps. `null`, wenn zu wenig Brauchbares übrig bleibt — der
 * Client fällt dann auf den deterministischen Generator zurück.
 */
export function sanitizeDailySession(
  raw: unknown,
  allowedIds: Set<string> | string[],
  variant: SessionVariant = "normal",
): SanitizedDailySession | null {
  if (!raw || typeof raw !== "object") return null;
  const allowed = allowedIds instanceof Set ? allowedIds : new Set(allowedIds);
  const obj = raw as Record<string, unknown>;
  const rawItems = Array.isArray(obj.items) ? obj.items : [];

  const seen = new Set<string>();
  const items: PlannedExercise[] = [];
  for (const it of rawItems) {
    if (items.length >= MAX_ITEMS) break;
    if (!it || typeof it !== "object") continue;
    const r = it as Record<string, unknown>;
    const id = typeof r.exerciseId === "string" ? r.exerciseId : "";
    if (!allowed.has(id) || seen.has(id)) continue;
    seen.add(id);
    const repLow = clampInt(r.repLow, 1, 999, 8);
    items.push({
      id: `i${items.length + 1}`,
      exerciseId: id,
      sets: clampInt(r.sets, 1, 6, 3),
      repLow,
      repHigh: Math.max(repLow, clampInt(r.repHigh, 1, 999, repLow)),
      why: trim(r.why, 140, "Gehört heute in den Plan."),
      intro: trim(r.intro, 200, "Sauber und kontrolliert — Qualität vor Last."),
    });
  }
  if (items.length < (variant === "reset" ? 2 : MIN_ITEMS)) return null;

  return {
    name: trim(obj.name, 60, "Deine Einheit"),
    focus: trim(obj.focus, 40, "Ganzkörper"),
    briefing: trim(obj.briefing, 400, ""),
    items,
  };
}
