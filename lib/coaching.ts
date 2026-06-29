import { isFilled, oneRm, workSets } from "@/lib/stats";
import type { Exercise, LoggedSession, Prescription, SetEntry } from "@/lib/types";

export type ChipTone = "amber" | "emerald" | "info";
export interface Chip {
  tone: ChipTone;
  text: string;
}

/** Working, filled sets of one exercise across every session it appears in. */
function historyForEx(log: LoggedSession[], id: string): SetEntry[] {
  const out: SetEntry[] = [];
  log.forEach((s) => {
    const ex = s.exercises.find((e) => e.id === id);
    if (ex) out.push(...workSets(ex.sets).filter(isFilled));
  });
  return out;
}

/**
 * Context-sensitive cues for a single exercise during a workout.
 * Recomputed as the athlete enters sets, so the PR chip appears live.
 */
export function exerciseChips(opts: {
  ex: Exercise;
  prescription: Prescription;
  log: LoggedSession[];
  currentSets: SetEntry[];
}): Chip[] {
  const { ex, prescription, log, currentSets } = opts;
  const chips: Chip[] = [];
  const hist = historyForEx(log, ex.id);
  const cur = currentSets.filter((s) => !s.warmup && isFilled(s));

  // First time at a heavier weight than ever before.
  if (ex.weighted && prescription.suggestedWeight != null) {
    const maxW = Math.max(0, ...hist.map((s) => Number(s.weight) || 0));
    if (maxW > 0 && prescription.suggestedWeight > maxW) {
      chips.push({
        tone: "amber",
        text: `Erste Session mit ${prescription.suggestedWeight} kg — nimm dir Zeit.`,
      });
    }
  }

  // A set better than ever before.
  if (cur.length && hist.length) {
    let best = 0;
    let now = 0;
    if (ex.unit === "Sek" || !ex.weighted) {
      best = Math.max(0, ...hist.map((s) => Number(s.reps) || 0));
      now = Math.max(0, ...cur.map((s) => Number(s.reps) || 0));
    } else {
      best = Math.max(0, ...hist.map((s) => oneRm(Number(s.weight) || 0, Number(s.reps) || 0)));
      now = Math.max(0, ...cur.map((s) => oneRm(Number(s.weight) || 0, Number(s.reps) || 0)));
    }
    if (best > 0 && now > best) {
      chips.push({ tone: "emerald", text: "Neuer Rekord — gut gemacht." });
    }
  }

  // Unusually high RIR on an exercise that is normally taken near failure.
  const histRir = hist.map((s) => s.rir).filter((x): x is number => x != null);
  if (histRir.length >= 2) {
    const avg = histRir.reduce((a, b) => a + b, 0) / histRir.length;
    const curRir = cur.map((s) => s.rir).filter((x): x is number => x != null);
    if (avg <= 1.5 && curRir.some((r) => r > 3)) {
      chips.push({ tone: "info", text: "Hast du heute wenig geschlafen?" });
    }
  }

  return chips;
}

/** Time-of-day greeting, optionally personalized with the user's name. */
/** Time-of-day greeting word. */
function dayPart(h: number): string {
  if (h >= 5 && h < 11) return "Guten Morgen";
  if (h >= 11 && h < 17) return "Guten Tag";
  if (h >= 17 && h < 23) return "Guten Abend";
  return "Gute Nacht";
}

/**
 * Home headline. A rotating pool of lines — time-of-day classics plus
 * motivational cues — so the greeting feels fresh on every open. `seed` picks
 * one (the caller varies it per mount); without a seed it returns the plain
 * time-of-day greeting (deterministic → unchanged for existing callers/tests).
 */
export function greeting(opts: { name?: string; now?: Date; seed?: number } = {}): string {
  const now = opts.now ?? new Date();
  const name = opts.name?.trim();
  const c = name ? `, ${name}` : "";
  const part = dayPart(now.getHours());
  if (opts.seed == null) return `${part}${c}.`;
  const pool = [
    `${part}${c}.`,
    `Bereit${c}?`,
    "Zeit, Eisen zu bewegen.",
    "Ein Prozent besser als gestern.",
    "Schwerkraft ist nur eine Empfehlung.",
    "Form vor Ego.",
    "Kraft kommt von Konstanz.",
    "Die Hantel wartet nicht.",
    "Letzte Wiederholung, beste Wiederholung.",
    "Stahl formt sich nicht von selbst.",
    `Auf geht's${c}.`,
    "Dein zukünftiges Ich dankt dir.",
    "Heute investierst du in morgen.",
    "Sauber heben, klar im Kopf.",
    "Jeder Satz zählt.",
    "Disziplin schlägt Motivation.",
  ];
  return pool[((opts.seed % pool.length) + pool.length) % pool.length];
}

/** Cues shown on the home screen. */
export function homeChips(opts: { daysAgo: number | null; weekCount: number }): Chip[] {
  const chips: Chip[] = [];
  if (opts.daysAgo != null && opts.daysAgo > 5) {
    chips.push({ tone: "info", text: "Länger pausiert — wir starten heute leichter." });
  }
  if (opts.weekCount >= 3) {
    chips.push({ tone: "emerald", text: "Starke Woche. Ein Ruhetag tut den Muskeln gut." });
  }
  return chips;
}
