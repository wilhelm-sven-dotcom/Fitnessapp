import type Anthropic from "@anthropic-ai/sdk";
import type { CoachExercise } from "@/lib/coach-session";
import { reqOk } from "@/lib/progression";
import { prTimeline } from "@/lib/records";
import { isFilled, oneRm, workSets } from "@/lib/stats";
import type { Exercise, LoggedSession } from "@/lib/types";
import type { MuscleVolume } from "@/lib/volume";

/**
 * ATLAS-KI-Wochenplanung: Claude plant die drei Einheiten A/B/C der Woche
 * wirklich individuell (Übungswahl, Sätze, Schwerpunkte) auf Basis des
 * Verlaufs. Der Plan ist NUR eine Auswahl-Schicht — alle Sicherheitsnetze
 * der Engine (Readiness, Zeitbudget, Deload, Rücken-Ampel) laufen danach
 * unverändert; offline oder ohne API-Key greift das Regelwerk wie bisher.
 */

export interface WeekPlanSlot {
  exerciseId: string;
  sets: number;
}

export interface WeekPlanDay {
  slots: WeekPlanSlot[];
  /** Ein Satz: worauf dieser Tag diese Woche zielt. */
  focusNote: string;
}

export interface WeekPlan {
  /** Montag der geplanten Woche (weekKeyOf-Format "2026-07-06"). */
  weekKey: string;
  days: Partial<Record<"A" | "B" | "C", WeekPlanDay>>;
  /** Zwei, drei Sätze: die Idee der Woche. */
  weekNote: string;
  createdAt: string;
}

const DAY_SCHEMA = {
  type: "object" as const,
  properties: {
    slots: {
      type: "array" as const,
      description:
        "4 bis 6 Übungen in Trainingsreihenfolge — große, komplexe zuerst, Isolation und Core danach.",
      items: {
        type: "object" as const,
        properties: {
          exerciseId: {
            type: "string" as const,
            description: "Die id genau einer Übung aus der vorgegebenen Liste.",
          },
          sets: { type: "integer" as const, description: "Arbeitssätze, 2 bis 5." },
        },
        required: ["exerciseId", "sets"],
        additionalProperties: false,
      },
    },
    focusNote: {
      type: "string" as const,
      description: "Ein kurzer Satz: worauf dieser Tag diese Woche zielt.",
    },
  },
  required: ["slots", "focusNote"],
  additionalProperties: false,
};

export const PLAN_WEEK_TOOL: Anthropic.Tool = {
  name: "plan_week",
  description:
    "Plane die Trainingswoche: drei Ganzkörper-Einheiten A, B und C mit je 4 bis 6 Übungen (nur exakte ids aus der vorgegebenen Liste), Arbeitssätzen und einem Tages-Fokus, dazu eine kurze Wochen-Notiz. Die Tage sollen sich spürbar unterscheiden (verschiedene Übungen je Bewegungsmuster), Schwächen aus den Trainingsdaten adressieren und jede Einheit als Ganzkörper funktionieren.",
  input_schema: {
    type: "object",
    properties: {
      A: DAY_SCHEMA,
      B: DAY_SCHEMA,
      C: DAY_SCHEMA,
      weekNote: {
        type: "string",
        description:
          "Zwei bis drei Sätze an den Athleten: die Idee dieser Woche, direkt und konkret.",
      },
    },
    required: ["A", "B", "C", "weekNote"],
    additionalProperties: false,
  },
  strict: true,
};

/** System prompt: Coach-Rolle, erlaubte Übungen, Planungs-Regeln. */
export function buildWeekSystem(exercises: CoachExercise[], budgetMin: number): string {
  const list = exercises.map((e) => `- ${e.id} · ${e.name} · ${e.pattern}`).join("\n");
  return [
    "Du bist ATLAS, der persönliche Kraft-Coach dieser Trainings-App. Du planst die laufende Trainingswoche: drei Ganzkörper-Einheiten A, B, C.",
    "Regeln:",
    `- Zeitbudget je Einheit: etwa ${budgetMin} Minuten — wähle die Zahl der Übungen entsprechend (4 bis 6).`,
    "- Nutze AUSSCHLIESSLICH Übungen aus der Liste unten, referenziert über ihre exakte id.",
    "- Jede Einheit ist ein Ganzkörper-Tag: mindestens ein Bein-Muster (squat/lunge/hinge), ein Drücken, ein Ziehen, dazu Core.",
    "- Die drei Tage sollen sich spürbar unterscheiden: gleiche Muster, andere Übungen oder andere Schwerpunkte.",
    "- Adressiere, was die Trainingsdaten zeigen (unterversorgte Muskeln, Plateaus, einseitige Auswahl).",
    "- Verletzungen/Hinweise im Kontext strikt respektieren.",
    "- Hilfsmittel-Notizen je Übung im Kontext beachten (z. B. Unterstützungsband = assistierte, leichtere Ausführung).",
    "- Sätze pro Übung: 2 bis 5.",
    "",
    "Verfügbare Übungen (id · Name · Muster):",
    list,
  ].join("\n");
}

