import { poolFor, stressesInjury } from "@/lib/progression";
import { fitToBudget } from "@/lib/session-time";
import { muscleOf, MUSCLE_LABEL, VOLUME_TARGET, weekStartMon } from "@/lib/volume";
import { workSets } from "@/lib/stats";
import {
  todayKey,
  type DailySession,
  type PlannedExercise,
  type SessionVariant,
} from "@/lib/session-model";
import type {
  Exercise,
  InjuryArea,
  LoggedSession,
  Muscle,
  Pattern,
  ResolvedSlot,
} from "@/lib/types";

/**
 * Deterministischer Einheiten-Generator — das Sicherheitsnetz, wenn ATLAS
 * (KI) offline ist oder kein Server-Key existiert. Baut aus dem GESAMTEN
 * Katalog eine bedarfsgerechte Einheit: Muskeln mit Wochen-Defizit und
 * langer Pause zuerst, innerhalb eines Musters die am längsten nicht
 * verwendete Übung (Abwechslungs-Druck), Rücken-/Verletzungsschonung wie im
 * bisherigen Regelwerk, danach `fitToBudget` für die Zeit.
 */

export interface FallbackOpts {
  allLib: Exercise[];
  has: (k: string) => boolean;
  log: LoggedSession[];
  budgetMin: number;
  backSafe?: boolean;
  injuries?: InjuryArea[];
  variant?: SessionVariant;
}

/** Muskel → Muster, die ihn primär treffen (für die Bedarfs-Füllung). */
const MUSCLE_PATTERNS: Record<Muscle, Pattern[]> = {
  chest: ["hpush"],
  back: ["hpull", "vpull"],
  shoulders: ["vpush", "lateral"],
  biceps: ["arm", "vpull"],
  triceps: ["arm", "hpush"],
  forearms: ["arm"],
  quads: ["squat", "lunge"],
  hamstrings: ["hinge"],
  glutes: ["hinge", "lunge"],
  calves: ["calf"],
  core: ["core"],
};

const HEAVY_HINGE = new Set(["rdl_db", "hip_thrust"]);

/** Letzte Verwendung je Übungs-Id (ms-Timestamp; undefined = nie). */
function lastUsedMap(log: LoggedSession[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const s of log) {
    const t = new Date(s.date).getTime();
    for (const ex of s.exercises ?? []) {
      const prev = m.get(ex.id);
      if (prev == null || t > prev) m.set(ex.id, t);
    }
  }
  return m;
}

/** Arbeitssätze je Muskel in der laufenden Woche. */
function weekMuscleSets(
  log: LoggedSession[],
  allLib: Exercise[],
): Map<Muscle, number> {
  const byId = new Map(allLib.map((e) => [e.id, e]));
  const mon = weekStartMon();
  const m = new Map<Muscle, number>();
  for (const s of log) {
    if (new Date(s.date) < mon) continue;
    for (const se of s.exercises ?? []) {
      const ex = byId.get(se.id);
      if (!ex || ex.pattern === "cardio") continue;
      const sets = workSets(se.sets ?? []).length;
      if (!sets) continue;
      const { primary, secondary } = muscleOf(ex);
      m.set(primary, (m.get(primary) ?? 0) + sets);
      if (secondary) m.set(secondary, (m.get(secondary) ?? 0) + sets * 0.5);
    }
  }
  return m;
}

/** Tage seit ein Muskel zuletzt primär trainiert wurde (7 = lange her/nie). */
function daysSinceMuscle(
  log: LoggedSession[],
  allLib: Exercise[],
): Map<Muscle, number> {
  const byId = new Map(allLib.map((e) => [e.id, e]));
  const m = new Map<Muscle, number>();
  const now = Date.now();
  for (const s of log) {
    const days = (now - new Date(s.date).getTime()) / 86400000;
    for (const se of s.exercises ?? []) {
      const ex = byId.get(se.id);
      if (!ex || ex.pattern === "cardio") continue;
      const { primary } = muscleOf(ex);
      const prev = m.get(primary);
      if (prev == null || days < prev) m.set(primary, days);
    }
  }
  return m;
}

/** Übungen der letzten Einheit — werden gemieden, wenn der Pool es hergibt. */
function lastSessionIds(log: LoggedSession[]): Set<string> {
  const last = log[log.length - 1];
  return new Set((last?.exercises ?? []).map((e) => e.id));
}

