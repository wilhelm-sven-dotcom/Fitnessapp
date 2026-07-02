import { buildCoachContext } from "@/lib/coach-context";
import { missionReviewFact, type MissionReview } from "@/lib/trainer";
import { fatigueState, type FatigueState } from "@/lib/fatigue";
import { phaseState, type PhaseState } from "@/lib/periodization";
import { weeklyPrs, type PrEvent } from "@/lib/records";
import { sessionVolume } from "@/lib/stats";
import {
  coverageCount,
  MUSCLE_LABEL,
  underservedMuscles,
  weekStartMon,
  weeklyMuscleVolume,
} from "@/lib/volume";
import type { BodyMetric, CardioSession, Exercise, LoggedSession } from "@/lib/types";

/**
 * Weekly briefing — "deine Woche als Magazin-Ausgabe". Synthesizes the week from
 * the whole engine (volume, balance, PRs, fatigue, phase) into structured facts.
 * `facts` feeds the AI editorial column; `coachNote` is the deterministic
 * fallback so the briefing is fully useful without an API round-trip.
 */
export interface Briefing {
  kw: number;
  weekCount: number;
  volT: number;
  volDeltaT: number;
  coverage: { hit: number; total: number };
  prs: PrEvent[];
  fatigue: FatigueState;
  phase: PhaseState;
  under: string[];
  facts: string;
  coachNote: string;
}

const DAY = 86_400_000;

function isoWeek(d: Date): number {
  return Math.ceil(((d.getTime() - new Date(d.getFullYear(), 0, 1).getTime()) / DAY + 1) / 7);
}

export function buildBriefing(opts: {
  log: LoggedSession[];
  cardio: CardioSession[];
  body: BodyMetric[];
  allLib: Exercise[];
  settings: { lastDeloadDate?: string };
  /** Review der Vorwochen-Mission (ATLAS) — fließt in Facts + Fallback-Note. */
  missionReview?: MissionReview;
  ref?: Date;
}): Briefing {
  const { log, cardio, body, allLib, settings } = opts;
  const ref = opts.ref ?? new Date();

  const monThis = weekStartMon(ref);
  const monLast = new Date(monThis);
  monLast.setDate(monThis.getDate() - 7);
  const sumVol = (from: Date, to: Date) =>
    log
      .filter((s) => {
        const t = new Date(s.date);
        return t >= from && t < to;
      })
      .reduce((a, s) => a + sessionVolume(s), 0);
  const far = new Date(ref.getTime() + 7 * DAY);
  const volThisKg = sumVol(monThis, far);
  const volLastKg = sumVol(monLast, monThis);
  const volT = Math.round(volThisKg / 100) / 10;
  const volDeltaT = Math.round((volThisKg - volLastKg) / 100) / 10;
  const weekCount = log.filter((s) => new Date(s.date) >= monThis).length;

  const vols = weeklyMuscleVolume(log, allLib);
  const coverage = coverageCount(vols);
  const under = underservedMuscles(vols).map((v) => MUSCLE_LABEL[v.muscle]);

  const prs = weeklyPrs(log, ref);
  const fatigue = fatigueState(log, cardio, ref);
  const minDate = log.length ? Math.min(...log.map((s) => new Date(s.date).getTime())) : ref.getTime();
  const historyWeeks = (ref.getTime() - minDate) / (7 * DAY);
  const phase = phaseState(settings as never, fatigue.band, historyWeeks, ref);

  // Deterministic coach note (fallback / always present).
  const prPart = prs.length
    ? `${prs.length} ${prs.length === 1 ? "neuer Rekord" : "neue Rekorde"} diese Woche — stark. `
    : "";
  const volPart = `${weekCount}/3 Einheiten, ${String(volT).replace(".", ",")} t bewegt${
    volDeltaT ? ` (${volDeltaT > 0 ? "+" : ""}${String(volDeltaT).replace(".", ",")} t ggü. Vorwoche)` : ""
  }. `;
  const loadPart = fatigue.enough ? `${fatigue.title}. ` : "";
  const nextPart = `Nächste Woche: ${phase.due ? "Entlastung einlegen — " : ""}${phase.focus}${
    under.length ? ` Häng ${under.slice(0, 2).join(" & ")} dran.` : ""
  }`;
  const missionPart = opts.missionReview
    ? `Mission zu ${Math.round(opts.missionReview.outcomePct * 100)} % erfüllt. `
    : "";
  const coachNote = (missionPart + prPart + volPart + loadPart + nextPart).trim();

  // Compact facts for the AI editorial prompt.
  const facts = [
    buildCoachContext({ log, allLib, body, cardio }),
    "",
    `Diese Woche: ${weekCount}/3 Einheiten, ${String(volT).replace(".", ",")} t (${
      volDeltaT >= 0 ? "+" : ""
    }${String(volDeltaT).replace(".", ",")} t ggü. Vorwoche), Abdeckung ${coverage.hit}/${coverage.total}.`,
    prs.length
      ? `Neue Rekorde: ${prs.map((p) => `${p.name} ${p.value}`).join(", ")}.`
      : "Keine neuen Rekorde diese Woche.",
    fatigue.enough ? `Belastungs-Index: ${fatigue.title} (Akut/Schnitt ${fatigue.ratio.toFixed(2)}).` : "",
    `Phase: ${phase.title}, Woche ${phase.cycleWeek}/${phase.cycleLength}${phase.due ? " — Deload fällig" : ""}.`,
    opts.missionReview ? missionReviewFact(opts.missionReview) : "",
  ]
    .filter(Boolean)
    .join("\n");

  return { kw: isoWeek(ref), weekCount, volT, volDeltaT, coverage, prs, fatigue, phase, under, facts, coachNote };
}