/** Erlaubte Übungen fürs aktive Gym — die KI darf nur diese ids wählen. */
export function allowedExercises(
  allLib: Exercise[],
  has: (k: string) => boolean,
): CoachExercise[] {
  return allLib
    .filter((e) => e.pattern !== "cardio" && reqOk(e, has))
    .map((e) => ({ id: e.id, name: e.name, pattern: e.pattern }));
}

/** Kompakter Trainings-Kontext für den Planer (letzte ~12 Einheiten). */
export function buildWeekContext(input: {
  log: LoggedSession[];
  muscleVolumes: MuscleVolume[];
  injuries: string[];
  budgetMin: number;
  /** Übungs-Id → Hilfsmittel-Notiz (z. B. „Unterstützungsband"). */
  exerciseNotes?: Record<string, string>;
}): string {
  const recent = input.log.slice(-12);
  const byEx = new Map<string, { name: string; best: number; label: string; times: number }>();
  for (const s of recent) {
    for (const ex of s.exercises || []) {
      const sets = workSets(ex.sets || []).filter(isFilled);
      if (!sets.length) continue;
      let best = 0;
      let label = "";
      for (const st of sets) {
        const w = Number(st.weight) || 0;
        const r = Number(st.reps) || 0;
        const m = w > 0 ? oneRm(w, r) : r;
        if (m > best) {
          best = m;
          label = w > 0 ? `${w} kg × ${r}` : `${r} Wdh`;
        }
      }
      const prev = byEx.get(ex.id);
      byEx.set(ex.id, {
        name: ex.name,
        best: Math.max(best, prev?.best ?? 0),
        label: prev && prev.best > best ? prev.label : label,
        times: (prev?.times ?? 0) + 1,
      });
    }
  }
  const exLines = [...byEx.entries()]
    .map(([id, v]) => `- ${id} (${v.name}): ${v.times}× trainiert, Bestwert ${v.label}`)
    .join("\n");
  const volLines = input.muscleVolumes
    .filter((m) => m.sets > 0)
    .map((m) => `- ${m.muscle}: ${m.sets} Sätze/Woche`)
    .join("\n");
  const fourWeeks = Date.now() - 28 * 86400000;
  const prs = prTimeline(input.log)
    .filter((e) => new Date(e.date).getTime() >= fourWeeks)
    .slice(0, 8)
    .map((e) => `- ${e.name}: ${e.label}`)
    .join("\n");
  const noteLines = input.exerciseNotes
    ? Object.entries(input.exerciseNotes)
        .filter(([, v]) => v && v.trim())
        .map(([id, v]) => `- ${byEx.get(id)?.name ?? id}: ${v.trim()}`)
        .join("\n")
    : "";
  return [
    `Zeitbudget je Einheit: ~${input.budgetMin} Minuten.`,
    input.injuries.length
      ? `Einschränkungen (strikt beachten): ${input.injuries.join(", ")}.`
      : "Keine gemeldeten Einschränkungen.",
    "",
    `Letzte ${recent.length} Einheiten — Übungen und Bestwerte:`,
    exLines || "- noch keine Kraftdaten",
    "",
    "Wochenvolumen je Muskel:",
    volLines || "- noch keine Daten",
    "",
    "Rekorde der letzten 4 Wochen:",
    prs || "- keine",
    ...(noteLines
      ? ["", "Hilfsmittel je Übung (vom Athleten hinterlegt, beim Planen beachten):", noteLines]
      : []),
  ].join("\n");
}

const cap = (s: unknown, n: number) => (typeof s === "string" ? s.trim().slice(0, n) : "");

/**
 * Serverseitige Härtung der Modell-Ausgabe: nur bekannte Übungs-ids,
 * Sätze 2..5, 3..7 Slots je Tag (sonst fällt der Tag weg und das Regelwerk
 * übernimmt ihn), Notizen gekappt. Gibt null zurück, wenn kein Tag brauchbar
 * ist.
 */
export function sanitizeWeekPlan(
  input: unknown,
  allowedIds: string[],
  weekKey: string,
): WeekPlan | null {
  if (!input || typeof input !== "object") return null;
  const src = input as Record<string, unknown>;
  const allowed = new Set(allowedIds);
  const days: WeekPlan["days"] = {};
  for (const key of ["A", "B", "C"] as const) {
    const day = src[key];
    if (!day || typeof day !== "object") continue;
    const rawSlots = (day as { slots?: unknown }).slots;
    if (!Array.isArray(rawSlots)) continue;
    const seen = new Set<string>();
    const slots: WeekPlanSlot[] = [];
    for (const s of rawSlots) {
      if (!s || typeof s !== "object") continue;
      const id = (s as { exerciseId?: unknown }).exerciseId;
      const sets = Number((s as { sets?: unknown }).sets);
      if (typeof id !== "string" || !allowed.has(id) || seen.has(id)) continue;
      seen.add(id);
      slots.push({ exerciseId: id, sets: Math.max(2, Math.min(5, Math.round(sets) || 3)) });
    }
    if (slots.length < 3 || slots.length > 7) continue;
    days[key] = { slots, focusNote: cap((day as { focusNote?: unknown }).focusNote, 160) };
  }
  if (!Object.keys(days).length) return null;
  return {
    weekKey,
    days,
    weekNote: cap(src.weekNote, 400),
    createdAt: new Date().toISOString(),
  };
}
