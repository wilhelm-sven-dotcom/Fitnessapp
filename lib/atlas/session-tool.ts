import type { PlannedExercise, SessionVariant } from "@/lib/session-model";

/**
 * Form der täglichen Einheit, wie ATLAS sie liefert (`output_config.format`).
 * Zu jeder Übung gehören `why` (warum heute) und `intro` (Ansage beim Start)
 * sowie ein `briefing` für die ganze Einheit — so bekommt jede Übung ihren
 * ATLAS-Satz ohne weitere Anfrage während des Trainings.
 *
 * Das Schema sichert die FORM. Die Werte prüft `sanitizeDailySession`
 * (erlaubte Ids, Grenzen, Längen). Zahlen- und Längengrenzen stehen nur in
 * den Beschreibungen: strukturierte Ausgabe kennt kein `minimum`/`maxLength`.
 * Die Längen sind keine Stilvorgabe, sondern Platz in der Oberfläche; was
 * länger ist, schneidet der Sanitizer ab.
 */
export const DAILY_SESSION_SCHEMA: Record<string, unknown> = {
  type: "object",
  properties: {
    name: {
      type: "string",
      description: "Kurzer, konkreter Name der Einheit, zum Beispiel „Ganzkörper · Zug“. Höchstens 60 Zeichen.",
    },
    focus: {
      type: "string",
      description: "Schwerpunkt in ein bis drei Wörtern, zum Beispiel „Rücken & Schultern“.",
    },
    briefing: {
      type: "string",
      description:
        "Zwei bis drei Sätze an den Athleten: warum die Einheit heute so aussieht (Bedarf, Erholung, Tagesform). Höchstens 400 Zeichen, die App zeigt es in einer Sprechblase.",
    },
    items: {
      type: "array",
      description:
        "Übungen in der Reihenfolge des Trainings: große, mehrgelenkige zuerst, eingelenkige und Rumpf danach.",
      items: {
        type: "object",
        properties: {
          exerciseId: {
            type: "string",
            description: "Exakte id aus der Liste der heute verfügbaren Übungen.",
          },
          sets: { type: "integer", description: "Arbeitssätze, 1 bis 6." },
          repLow: {
            type: "integer",
            description: "Untere Grenze der Wiederholungen (bei Halteübungen Sekunden), mindestens 1.",
          },
          repHigh: { type: "integer", description: "Obere Grenze, mindestens so groß wie repLow." },
          why: {
            type: "string",
            description:
              "Ein Satz mit dem konkreten Grund für diese Übung heute: Rückstand in der Woche, Tage seit dem letzten Reiz, Wunsch, Rücken. Höchstens 140 Zeichen.",
          },
          intro: {
            type: "string",
            description:
              "Ansage beim Start der Übung: worauf es bei ihr heute ankommt. Höchstens 200 Zeichen.",
          },
        },
        required: ["exerciseId", "sets", "repLow", "repHigh", "why", "intro"],
        additionalProperties: false,
      },
    },
  },
  required: ["name", "focus", "briefing", "items"],
  additionalProperties: false,
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
 * Serverseitige Härtung der Antwort: nur erlaubte Ids, keine Dubletten,
 * Zahlen in ihren Grenzen, Texte gekappt. `null`, wenn zu wenig Brauchbares
 * übrig bleibt — die App bleibt dann beim Basisplan.
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
      intro: trim(r.intro, 200, "Sauber und kontrolliert. Qualität vor Last."),
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
