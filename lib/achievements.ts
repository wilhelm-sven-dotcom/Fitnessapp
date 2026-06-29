import type { LucideIcon } from "lucide-react";
import {
  Award,
  Dumbbell,
  Flame,
  Layers,
  Medal,
  Mountain,
  Repeat,
  Shield,
  Target,
  TrendingUp,
  Trophy,
  Zap,
} from "lucide-react";
import { prStreakWeeks, prTimeline } from "@/lib/records";
import { isFilled, sessionVolume, weeklyStreak, workSets } from "@/lib/stats";
import { coverageCount, weeklyMuscleVolume, weeklyVolume, weekStartMon } from "@/lib/volume";
import type { AppSettings, Exercise, LoggedSession } from "@/lib/types";

/**
 * Erfolge & Trainingslevel — a meta-progression layer derived PURELY from data the
 * app already records (no new captured signals, no new storage key). Every metric
 * reuses an existing pure function (stats / records / volume), so the legacy-session
 * safety those functions carry (`s.exercises ?? []`, `workSets` = `(sets ?? [])…`)
 * is inherited; the only raw walk here (totalSets / ratedSets) uses the same guards.
 *
 * Level formula (XP blends the four pillars the app tracks):
 *   xp = 4·Einheiten + round(Gesamtvolumen_kg / 1000) + 12·PRs + 8·Streak + 5·bestCoverage
 * RPG-style growing thresholds so early levels come fast, later ones slow:
 *   xpToReach(n) = round(50 · (n-1)^1.6)   // L1=0, L2=50, L3≈152, L4≈290 …
 */

export type Tier = "bronze" | "silber" | "gold";

export interface AchievementInput {
  log: LoggedSession[];
  allLib: Exercise[];
  settings: AppSettings;
  ref?: Date;
}

export interface AchievementResult {
  unlocked: boolean;
  progress: number; // 0..1
  valueLabel: string;
}

export interface AchievementView extends AchievementResult {
  id: string;
  title: string;
  desc: string;
  icon: LucideIcon;
  tier: Tier;
}

export interface TrainingLevel {
  level: number;
  title: string;
  xp: number;
  xpForNext: number;
  pct: number; // 0..1 toward the next level
}

interface Metrics {
  sessions: number;
  totalVolume: number;
  bestSessionVolume: number;
  bestWeekVolume: number;
  streak: number;
  prCount: number;
  prStreak: number;
  bestCoverage: number; // max muscle groups hit in any single week
  coverageTotal: number; // how many groups exist (9)
  totalSets: number; // working, filled sets all-time
  ratedSets: number; // working, filled sets carrying an RIR
  deloadDone: boolean;
}

const clamp01 = (n: number) => (n < 0 ? 0 : n > 1 ? 1 : n);
const ratio = (value: number, target: number) => clamp01(value / (target || 1));
const tonnes = (kg: number) => `${(kg / 1000).toFixed(1).replace(".", ",")} t`;

function computeMetrics({ log, allLib, settings, ref = new Date() }: AchievementInput): Metrics {
  const sessions = log.length;
  const totalVolume = log.reduce((a, s) => a + sessionVolume(s), 0);
  const bestSessionVolume = log.reduce((mx, s) => Math.max(mx, sessionVolume(s)), 0);

  // Distinct Monday-weeks present in the log → best week by volume / coverage.
  const weekRefs = [...new Set(log.map((s) => weekStartMon(new Date(s.date)).getTime()))].map(
    (t) => new Date(t),
  );
  const bestWeekVolume = weekRefs.reduce((mx, r) => Math.max(mx, weeklyVolume(log, r)), 0);
  const coverageTotal = coverageCount(weeklyMuscleVolume(log, allLib, ref)).total;
  const bestCoverage = weekRefs.reduce(
    (mx, r) => Math.max(mx, coverageCount(weeklyMuscleVolume(log, allLib, r)).hit),
    0,
  );

  let totalSets = 0;
  let ratedSets = 0;
  for (const s of log) {
    for (const ex of s.exercises ?? []) {
      for (const st of workSets(ex.sets)) {
        if (!isFilled(st)) continue;
        totalSets++;
        if (st.rir != null) ratedSets++;
      }
    }
  }

  const prs = prTimeline(log);
  const deloadDone = !!settings.lastDeloadDate && log.some((s) => s.isDeload);

  return {
    sessions,
    totalVolume,
    bestSessionVolume,
    bestWeekVolume,
    streak: weeklyStreak(log, ref),
    prCount: prs.length,
    prStreak: prStreakWeeks(log, ref),
    bestCoverage,
    coverageTotal: coverageTotal || 9,
    totalSets,
    ratedSets,
    deloadDone,
  };
}

