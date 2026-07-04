/**
 * ATLAS — die überwachende Trainer-Intelligenz.
 *
 * Eine REIN DETERMINISTISCHE Synthese-Schicht über dem gesamten Stack
 * (advisor · fatigue · periodization · readiness · set-plan · records ·
 * volume · balance · cardio): sie verdichtet alle Signale zu EINER
 * Tages-Direktive, einer Wochen-Mission mit Metern, einer kompakten "Wache"
 * und Live-Reaktionen im Training. Kein LLM-Call, kein Netz, kein Zufall zur
 * Laufzeit — der Seed ist der Kalendertag, damit ATLAS pro Tag mit EINER
 * Stimme spricht und Tests reproduzierbar sind.
 *
 * ATLAS gibt nie medizinischen Rat: der Rücken-Pfad transportiert nur die
 * bestehende "ärztlich abklären"-Routung des Advisors.
 */
import { plateauSignals } from "@/lib/advisor";
import { balanceRatios } from "@/lib/balance";
import type { CardioLevel } from "@/lib/coaching";
import { fmtKg, fmtPct, isoWeek } from "@/lib/format";
import { projectionTargets } from "@/lib/projection-targets";
import type { FatigueState } from "@/lib/fatigue";
import type { PhaseState } from "@/lib/periodization";
import { band, type ReadinessScale } from "@/lib/readiness";
import {
  beatsRecord,
  exerciseRecords,
  setMetric,
  weeklyPrs,
  type ExRecord,
} from "@/lib/records";
import { weeklySetCount, type WeeklySetStats } from "@/lib/set-plan";
import { isFilled, weeklyStreak, workSets } from "@/lib/stats";
import {
  MUSCLE_LABEL,
  underservedMuscles,
  VOLUME_TARGET,
  weeklyMuscleVolume,
  weekStartMon,
  type MuscleVolume,
} from "@/lib/volume";
import type {
  AppSettings,
  CardioSession,
  Exercise,
  LastPerf,
  LoggedSession,
  Muscle,
  Prescription,
  Readiness,
  ResolvedSlot,
  SetEntry,
  Template,
} from "@/lib/types";

/* ────────────────────────── Typen ────────────────────────── */

export type DirectiveKind =
  | "back-doctor"
  | "deload"
  | "deload-active"
  | "readiness"
  | "fatigue"
  | "phase"
  | "muscle-focus"
  | "pr-chance"
  | "streak"
  | "push"
  | "first";

export interface TrainerDirective {
  kind: DirectiveKind;
  severity: "urgent" | "warn" | "info";
  /** Der Befehl — EIN Satz, du-Form. */
  text: string;
  /** Die Begründung — EIN kurzer Satz, wo möglich mit echter Zahl. */
  reason: string;
  exId?: string;
  muscle?: Muscle;
}

export interface MissionTargets {
  weekKey: string; // ISO-Montag "2026-06-29" — friert die Woche ein
  kw: number;
  sessionsTarget: number;
  setsTarget: number;
  focusMuscle?: Muscle;
  focusTarget?: number;
  prExId?: string;
  prExName?: string;
}

export interface MissionMeter {
  id: "sessions" | "sets" | "focus" | "pr";
  label: string;
  current: number;
  target: number;
  pct: number; // 0..1 geclampt
  done: boolean;
}

export interface TrainerMission {
  targets: MissionTargets;
  meters: MissionMeter[];
  pct: number; // Mittel der Meter
  headline: string; // "Mission KW 27"
}

export interface WatchSignal {
  id: "last" | "phase" | "balance" | "serie" | "cardio" | "prognose";
  label: string; // mono-uppercase im UI
  value: string;
  tone: "ok" | "watch" | "alert";
}

export interface TrainerState {
  directive: TrainerDirective;
  mission: TrainerMission;
  watch: WatchSignal[];
  statusLine: string;
}

