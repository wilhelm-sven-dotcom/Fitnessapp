import { cardioAdvice } from "@/lib/cardio-advice";
import { hoursSince, lastRide, weeklyCardio } from "@/lib/cardio";
import { intensityLabel, kmLabel, sportLabel } from "@/lib/cardio-sport";
import { isFilled, oneRm, sessionVolume, workSets } from "@/lib/stats";
import { VOLUME_LANDMARKS } from "@/lib/training-science";
import { MUSCLE_LABEL, underservedMuscles, weeklyMuscleVolume } from "@/lib/volume";
import type {
  BodyMetric,
  CardioSession,
  Exercise,
  LoggedSession,
  TrafficLight,
} from "@/lib/types";

const BACK_DE: Record<TrafficLight, string> = {
  green: "grün",
  yellow: "gelb",
  red: "rot",
};
const STATUS_DE = { under: "unter Ziel", in: "im Ziel", over: "über Ziel" } as const;

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
  });
}

/** Die tatsächlich geplante nächste Einheit — exakt das, was der Athlet beim
 *  Trainingsstart sieht (inkl. KI-Wochenplan, Zeitbudget, Readiness). */
export interface NextSessionInfo {
  name: string;
  focus?: string;
  estimatedMin?: number;
  /** Übungen in Trainingsreihenfolge; sets ≤ 0 = ohne Satzangabe (Cardio). */
  exercises: { name: string; sets: number }[];
}

function nextSessionLines(n: NextSessionInfo): string[] {
  return [
    "",
    `Nächste geplante Einheit: ${n.name}${n.focus ? ` (${n.focus})` : ""}${n.estimatedMin ? ` · ~${n.estimatedMin} Min` : ""}. Übungen in dieser Reihenfolge:`,
    n.exercises
      .map((e) => (e.sets > 0 ? `${e.name} (${e.sets} Sätze)` : e.name))
      .join(", "),
  ];
}

/**
 * Compact, token-limited training summary for the KI-Coach system prompt.
 * Pure — derived entirely from the user's own log/body. Kept short (last few
 * sessions, weekly volume, top lifts, weight trend) so the prompt stays cheap.
 */