interface AchievementDef {
  id: string;
  title: string;
  desc: string;
  icon: LucideIcon;
  tier: Tier;
  evaluate: (m: Metrics) => AchievementResult;
}

const CATALOG: AchievementDef[] = [
  {
    id: "first_session",
    title: "Erste Einheit",
    desc: "Die erste aufgezeichnete Einheit.",
    icon: Flame,
    tier: "bronze",
    evaluate: (m) => ({
      unlocked: m.sessions >= 1,
      progress: ratio(m.sessions, 1),
      valueLabel: `${m.sessions} ${m.sessions === 1 ? "Einheit" : "Einheiten"}`,
    }),
  },
  {
    id: "fifty_sessions",
    title: "50 Einheiten",
    desc: "Fünfzig Einheiten im Logbuch.",
    icon: Award,
    tier: "gold",
    evaluate: (m) => ({
      unlocked: m.sessions >= 50,
      progress: ratio(m.sessions, 50),
      valueLabel: `${m.sessions}/50`,
    }),
  },
  {
    id: "ton_session",
    title: "Eine Tonne am Stück",
    desc: "1.000 kg Volumen in einer einzigen Einheit.",
    icon: Dumbbell,
    tier: "silber",
    evaluate: (m) => ({
      unlocked: m.bestSessionVolume >= 1000,
      progress: ratio(m.bestSessionVolume, 1000),
      valueLabel: tonnes(m.bestSessionVolume),
    }),
  },
  {
    id: "ten_ton_week",
    title: "10-Tonnen-Woche",
    desc: "10.000 kg in einer Woche bewegt.",
    icon: Mountain,
    tier: "gold",
    evaluate: (m) => ({
      unlocked: m.bestWeekVolume >= 10000,
      progress: ratio(m.bestWeekVolume, 10000),
      valueLabel: tonnes(m.bestWeekVolume),
    }),
  },
  {
    id: "ten_ton_total",
    title: "10 Tonnen gesamt",
    desc: "Insgesamt 10.000 kg bewegt.",
    icon: Zap,
    tier: "bronze",
    evaluate: (m) => ({
      unlocked: m.totalVolume >= 10000,
      progress: ratio(m.totalVolume, 10000),
      valueLabel: tonnes(m.totalVolume),
    }),
  },
  {
    id: "streak_10",
    title: "10 Wochen am Stück",
    desc: "Zehn Wochen ohne Lücke (3×/Woche).",
    icon: Flame,
    tier: "gold",
    evaluate: (m) => ({
      unlocked: m.streak >= 10,
      progress: ratio(m.streak, 10),
      valueLabel: `${m.streak} Wo`,
    }),
  },
  {
    id: "full_coverage",
    title: "Ganzkörper-Woche",
    desc: "Alle Muskelgruppen in einer Woche getroffen.",
    icon: Layers,
    tier: "silber",
    evaluate: (m) => ({
      unlocked: m.bestCoverage >= m.coverageTotal,
      progress: ratio(m.bestCoverage, m.coverageTotal),
      valueLabel: `${m.bestCoverage}/${m.coverageTotal}`,
    }),
  },
  {
    id: "first_pr",
    title: "Erster Rekord",
    desc: "Den ersten persönlichen Rekord geknackt.",
    icon: Medal,
    tier: "bronze",
    evaluate: (m) => ({
      unlocked: m.prCount >= 1,
      progress: ratio(m.prCount, 1),
      valueLabel: `${m.prCount}`,
    }),
  },
  {
    id: "pr_collector",
    title: "Zehn Rekorde",
    desc: "Insgesamt zehn persönliche Rekorde.",
    icon: Trophy,
    tier: "gold",
    evaluate: (m) => ({
      unlocked: m.prCount >= 10,
      progress: ratio(m.prCount, 10),
      valueLabel: `${m.prCount}/10`,
    }),
  },
  {
    id: "pr_hattrick",
    title: "PR-Hattrick",
    desc: "Drei Wochen in Folge mit einem Rekord.",
    icon: TrendingUp,
    tier: "silber",
    evaluate: (m) => ({
      unlocked: m.prStreak >= 3,
      progress: ratio(m.prStreak, 3),
      valueLabel: `${m.prStreak} Wo`,
    }),
  },
  {
    id: "hundred_sets",
    title: "100 Sätze",
    desc: "Hundert Arbeitssätze gesammelt.",
    icon: Repeat,
    tier: "silber",
    evaluate: (m) => ({
      unlocked: m.totalSets >= 100,
      progress: ratio(m.totalSets, 100),
      valueLabel: `${m.totalSets}/100`,
    }),
  },
  {
    id: "clean_rir",
    title: "Saubere Steuerung",
    desc: "Fünfzig Sätze mit RIR bewertet (Autoregulation).",
    icon: Target,
    tier: "silber",
    evaluate: (m) => ({
      unlocked: m.ratedSets >= 50,
      progress: ratio(m.ratedSets, 50),
      valueLabel: `${m.ratedSets}/50`,
    }),
  },
  {
    id: "deload_discipline",
    title: "Deload-Disziplin",
    desc: "Eine Entlastungswoche bewusst eingehalten.",
    icon: Shield,
    tier: "silber",
    evaluate: (m) => ({
      unlocked: m.deloadDone,
      progress: m.deloadDone ? 1 : 0,
      valueLabel: m.deloadDone ? "erledigt" : "offen",
    }),
  },
];

