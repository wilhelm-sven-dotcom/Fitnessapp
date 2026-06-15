import { isFilled, oneRm, workSets } from "@/lib/stats";
import { MUSCLE_LABEL, type MuscleVolume } from "@/lib/volume";
import type { AppSettings, Exercise, LoggedSession } from "@/lib/types";

export type CoachKind =
  | "deload"
  | "plateau"
  | "volume-over"
  | "back-doctor";
export type CoachSeverity = "info" | "warn" | "urgent";

export interface CoachCard {
  kind: CoachKind;
  severity: CoachSeverity;
  title: string;
  body: string;
  exId?: string;
  action?: "deload";
}

const DAY = 86400000;
function weeksSince(dateIso?: string): number {
  if (!dateIso) return Infinity;
  return (Date.now() - new Date(dateIso).getTime()) / (7 * DAY);
}

/** Multi-week fatigue → suggest a deload week (fires on ≥ 2 concurrent signals). */
export function deloadSignal(
  log: LoggedSession[],
  settings: AppSettings,
): CoachCard | null {
  if (weeksSince(settings.lastDeloadDate) < 2) return null;
  const now = Date.now();
  const recent = log.filter((s) => now - new Date(s.date).getTime() < 14 * DAY);
  let signals = 0;

  if (recent.filter((s) => s.backTraffic === "red").length >= 2) signals++;

  const rirs = recent.flatMap((s) =>
    s.exercises.flatMap((e) =>
      workSets(e.sets)
        .map((st) => st.rir)
        .filter((x): x is number => x != null),
    ),
  );
  if (rirs.length >= 4 && rirs.reduce((a, b) => a + b, 0) / rirs.length >= 3)
    signals++;

  if (weeksSince(settings.lastDeloadDate) >= 6 && log.length >= 9) signals++;

  if (signals < 2) return null;
  return {
    kind: "deload",
    severity: "warn",
    title: "Zeit für eine Entlastungswoche",
    body: "Mehrere Zeichen für Ermüdung. Eine leichtere Woche (~60 % Last, ein Satz weniger) bringt dich stärker zurück.",
    action: "deload",
  };
}

/** Per-exercise stall: no estimated-1RM gain over the last 3 sessions. */
export function plateauSignals(
  log: LoggedSession[],
  allLib: Exercise[],
): CoachCard[] {
  const byId = new Map(allLib.map((e) => [e.id, e]));
  const hist: Record<string, number[]> = {};
  log.forEach((s) =>
    s.exercises.forEach((e) => {
      const ex = byId.get(e.id);
      if (!ex || !ex.weighted) return;
      const sets = workSets(e.sets).filter(isFilled);
      if (!sets.length) return;
      const best = Math.max(
        ...sets.map((st) => oneRm(Number(st.weight) || 0, Number(st.reps) || 0)),
      );
      (hist[e.id] ??= []).push(best);
    }),
  );
  const cards: CoachCard[] = [];
  for (const [id, arr] of Object.entries(hist)) {
    if (arr.length < 4) continue;
    const recentBest = Math.max(...arr.slice(-3));
    const priorBest = Math.max(...arr.slice(0, -3));
    if (recentBest <= priorBest) {
      const ex = byId.get(id)!;
      cards.push({
        kind: "plateau",
        severity: "info",
        exId: id,
        title: `${ex.name} stagniert`,
        body: "Seit drei Einheiten kein Fortschritt — wechsle das Wdh-Schema oder probier eine Variante.",
      });
    }
  }
  return cards.slice(0, 2);
}

const SEV_RANK: Record<CoachSeverity, number> = { urgent: 0, warn: 1, info: 2 };

export function coachCards(opts: {
  log: LoggedSession[];
  allLib: Exercise[];
  settings: AppSettings;
  seeDoctor: boolean;
  muscleVolumes: MuscleVolume[];
}): CoachCard[] {
  const cards: CoachCard[] = [];

  if (opts.seeDoctor)
    cards.push({
      kind: "back-doctor",
      severity: "urgent",
      title: "Rücken zweimal in Folge gereizt",
      body: "Nimm das ernst — sprich mit Arzt oder Physio, bevor du wieder schwer trainierst. Heute lieber nur Stabis und Mobilität.",
    });

  const d = deloadSignal(opts.log, opts.settings);
  if (d) cards.push(d);

  cards.push(...plateauSignals(opts.log, opts.allLib));

  opts.muscleVolumes
    .filter((v) => v.status === "over")
    .forEach((v) =>
      cards.push({
        kind: "volume-over",
        severity: "info",
        title: `${MUSCLE_LABEL[v.muscle]} über Ziel`,
        body: `${v.sets} Sätze diese Woche — etwas zurücknehmen, damit die Erholung reicht.`,
      }),
    );

  return cards.sort((a, b) => SEV_RANK[a.severity] - SEV_RANK[b.severity]);
}