function pickFromPool(
  pattern: Pattern,
  opts: FallbackOpts,
  used: Set<string>,
  lastUsed: Map<string, number>,
  avoid: Set<string>,
): Exercise | null {
  let pool = poolFor(pattern, opts.has, opts.allLib).filter((e) => !used.has(e.id));
  if (!pool.length) return null;

  if (opts.backSafe) {
    if (pattern === "core") {
      const stabs = pool.filter((e) => e.backStabilizer);
      if (stabs.length) pool = stabs;
    } else {
      const gentle = pool.filter((e) => !e.backCaution && !HEAVY_HINGE.has(e.id));
      if (gentle.length) pool = gentle;
    }
  }
  const injuries = opts.injuries ?? [];
  if (injuries.length) {
    const safe = pool.filter((e) => !injuries.some((i) => stressesInjury(e, i)));
    if (safe.length) pool = safe;
  }
  // Abwechslung: nicht dieselbe Übung wie in der letzten Einheit, wenn möglich.
  const fresh = pool.filter((e) => !avoid.has(e.id));
  if (fresh.length) pool = fresh;

  // Am längsten nicht verwendet zuerst (nie verwendet = ganz vorn).
  pool.sort((a, b) => (lastUsed.get(a.id) ?? 0) - (lastUsed.get(b.id) ?? 0));
  return pool[0] ?? null;
}

function whyLine(
  ex: Exercise,
  need: { deficit: number; days: number } | undefined,
): string {
  const { primary } = muscleOf(ex);
  const label = MUSCLE_LABEL[primary];
  if (need && need.days >= 5) return `${label} war ${Math.round(need.days)} Tage nicht dran — Zeit für einen Reiz.`;
  if (need && need.deficit > 2) return `${label} liegt diese Woche noch ${Math.ceil(need.deficit)} Sätze unter dem Ziel.`;
  if (ex.pattern === "core") return "Stabile Mitte trägt alles andere.";
  return `Hält ${label} in der Rotation.`;
}

const RESET_IDS = ["birddog", "pushup", "deadbug", "squat_bw", "sideplank", "gb_march"];
const EXAM_PATTERNS: Pattern[] = ["squat", "hinge", "hpush", "vpull"];

/** Baut die heutige Einheit deterministisch. Wirft nie; im Extremfall (leerer
 *  Katalog) kommt eine leere Item-Liste zurück, die die UI abfängt. */
