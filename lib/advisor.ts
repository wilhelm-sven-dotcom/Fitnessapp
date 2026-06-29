import { cardioAdvice } from "@/lib/cardio-advice";
import type { FatigueBand } from "@/lib/fatigue";
import { isFilled, oneRm, workSets } from "@/lib/stats";
import { VOLUME_LANDMARKS, volumeBucket } from "@/lib/training-science";
import { MUSCLE_LABEL, muscleOf, type MuscleVolume, weekStartMon } from "@/lib/volume";
import type {
  AppSettings,
  BodyMetric,
  CardioSession,
  Exercise,
  LoggedSession,
  Muscle,
} from "@/lib/types";

export type CoachKind =
  | "deload"
  | "plateau"
  | "volume-over"
  | "volume-under"
  | "back-doctor"
  | "cardio"
  | "recomp"
  | "volume-bump";
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

/**
 * Multi-week fatigue → suggest a deload week. Fires on ≥ 2 concurrent signals,
 * when the Belastungs-Index is "hoch", or on the 6-week cadence (overdue) — but
 * never within 2 weeks of the last deload.
 */
export function deloadSignal(
  log: LoggedSession[],
  settings: AppSettings,
  fatigueBand?: FatigueBand,
): CoachCard | null {
  const wks = weeksSince(settings.lastDeloadDate);
  if (wks < 2) return null;
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

  if (wks >= 6 && log.length >= 9) signals++;
  if (fatigueBand === "hoch") signals++;

  const overdue = wks >= 6 && log.length >= 9;
  if (signals < 2 && !overdue) return null;
  return {
    kind: "deload",
    severity: "warn",
    title: "Zeit für eine Entlastungswoche",
    body: overdue
      ? "Über sechs Wochen ohne Deload. Eine leichtere Woche (~60 % Last, ein Satz weniger) bringt dich stärker zurück."
      : "Mehrere Zeichen für Ermüdung. Eine leichtere Woche (~60 % Last, ein Satz weniger) bringt dich stärker zurück.",
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

/**
 * Body recomposition read from the weight + waist trend (Optik/Definition focus).
 * Needs ≥ 2 entries of each, spanning ≥ 2 weeks, so it reflects a real trend.
 */
export function recompSignal(body: BodyMetric[]): CoachCard | null {
  const wts = body.filter((b) => b.weightKg != null);
  const wsts = body.filter((b) => b.waistCm != null);
  if (wts.length < 2 || wsts.length < 2) return null;
  const spanDays =
    (new Date(wts[wts.length - 1].date).getTime() - new Date(wts[0].date).getTime()) / DAY;
  if (spanDays < 14) return null;
  const dW = (wts[wts.length - 1].weightKg as number) - (wts[0].weightKg as number);
  const dWaist = (wsts[wsts.length - 1].waistCm as number) - (wsts[0].waistCm as number);
  const f = (n: number) => `${n >= 0 ? "+" : ""}${Math.round(n * 10) / 10}`;
  if (dW >= 0.5 && dWaist <= -0.5)
    return {
      kind: "recomp",
      severity: "info",
      title: "Recomp läuft",
      body: `Gewicht ${f(dW)} kg, Bauch ${f(dWaist)} cm — du baust Muskeln auf und wirst schlanker. Genau die Richtung, weiter so.`,
    };
  if (dW >= 1 && dWaist >= 1)
    return {
      kind: "recomp",
      severity: "info",
      title: "Überschuss im Blick",
      body: `Gewicht ${f(dW)} kg, Bauch ${f(dWaist)} cm — der Zuwachs geht auch in die Taille. Etwas weniger Kalorienüberschuss hält den Aufbau definierter.`,
    };
  if (dW <= -0.5 && dWaist <= -0.5)
    return {
      kind: "recomp",
      severity: "info",
      title: "Du definierst",
      body: `Gewicht ${f(dW)} kg, Bauch ${f(dWaist)} cm — halt das Krafttraining schwer, damit die Muskeln beim Abnehmen geschützt bleiben.`,
    };
  return null;
}

/**
 * Stalled lifts whose primary muscle still has room below the productive max →
 * suggest adding a set. Individual variability: when progress stalls, more volume
 * often breaks it. A suggestion (info), never an automatic change.
 */
export function volumeBumpSignal(
  plateaus: CoachCard[],
  allLib: Exercise[],
  vols: MuscleVolume[],
): CoachCard | null {
  if (!plateaus.length) return null;
  const byId = new Map(allLib.map((e) => [e.id, e]));
  const volBy = new Map(vols.map((v) => [v.muscle, v.sets]));
  const muscles = new Set<Muscle>();
  for (const p of plateaus) {
    const ex = p.exId ? byId.get(p.exId) : undefined;
    if (!ex) continue;
    const m = muscleOf(ex).primary;
    const b = volumeBucket(volBy.get(m) ?? 0);
    if (b === "maintain" || b === "optimal") muscles.add(m);
  }
  if (!muscles.size) return null;
  return {
    kind: "volume-bump",
    severity: "info",
    title: "Plateau? Mehr Volumen testen",
    body: `${[...muscles]
      .map((m) => MUSCLE_LABEL[m])
      .join(", ")} stagniert trotz solidem Volumen — häng pro Übung einen Satz dran. Wenn der Fortschritt stockt, reagiert oft mehr Volumen.`,
  };
}

const SEV_RANK: Record<CoachSeverity, number> = { urgent: 0, warn: 1, info: 2 };

export function coachCards(opts: {
  log: LoggedSession[];
  allLib: Exercise[];
  settings: AppSettings;
  seeDoctor: boolean;
  muscleVolumes: MuscleVolume[];
  cardio: CardioSession[];
  body: BodyMetric[];
  fatigueBand?: FatigueBand;
}): CoachCard[] {
  const cards: CoachCard[] = [];

  const rc = recompSignal(opts.body);
  if (rc) cards.push(rc);

  const ca = cardioAdvice(opts.cardio);
  if (ca.level !== "none")
    cards.push({
      kind: "cardio",
      severity: ca.level === "spare" ? "warn" : "info",
      title: ca.title,
      body: ca.body,
    });

  if (opts.seeDoctor)
    cards.push({
      kind: "back-doctor",
      severity: "urgent",
      title: "Rücken zweimal in Folge gereizt",
      body: "Nimm das ernst — sprich mit Arzt oder Physio, bevor du wieder schwer trainierst. Heute lieber nur Stabis und Mobilität.",
    });

  const d = deloadSignal(opts.log, opts.settings, opts.fatigueBand);
  if (d) cards.push(d);

  const plateaus = plateauSignals(opts.log, opts.allLib);
  cards.push(...plateaus);
  const bump = volumeBumpSignal(plateaus, opts.allLib, opts.muscleVolumes);
  if (bump) cards.push(bump);

  opts.muscleVolumes
    .filter((v) => v.status === "over")
    .forEach((v) =>
      cards.push({
        kind: "volume-over",
        severity: "info",
        title: `${MUSCLE_LABEL[v.muscle]} über Ziel`,
        body: `${v.sets} Sätze diese Woche, über dem produktiven Maximum (~${VOLUME_LANDMARKS.mav}) — etwas zurücknehmen, damit die Erholung reicht.`,
      }),
    );

  // Mid/late-week volume gap: muscles still below the minimum effective volume
  // after real training this week. Gated so it never fires on an empty Monday,
  // and only when it's a focused gap (≤ 4 muscles), not a generally light week.
  const weekStart = weekStartMon();
  const sessionsThisWeek = opts.log.filter((s) => new Date(s.date) >= weekStart).length;
  if (sessionsThisWeek >= 2) {
    const low = opts.muscleVolumes
      .filter((v) => volumeBucket(v.sets) === "low")
      .sort((a, b) => a.sets - b.sets);
    if (low.length >= 1 && low.length <= 4)
      cards.push({
        kind: "volume-under",
        severity: "info",
        title: "Muskeln hängen zurück",
        body: `${low.map((v) => MUSCLE_LABEL[v.muscle]).join(", ")} unter ~${VOLUME_LANDMARKS.mev} Sätzen diese Woche — in die nächste Einheit einbauen, um den Wachstumsbereich (${VOLUME_LANDMARKS.target}–${VOLUME_LANDMARKS.mav}) zu treffen.`,
      });
  }

  return cards.sort((a, b) => SEV_RANK[a.severity] - SEV_RANK[b.severity]);
}
