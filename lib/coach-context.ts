import { isFilled, oneRm, sessionVolume, workSets } from "@/lib/stats";
import { MUSCLE_LABEL, weeklyMuscleVolume } from "@/lib/volume";
import type { BodyMetric, Exercise, LoggedSession, TrafficLight } from "@/lib/types";

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

/**
 * Compact, token-limited training summary for the KI-Coach system prompt.
 * Pure — derived entirely from the user's own log/body. Kept short (last few
 * sessions, weekly volume, top lifts, weight trend) so the prompt stays cheap.
 */
export function buildCoachContext(opts: {
  log: LoggedSession[];
  allLib: Exercise[];
  body: BodyMetric[];
}): string {
  const { log, allLib, body } = opts;
  if (!log.length) return "Noch keine Einheiten protokolliert.";

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
    lines.push(
      `- ${fmtDate(s.date)} ${s.dayName} (${s.focus})${back}${dl} · Volumen ${Math.round(sessionVolume(s))}`,
    );
  });

  const vols = weeklyMuscleVolume(log, allLib);
  lines.push("", "Wochenvolumen je Muskel (Arbeitssätze):");
  lines.push(
    vols
      .map((v) => `${MUSCLE_LABEL[v.muscle]} ${v.sets} (${STATUS_DE[v.status]})`)
      .join(", "),
  );

  // Strongest estimated 1RMs across all history.
  const best: Record<string, { name: string; e1rm: number }> = {};
  log.forEach((s) =>
    s.exercises.forEach((e) =>
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

  const bw = body.filter((b) => b.weightKg != null);
  if (bw.length) {
    const first = bw[0].weightKg as number;
    const last = bw[bw.length - 1].weightKg as number;
    const d = Math.round((last - first) * 10) / 10;
    lines.push("", `Körpergewicht: aktuell ${last} kg (${d >= 0 ? "+" : ""}${d} kg seit Start).`);
  }

  return lines.join("\n");
}