/** All achievements with their current unlock/progress state. Computes the shared
 *  metrics once, then evaluates each badge against it. */
export function evaluateAchievements(input: AchievementInput): AchievementView[] {
  const m = computeMetrics(input);
  return CATALOG.map(({ evaluate, ...rest }) => ({ ...rest, ...evaluate(m) }));
}

function levelTitle(level: number): string {
  if (level <= 1) return "Neuling";
  if (level >= 11) return "Athlet";
  const band = ["Anfänger", "Fortgeschritten", "Erfahren"][Math.floor((level - 2) / 3)];
  const roman = ["I", "II", "III"][(level - 2) % 3];
  return `${band} ${roman}`;
}

/** Current training level + progress toward the next, from the same metrics. */
export function trainingLevel(input: AchievementInput): TrainingLevel {
  const m = computeMetrics(input);
  const xp =
    4 * m.sessions +
    Math.round(m.totalVolume / 1000) +
    12 * m.prCount +
    8 * m.streak +
    5 * m.bestCoverage;
  const xpToReach = (n: number) => Math.round(50 * Math.pow(Math.max(0, n - 1), 1.6));
  let level = 1;
  while (level < 200 && xp >= xpToReach(level + 1)) level++;
  const floor = xpToReach(level);
  const next = xpToReach(level + 1);
  return {
    level,
    title: levelTitle(level),
    xp,
    xpForNext: next,
    pct: clamp01((xp - floor) / ((next - floor) || 1)),
  };
}