export interface TrainerInput {
  log: LoggedSession[];
  allLib: Exercise[];
  settings: AppSettings;
  cardio: CardioSession[];
  muscleVolumes: MuscleVolume[];
  fatigue: FatigueState;
  phase: PhaseState;
  weekSets: WeeklySetStats;
  seeDoctor: boolean;
  todayReadiness: Readiness | null;
  cardioLevel: CardioLevel;
  recTpl: Template;
  recList: ResolvedSlot[];
  estimatedMin: number;
  weekCount: number;
  daysAgo: number | null;
  /** PR BD: persistierte (eingefrorene) Wochenziele — sonst frisch generiert. */
  storedTargets?: MissionTargets;
  ref?: Date;
  seed?: number;
}

/* ────────────────────────── Helfer ────────────────────────── */

const DAY = 86_400_000;

function pick<T>(pool: T[], seed: number): T {
  const n = pool.length;
  return pool[((seed % n) + n) % n];
}

const daySeed = (ref: Date) => Math.floor(ref.getTime() / DAY);

/** Montag der Woche als lokaler ISO-Datums-Key ("2026-06-29"). */
export function weekKeyOf(ref: Date = new Date()): string {
  const m = weekStartMon(ref);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${m.getFullYear()}-${p(m.getMonth() + 1)}-${p(m.getDate())}`;
}

/** ISO-Kalenderwoche — kanonisch in lib/format.ts, hier für Alt-Importe re-exportiert. */
export { isoWeek };

interface PrChance {
  exId: string;
  name: string;
  /** Letzte Leistung relativ zur Bestmarke (z. B. 0.96). */
  ratio: number;
  recordLabel: string;
}

/** Beste Kennzahl der LETZTEN Session mit dieser Übung (gleiche Metrik wie ExRecord). */
function lastBestMetric(log: LoggedSession[], ex: Exercise): number {
  for (let i = log.length - 1; i >= 0; i--) {
    const se = (log[i].exercises ?? []).find((e) => e.id === ex.id);
    if (!se) continue;
    const sets = workSets(se.sets ?? []).filter(isFilled);
    if (!sets.length) continue;
    return Math.max(...sets.map((s) => setMetric(ex, s)));
  }
  return 0;
}

/** Übung im heutigen Plan, die nahe an ihrer Bestmarke steht (≥94 %). */
function prChance(
  log: LoggedSession[],
  recList: ResolvedSlot[],
): PrChance | null {
  if (!log.length) return null;
  const records = new Map(exerciseRecords(log).map((r) => [r.exId, r]));
  let best: PrChance | null = null;
  for (const { ex } of recList) {
    if (ex.pattern === "cardio") continue;
    const rec = records.get(ex.id);
    // Nur Gewichts-Bestmarken jagen: Halte-/Wdh-Übungen "tangieren" ihre
    // Bestmarke fast jede Einheit — das wäre eine Dauer-Direktive ohne Wert.
    if (!rec || rec.best <= 0 || rec.kind !== "weight") continue;
    const last = lastBestMetric(log, ex);
    if (last <= 0) continue;
    const ratio = last / rec.best;
    if (ratio >= 0.94 && (!best || ratio > best.ratio)) {
      best = { exId: ex.id, name: ex.name, ratio, recordLabel: rec.label };
    }
  }
  return best;
}


/* ────────────────────── Direktiven-Kaskade ────────────────────── */

function directiveFor(input: TrainerInput, ref: Date, seed: number): TrainerDirective {
  const {
    log, settings, fatigue, phase, muscleVolumes, seeDoctor,
    todayReadiness, recTpl, recList, estimatedMin, weekCount,
  } = input;

  // 1 · Rücken → nur Routing, nie Rat.
  if (seeDoctor) {
    return {
      kind: "back-doctor",
      severity: "urgent",
      text: pick(["Stopp — erst abklären.", "Heute kein Zug nach vorn — abklären."], seed),
      reason:
        "Zwei rote Rücken-Signale in Folge. Arzt oder Physio, dann greifen wir wieder an.",
    };
  }

  // 2a · Deload fällig.
  if (phase.due) {
    return {
      kind: "deload",
      severity: "warn",
      text: pick(["Diese Woche entlasten.", "Runterfahren — bewusst."], seed),
      reason: `Woche ${Math.min(phase.weeksSinceDeload, 9)} seit der letzten Entlastung — 60 Prozent Last, ein Satz weniger.`,
    };
  }

  // 2b · Deload läuft.
  const deloadActive =
    !!settings.lastDeloadDate &&
    (ref.getTime() - new Date(settings.lastDeloadDate).getTime()) / DAY < 7;
  if (deloadActive) {
    return {
      kind: "deload-active",
      severity: "info",
      text: "Entlastungswoche — leicht bleiben.",
      reason: "Reize klein halten, Technik schärfen. Nächste Woche greifen wir wieder an.",
    };
  }

  // 3 · Tagesform niedrig.
  if (todayReadiness && band(todayReadiness.score) === "low") {
    return {
      kind: "readiness",
      severity: "warn",
      text: pick(["Heute leicht. Kein Ego.", "Volumen runter, Technik hoch."], seed),
      reason: "Tagesform niedrig — gleiche Übungen, weniger Last, saubere Ausführung.",
    };
  }

  // 4 · Ermüdung hoch.
  if (fatigue.enough && fatigue.band === "hoch") {
    return {
      kind: "fatigue",
      severity: "warn",
      text: pick(["Runter vom Gas.", "Last kappen — heute kurz und sauber."], seed),
      reason: `Akutlast ${fatigue.ratio.toFixed(1).replace(".", ",")}× über deinem Vier-Wochen-Schnitt.`,
    };
  }

  // 5 · Kraft-Phase beginnt (nur Eintrittswoche).
  if (phase.phase === "intensiv" && phase.cycleWeek === 4) {
    return {
      kind: "phase",
      severity: "info",
      text: "Kraft-Woche. Schwerer als zuletzt.",
      reason: "Block-Woche 4 — RIR 0 bis 1, weniger Wiederholungen, volle Konzentration.",
    };
  }

  // 6 · Muskel-Fokus.
  const under = underservedMuscles(muscleVolumes);
  if (weekCount >= 1 && under.length > 0) {
    const m = under[0];
    return {
      kind: "muscle-focus",
      severity: "info",
      text: pick(
        [`Heute ${MUSCLE_LABEL[m.muscle]} priorisieren.`, `${MUSCLE_LABEL[m.muscle]} zuerst — der Rest folgt.`],
        seed,
      ),
      reason: `${m.sets % 1 === 0 ? m.sets : m.sets.toFixed(1).replace(".", ",")} von ${VOLUME_TARGET.min} Sätzen diese Woche — der Rückstand kippt sonst die Balance.`,
      muscle: m.muscle,
    };
  }

  // 7 · Bestmarken-Chance.
  const chance = prChance(log, recList);
  if (chance) {
    return {
      kind: "pr-chance",
      severity: "info",
      text: pick(["Heute fällt eine Bestmarke.", "Rekordluft — nimm sie mit."], seed),
      reason: `${chance.name}: letzte Einheit bei ${fmtPct(chance.ratio)} deiner Bestmarke ${chance.recordLabel}.`,
      exId: chance.exId,
    };
  }

  // 8 · Serie verteidigen (Do–So, noch nichts trainiert).
  const streak = weeklyStreak(log);
  if (weekCount === 0 && streak > 0 && [4, 5, 6, 0].includes(ref.getDay())) {
    return {
      kind: "streak",
      severity: "info",
      text: "Serie sichern — heute zählt.",
      reason: `${streak} ${streak === 1 ? "Woche" : "Wochen"} Konstanz, diese Woche noch 0 Einheiten.`,
    };
  }

  // 9 · Default.
  if (log.length === 0) {
    return {
      kind: "first",
      severity: "info",
      text: "Erste Einheit wartet. Ich beobachte ab Satz eins.",
      reason: `${recTpl.name}, rund ${estimatedMin} Minuten — danach kalibriere ich deine Ziele.`,
    };
  }
  return {
    kind: "push",
    severity: "info",
    text: pick(
      [
        `${recTpl.name}. ${estimatedMin} Minuten, volle Aufmerksamkeit.`,
        `Plan steht: ${recTpl.name}. Abliefern.`,
        `${recList.length} Übungen. Keine davon verschenken.`,
      ],
      seed,
    ),
    reason: pick(
      [
        "Alles im grünen Bereich — Progression ist heute der Auftrag.",
        "Signale sauber. Der nächste Schritt gehört dir.",
      ],
      seed,
    ),
  };
}

/* ────────────────────────── Mission ────────────────────────── */

export function generateMissionTargets(
  input: TrainerInput,
  ref: Date = input.ref ?? new Date(),
): MissionTargets {
  const under = underservedMuscles(input.muscleVolumes);
  const chance = prChance(input.log, input.recList);
  const plateau = chance ? null : plateauSignals(input.log, input.allLib)[0];
  const plateauEx = plateau?.exId
    ? input.allLib.find((e) => e.id === plateau.exId)
    : undefined;
  return {
    weekKey: weekKeyOf(ref),
    kw: isoWeek(ref),
    sessionsTarget: 3,
    setsTarget: input.weekSets.target,
    focusMuscle: under[0]?.muscle,
    focusTarget: under.length ? VOLUME_TARGET.min : undefined,
    prExId: chance?.exId ?? plateauEx?.id,
    prExName: chance?.name ?? plateauEx?.name,
  };
}

export function missionProgress(
  targets: MissionTargets,
  input: TrainerInput,
): TrainerMission {
  const ref = input.ref ?? new Date();
  const meters: MissionMeter[] = [];
  const meter = (
    id: MissionMeter["id"],
    label: string,
    current: number,
    target: number,
  ) => {
    const pct = target > 0 ? Math.max(0, Math.min(1, current / target)) : 0;
    meters.push({ id, label, current, target, pct, done: current >= target });
  };

  meter("sessions", "Einheiten", input.weekCount, targets.sessionsTarget);
  meter("sets", "Sätze", input.weekSets.collected, targets.setsTarget);
  if (targets.focusMuscle && targets.focusTarget) {
    const sets =
      input.muscleVolumes.find((m) => m.muscle === targets.focusMuscle)?.sets ?? 0;
    meter("focus", MUSCLE_LABEL[targets.focusMuscle], Math.round(sets), targets.focusTarget);
  }
  if (targets.prExId) {
    meter("pr", "Bestmarke", Math.min(1, weeklyPrs(input.log, ref).length), 1);
  }

  const pct = meters.length
    ? meters.reduce((a, m) => a + m.pct, 0) / meters.length
    : 0;
  return { targets, meters, pct, headline: `Mission KW ${targets.kw}` };
}

/* ────────────────────────── Wache ────────────────────────── */

function watchFor(input: TrainerInput): WatchSignal[] {
  const { fatigue, phase, muscleVolumes, log, cardioLevel } = input;

  const last: WatchSignal = !fatigue.enough
    ? { id: "last", label: "Last", value: "baut auf", tone: "ok" }
    : fatigue.band === "hoch"
      ? { id: "last", label: "Last", value: "hoch", tone: "alert" }
      : fatigue.band === "erhöht"
        ? { id: "last", label: "Last", value: "erhöht", tone: "watch" }
        : { id: "last", label: "Last", value: fatigue.band, tone: "ok" };

  const phaseSig: WatchSignal = phase.due
    ? { id: "phase", label: "Phase", value: "Deload fällig", tone: "alert" }
    : {
        id: "phase",
        label: "Phase",
        value:
          phase.phase === "entlastung"
            ? "Entlastung"
            : `W ${phase.cycleWeek}/${phase.cycleLength}`,
        tone: "ok",
      };

  const ratios = balanceRatios(muscleVolumes);
  const active = ratios.filter((r) => r.a + r.b > 0);
  const worst = active
    .filter((r) => r.status === "skewed")
    .sort((a, b) => Math.abs(b.skew) - Math.abs(a.skew))[0];
  const balance: WatchSignal = !active.length
    ? { id: "balance", label: "Balance", value: "ruhig", tone: "ok" }
    : worst
      ? {
          id: "balance",
          label: "Balance",
          value: `${worst.skew > 0 ? worst.aLabel : worst.bLabel}-lastig`,
          tone: "watch",
        }
      : { id: "balance", label: "Balance", value: "ausgeglichen", tone: "ok" };

  const streak = weeklyStreak(log);
  const serie: WatchSignal =
    streak > 0
      ? { id: "serie", label: "Serie", value: `${streak} Wo`, tone: "ok" }
      : log.length > 0
        ? { id: "serie", label: "Serie", value: "0 Wo", tone: "watch" }
        : { id: "serie", label: "Serie", value: "—", tone: "ok" };

  const cardio: WatchSignal =
    cardioLevel === "spare"
      ? { id: "cardio", label: "Cardio", value: "Beine schonen", tone: "watch" }
      : cardioLevel === "ease"
        ? { id: "cardio", label: "Cardio", value: "locker rein", tone: "watch" }
        : { id: "cardio", label: "Cardio", value: "frei", tone: "ok" };

  const out: WatchSignal[] = [last, phaseSig, balance, serie, cardio];

  // Prognose: nur wenn die Top-Kernübung auf Kurs ist — kein Fantasie-Datum.
  const proj = projectionTargets(log, input.allLib, {
    weightStep: input.settings.weightStep,
    max: 1,
    ref: input.ref,
  })[0];
  if (proj && proj.state === "kurs" && proj.etaKw != null) {
    out.push({
      id: "prognose",
      label: "Prognose",
      value: `${fmtKg(proj.targetKg)} kg ≈ KW ${proj.etaKw}`,
      tone: "ok",
    });
  }

  return out;
}

/* ────────────────────────── State ────────────────────────── */

export function trainerState(input: TrainerInput): TrainerState {
  const ref = input.ref ?? new Date();
  const seed = input.seed ?? daySeed(ref);

  const directive = directiveFor(input, ref, seed);
  const targets = input.storedTargets ?? generateMissionTargets(input, ref);
  const mission = missionProgress(targets, input);
  const watch = watchFor(input);

  const statusLine =
    input.log.length === 0
      ? "Kalibrierung läuft — ab der ersten Einheit kenne ich dich."
      : pick(
          [
            `Alles im Blick — ${input.weekCount}/3 Einheiten erfasst.`,
            "Ich beobachte. Du lieferst.",
            `Mission bei ${fmtPct(mission.pct)} — Kurs halten.`,
            "Signale laufen. Ich melde mich, wenn etwas kippt.",
          ],
          seed,
        );

  return { directive, mission, watch, statusLine };
}

/* ─────────────────── Live-Zeile (Workout, PR BC) ─────────────────── */

export interface LiveLine {
  text: string;
  tone: "ok" | "watch" | "push";
  /** Auslöser — fürs Voice-Gating (Rekord spricht schon die Rekord-Feier). */
  kind: "record" | "chase" | "shadow" | "rir" | "readiness" | "presc";
}

export function liveLine(opts: {
  ex: Exercise;
  sets: SetEntry[];
  presc: Prescription;
  record: ExRecord | null;
  readiness: ReadinessScale;
  /** Letzte Leistung der Übung — fürs Schattenrennen (Überhol-Kommentar). */
  lastPerf?: LastPerf | null;
  seed?: number;
}): LiveLine | null {
  const { ex, sets, presc, record, readiness } = opts;
  const seed = opts.seed ?? daySeed(new Date());
  if (ex.pattern === "cardio") return null;

  const filled = (sets ?? []).filter((s) => !s.warmup && isFilled(s));

  // ① Rekord gefallen.
  if (record && filled.some((s) => beatsRecord(ex, s, record))) {
    return {
      text: pick(["Bestmarke gefallen. Notiert.", "Neue Bestmarke — genau so."], seed),
      tone: "push",
      kind: "record",
    };
  }

  // ①′ Schattenrennen: der eben gefüllte Satz schlägt den Schatten-Satz
  //    (gleicher Index in der letzten Leistung dieser Übung).
  if (opts.lastPerf) {
    const shadow = workSets(opts.lastPerf.sets).filter(isFilled);
    const i = filled.length - 1;
    const last = filled[i];
    if (last && shadow[i]) {
      const now = setMetric(ex, last);
      const then = setMetric(ex, shadow[i]);
      if (now > then) {
        const lbl = (s: SetEntry) =>
          ex.unit === "Sek"
            ? `${s.reps}s`
            : s.weight !== "" && s.weight != null
              ? `${s.weight}×${s.reps}`
              : `${s.reps}`;
        return {
          text: pick(
            [
              `Satz ${i + 1}: ${lbl(last)} — dein Schatten hatte ${lbl(shadow[i])}. Überholt.`,
              `Schatten geschlagen — ${lbl(last)} gegen ${lbl(shadow[i])} in Satz ${i + 1}.`,
            ],
            seed + i,
          ),
          tone: "push",
          kind: "shadow",
        };
      }
    }
  }

  // ② Rekordjagd: Vorschlag nahe an der Bestmarke.
  if (record && record.kind === "weight" && presc.suggestedWeight) {
    const gap = record.best - setMetric(ex, {
      weight: String(presc.suggestedWeight),
      reps: presc.r || "8",
    } as SetEntry);
    if (gap > 0 && gap <= record.best * 0.06) {
      return {
        text: `Bestmarke ${record.label} in Reichweite — greif zu.`,
        tone: "push",
        kind: "chase",
      };
    }
  }

  // ③ RIR-Feedback auf den letzten gefüllten Satz.
  const lastSet = filled[filled.length - 1];
  if (lastSet && lastSet.rir != null) {
    if (lastSet.rir === 0) {
      return {
        text: "Grenze getroffen — Respekt. Nächster Satz ruhig.",
        tone: "watch",
        kind: "rir",
      };
    }
    if (lastSet.rir >= 4) {
      return { text: "Da war mehr drin — plus 2,5 kg?", tone: "push", kind: "rir" };
    }
  }

  // ④ Readiness gedrosselt.
  if (readiness.loadMult < 1 || readiness.cap) {
    return {
      text: "Heute bewusst gedrosselt — Qualität zählt doppelt.",
      tone: "ok",
      kind: "readiness",
    };
  }

  // ⑤ Progressions-Hinweis aus der Verordnung.
  switch (presc.reason) {
    case "up":
      return {
        text: presc.w ? `Plan sagt ${presc.w} kg — du bist bereit.` : "Heute eine Stufe höher — du bist bereit.",
        tone: "push",
        kind: "presc",
      };
    case "down":
      return { text: "Etwas zurück, dafür sauber — so wächst es weiter.", tone: "ok", kind: "presc" };
    case "hold":
      return { text: "Gleiches Gewicht, bessere Wiederholungen.", tone: "ok", kind: "presc" };
    case "lighter":
      return { text: "Nach der Pause kontrolliert rein.", tone: "ok", kind: "presc" };
    case "start":
      return { text: "Startgewicht finden — zwei bis drei im Tank lassen.", tone: "ok", kind: "presc" };
    case "rep":
      return { text: "Eine Wiederholung mehr als letztes Mal — hol sie.", tone: "push", kind: "presc" };
    default:
      return null;
  }
}

/* ─────────────── Wochen-Mission: Persistenz + Review ─────────────── */

export interface MissionReview {
  kw: number;
  weekKey: string;
  sessions: number;
  sessionsTarget: number;
  sets: number;
  setsTarget: number;
  prs: number;
  /** Fokus-Muskel hat sein Wochenziel in JENER Woche erreicht (oder es gab keinen). */
  focusHit: boolean;
  outcomePct: number; // 0..1
}

/** Die im Storage eingefrorene Wochen-Mission — Montag generiert, Ziele
 *  driften nicht mit, wenn die Historie sich unter der Woche ändert. */
export interface StoredMission {
  version: 1;
  targets: MissionTargets;
  generatedAt: string;
  /** Ergebnis der VORWOCHE — füttert den ATLAS-Rapport. */
  lastReview?: MissionReview;
}

/** Bewertet eine (abgelaufene) Mission gegen das Log ihrer Zielwoche. */
export function reviewMission(
  targets: MissionTargets,
  log: LoggedSession[],
  allLib: Exercise[],
): MissionReview {
  const ref = new Date(`${targets.weekKey}T12:00:00`);
  const start = weekStartMon(ref);
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  const sessions = log.filter((s) => {
    const d = new Date(s.date);
    return d >= start && d < end;
  }).length;
  const sets = weeklySetCount(log, ref);
  const prs = weeklyPrs(log, ref).length;
  const focusSets = targets.focusMuscle
    ? (weeklyMuscleVolume(log, allLib, ref).find((m) => m.muscle === targets.focusMuscle)
        ?.sets ?? 0)
    : 0;
  const focusHit =
    !targets.focusMuscle || focusSets >= (targets.focusTarget ?? VOLUME_TARGET.min);

  const parts = [
    Math.min(1, sessions / targets.sessionsTarget),
    Math.min(1, targets.setsTarget > 0 ? sets / targets.setsTarget : 0),
  ];
  if (targets.focusMuscle && targets.focusTarget) {
    parts.push(Math.min(1, focusSets / targets.focusTarget));
  }
  if (targets.prExId) parts.push(Math.min(1, prs));

  return {
    kw: targets.kw,
    weekKey: targets.weekKey,
    sessions,
    sessionsTarget: targets.sessionsTarget,
    sets,
    setsTarget: targets.setsTarget,
    prs,
    focusHit,
    outcomePct: parts.reduce((a, b) => a + b, 0) / parts.length,
  };
}

/** Eine Zeile fürs Facts-Paket des Rapports (und den deterministischen Fallback). */
export function missionReviewFact(r: MissionReview): string {
  return (
    `Mission KW ${r.kw}: ${r.sessions}/${r.sessionsTarget} Einheiten, ` +
    `${r.sets}/${r.setsTarget} Sätze (${fmtPct(r.outcomePct)}), ` +
    `Fokus ${r.focusHit ? "erfüllt" : "offen"}, ` +
    `${r.prs} ${r.prs === 1 ? "Bestmarke" : "Bestmarken"}.`
  );
}

/* ─────────────── Kontextblock (Chat/Rapport, PR BD) ─────────────── */

export function trainerContextBlock(t: TrainerState): string {
  const meters = t.mission.meters
    .map((m) => `${m.label} ${m.current}/${m.target}`)
    .join(" · ");
  const watch = t.watch.map((w) => `${w.label} ${w.value}`).join(" · ");
  return [
    `Direktive heute: "${t.directive.text}" (${t.directive.reason})`,
    `${t.mission.headline}: ${meters} (${fmtPct(t.mission.pct)}).`,
    `Wache: ${watch}.`,
  ].join("\n");
}