export function generateFallbackSession(opts: FallbackOpts): DailySession {
  const variant = opts.variant ?? "normal";
  const lastUsed = lastUsedMap(opts.log);
  const avoid = lastSessionIds(opts.log);
  const used = new Set<string>();
  const byId = new Map(opts.allLib.map((e) => [e.id, e]));

  let name = "Ganzkörper";
  let focus = "Ganzkörper";
  let briefing = "";
  const picked: Exercise[] = [];
  const whyById = new Map<string, string>();

  if (variant === "reset") {
    name = "Rücken-Reset";
    focus = "Stabilität";
    briefing =
      "Heute keine Lasten: eine gewichtsfreie Stabi-Einheit, die deinen unteren Rücken beruhigt und die Mitte wieder aufbaut.";
    const pull = opts.has("bands") ? "band_row" : opts.has("rings") ? "ringrow" : opts.has("pullup") ? "pullup" : null;
    const ids = [...RESET_IDS.slice(0, 2), ...(pull ? [pull] : []), ...RESET_IDS.slice(2)];
    for (const id of ids) {
      const ex = byId.get(id);
      if (ex) picked.push(ex);
    }
  } else if (variant === "exam") {
    name = "Die Prüfung";
    focus = "Maximalkraft-Test";
    briefing =
      "Testtag: vier Grundmuster, jeweils sauber hochgerampt bis zum schweren Satz. Keine Rekordjagd um jeden Preis — Technik entscheidet.";
    for (const pat of EXAM_PATTERNS) {
      // Fürs Testen zählt Vertrautheit: die zuletzt trainierte Übung des Musters.
      const pool = poolFor(pat, opts.has, opts.allLib);
      if (!pool.length) continue;
      const sorted = [...pool].sort(
        (a, b) => (lastUsed.get(b.id) ?? 0) - (lastUsed.get(a.id) ?? 0),
      );
      const ex = sorted[0];
      if (ex && !used.has(ex.id)) {
        used.add(ex.id);
        picked.push(ex);
      }
    }
  } else {
    // ── Bedarfsanalyse: Wochen-Defizit + Tage seit letztem Reiz. ──
    const weekSets = weekMuscleSets(opts.log, opts.allLib);
    const since = daysSinceMuscle(opts.log, opts.allLib);
    const need = new Map<Muscle, { deficit: number; days: number; score: number }>();
    for (const m of Object.keys(MUSCLE_PATTERNS) as Muscle[]) {
      const deficit = Math.max(0, VOLUME_TARGET.min - (weekSets.get(m) ?? 0));
      const days = Math.min(7, since.get(m) ?? 7);
      need.set(m, { deficit, days, score: deficit * 2 + days });
    }
    const ranked = [...need.entries()].sort((a, b) => b[1].score - a[1].score);

    // Skelett: 1 Unterkörper, 1 Druck, 1 Zug — jeweils das bedürftigste Muster.
    const patternNeed = (p: Pattern): number => {
      let s = 0;
      for (const [m, n] of need) if (MUSCLE_PATTERNS[m].includes(p)) s = Math.max(s, n.score);
      return s;
    };
    const bestOf = (cands: Pattern[]): Pattern =>
      [...cands].sort((a, b) => patternNeed(b) - patternNeed(a))[0];

    const patterns: Pattern[] = [
      bestOf(["squat", "lunge", "hinge"]),
      bestOf(["hpush", "vpush"]),
      bestOf(["hpull", "vpull"]),
    ];
    // Füllen nach Muskel-Bedarf, ohne Muster zu doppeln; Core kommt ans Ende.
    for (const [m] of ranked) {
      if (patterns.length >= 5) break;
      const cand = MUSCLE_PATTERNS[m].find((p) => p !== "core" && !patterns.includes(p));
      if (cand) patterns.push(cand);
    }
    patterns.push("core");

    for (const pat of patterns) {
      const ex = pickFromPool(pat, opts, used, lastUsed, avoid);
      if (ex) {
        used.add(ex.id);
        picked.push(ex);
        const { primary } = muscleOf(ex);
        whyById.set(ex.id, whyLine(ex, need.get(primary)));
      }
    }

    const top = ranked.slice(0, 2).map(([m]) => MUSCLE_LABEL[m]);
    focus = top.length ? top.join(" & ") : "Ganzkörper";
    name = `Ganzkörper · ${focus}`;
    briefing = `Heute liegt der Schwerpunkt auf ${top.join(" und ") || "dem ganzen Körper"} — dort ist diese Woche noch am meisten offen. Große Übungen zuerst, dann Feinarbeit, zum Schluss die Mitte.`;
    if (opts.backSafe)
      briefing += " Dein Rücken wird dabei geschont: keine belasteten Beugen, Stabi statt Last.";
  }

  // Zeitbudget anwenden — dieselbe Engine wie bisher.
  const slots: ResolvedSlot[] = picked.map((ex, i) => ({
    ex: { ...ex },
    slotKey: `today:i${i + 1}`,
    pool: poolFor(ex.pattern, opts.has, opts.allLib),
  }));
  const fitted =
    variant === "normal"
      ? fitToBudget(slots, opts.budgetMin, { protectCore: opts.backSafe }).list
      : slots;

  const items: PlannedExercise[] = fitted.map((s, i) => {
    const { primary } = muscleOf(s.ex);
    return {
      id: `i${i + 1}`,
      exerciseId: s.ex.id,
      sets: variant === "exam" ? 3 : s.ex.sets,
      repLow: s.ex.repLow,
      repHigh: s.ex.repHigh,
      why:
        variant === "reset"
          ? "Beruhigt und stabilisiert ohne Last."
          : variant === "exam"
            ? `Testlift für ${MUSCLE_LABEL[primary]} — vertraut und messbar.`
            : (whyById.get(s.ex.id) ?? whyLine(s.ex, undefined)),
      intro: s.ex.cue,
    };
  });

  const date = todayKey();
  return {
    id: `today-${date}-${Date.now() % 100000}`,
    date,
    name,
    focus,
    briefing,
    items,
    source: "fallback",
    variant,
    createdAt: new Date().toISOString(),
    schemaVersion: 1,
  };
}