export function buildCoachContext(opts: {
  log: LoggedSession[];
  allLib: Exercise[];
  body: BodyMetric[];
  cardio: CardioSession[];
  nextSession?: NextSessionInfo;
  /** Übungs-Id → Hilfsmittel-Notiz (z. B. „Unterstützungsband"). */
  exerciseNotes?: Record<string, string>;
}): string {
  const { log, allLib, body, cardio, nextSession, exerciseNotes } = opts;
  if (!log.length && !cardio.length) {
    return [
      "Noch keine Einheiten protokolliert.",
      ...(nextSession?.exercises.length ? nextSessionLines(nextSession) : []),
    ].join("\n");
  }

  const lines: string[] = [];

  // Frequency this week (Monday-based, same as the home rings).
  const now = new Date();
  const off = (now.getDay() + 6) % 7;
  const mon = new Date(now);
  mon.setHours(0, 0, 0, 0);
  mon.setDate(now.getDate() - off);
  const weekCount = log.filter((s) => new Date(s.date) >= mon).length;
  lines.push(
    `Diese Woche: ${weekCount} von 3 Einheiten. Insgesamt ${log.length} protokolliert.`,
  );

  lines.push("", "Letzte Einheiten:");
  log.slice(-5).forEach((s) => {
    const back = s.backTraffic ? ` · Rücken ${BACK_DE[s.backTraffic]}` : "";
    const dl = s.isDeload ? " · Entlastung" : "";
    const rs = s.isBackReset ? " · Rücken-Reset (gewichtsfrei)" : "";
    lines.push(
      `- ${fmtDate(s.date)} ${s.dayName} (${s.focus})${back}${dl}${rs} · Volumen ${Math.round(sessionVolume(s))}`,
    );
  });

  const vols = weeklyMuscleVolume(log, allLib);
  lines.push(
    "",
    `Wochenvolumen je Muskel (Arbeitssätze; Wachstumsziel ${VOLUME_LANDMARKS.target}–${VOLUME_LANDMARKS.mav}):`,
  );
  lines.push(
    vols
      .map((v) => `${MUSCLE_LABEL[v.muscle]} ${v.sets} (${STATUS_DE[v.status]})`)
      .join(", "),
  );
  const under = underservedMuscles(vols);
  if (under.length)
    lines.push(
      `Unter Ziel, beim Planen bevorzugen: ${under.map((v) => MUSCLE_LABEL[v.muscle]).join(", ")}.`,
    );

  // Strongest estimated 1RMs across all history.
  const best: Record<string, { name: string; e1rm: number }> = {};
  log.forEach((s) =>
    (s.exercises ?? []).forEach((e) =>
      workSets(e.sets)
        .filter(isFilled)
        .forEach((st) => {
          const w = Number(st.weight) || 0;
          if (w <= 0) return;
          const e1 = oneRm(w, Number(st.reps) || 0);
          if (!best[e.id] || e1 > best[e.id].e1rm) best[e.id] = { name: e.name, e1rm: e1 };
        }),
    ),
  );
  const tops = Object.values(best)
    .sort((a, b) => b.e1rm - a.e1rm)
    .slice(0, 5);
  if (tops.length) {
    lines.push("", "Stärkste Schätz-1RM:");
    lines.push(tops.map((t) => `${t.name} ~${Math.round(t.e1rm)} kg`).join(", "));
  }

  // Vom Athleten hinterlegte Hilfsmittel je Übung — der Coach muss sie kennen
  // (z. B. „Unterstützungsband" = assistierte, leichtere Ausführung).
  if (exerciseNotes && Object.keys(exerciseNotes).length) {
    const nameById = new Map(allLib.map((e) => [e.id, e.name]));
    const notes = Object.entries(exerciseNotes)
      .filter(([, v]) => v && v.trim())
      .map(([id, v]) => `${nameById.get(id) ?? id}: ${v.trim()}`);
    if (notes.length) {
      lines.push(
        "",
        "Hilfsmittel je Übung (bei Empfehlungen und Lastvergleichen berücksichtigen):",
        notes.join("; "),
      );
    }
  }

  const bw = body.filter((b) => b.weightKg != null);
  if (bw.length) {
    const first = bw[0].weightKg as number;
    const last = bw[bw.length - 1].weightKg as number;
    const d = Math.round((last - first) * 10) / 10;
    lines.push("", `Körpergewicht: aktuell ${last} kg (${d >= 0 ? "+" : ""}${d} kg seit Start).`);
  }

  if (cardio.length) {
    const wk = weeklyCardio(cardio);
    lines.push("", "Ausdauer:");
    const wkDist = wk.distance ? ` · ${kmLabel(wk.distance)}` : "";
    const wkCal = wk.calories ? ` · ${wk.calories} kcal` : "";
    lines.push(
      `Diese Woche: ${wk.count} Einheiten · ${wk.minutes} Min${wkDist} · ${wk.kj} kJ${wkCal}.`,
    );
    const lr = lastRide(cardio);
    if (lr) {
      const h = Math.round(hoursSince(lr.date));
      const km = lr.distance ? ` · ${kmLabel(lr.distance)}` : "";
      const kj = lr.kj != null ? ` · ${lr.kj} kJ` : "";
      const cal = lr.calories ? ` · ${lr.calories} kcal` : "";
      lines.push(
        `Letzte Einheit: ${sportLabel(lr.sport)}, vor ${h} h · ${Math.round(lr.durationSec / 60)} Min${km}${kj}${cal} (${intensityLabel(lr.intensity)})${lr.title ? ` — ${lr.title}` : ""}.`,
      );
    }
  }

  const ca = cardioAdvice(cardio);
  if (ca.level !== "none")
    lines.push("", `Trainings-Hinweis (Cardio-Interferenz): ${ca.title}.`);

  if (nextSession?.exercises.length) lines.push(...nextSessionLines(nextSession));

  return lines.join("\n");
}
