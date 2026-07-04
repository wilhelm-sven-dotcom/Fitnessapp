/* „Das Magazin" — jeder Trainingsmonat wird eine Ausgabe. Rein deterministisch
   (offline, kein API-Call): gleicher Log ⇒ exakt dieselbe Ausgabe, für immer. */

import { prTimeline, recordUnit, type PrEvent } from "@/lib/records";
import { isFilled, sessionVolume, workSets } from "@/lib/stats";
import { exerciseMuscleVolume, MUSCLE_LABEL } from "@/lib/volume";
import type { Exercise, LoggedSession, Muscle, Pattern } from "@/lib/types";

export interface MagazineIssue {
  /** Chronologische Ausgaben-Nummer ab 1 (der laufende Monat zählt mit). */
  nr: number;
  /** "2026-06" — lokale Zeitzone, wie der Rest der App rechnet. */
  monthKey: string;
  /** "Juni 2026" */
  monthLabel: string;
  /** Laufender Monat → „Ausgabe im Entstehen" (Live-Zahlen, kein Share). */
  current: boolean;
  sessions: number;
  tonnageT: number;
  prs: PrEvent[];
  topMuscles: { muscle: Muscle; label: string; sets: number }[];
  avgRir: number | null;
  /** Anton-Cover-Zeile (uppercase). */
  headline: string;
  headlineSub: string;
  /** Exakt zwei Absätze ATLAS-Kolumne. */
  column: string[];
}

export function monthKeyOf(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabelOf(key: string): string {
  const [y, m] = key.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("de-DE", { month: "long", year: "numeric" });
}

/** Ausgaben-stabiler Seed: eine alte Ausgabe schreibt sich NIE um (kein daySeed). */
function issueSeed(key: string): number {
  const [y, m] = key.split("-").map(Number);
  return y * 12 + (m - 1);
}

const pick = <T,>(arr: T[], seed: number): T => arr[Math.abs(seed) % arr.length];

const fmtT = (t: number) => String(t).replace(".", ",");

const OPENERS = ["Der Monat in Zahlen:", "Bilanz:", "Schwarz auf Weiß:", "Was zählt:"];
const OUTLOOKS = [
  "Nächste Ausgabe: mehr Last, gleiche Präzision. Ich beobachte.",
  "Der Plan steht. Du lieferst, ich dokumentiere.",
  "Konstanz schlägt Ekstase — genau so weiter.",
  "Das war kein Zufall. Wiederhol es.",
];
const PR_SUBS = [
  "Die Marke stand lange. Jetzt steht deine.",
  "Sauber aufgebaut, hart abgeholt.",
  "Kein Glückstreffer — das war Arbeit.",
  "Der Rest des Monats hat zugearbeitet.",
];

/**
 * Baut alle Ausgaben aus dem Log: Monats-Bucketing, PRs aus der GESAMT-Timeline
 * (nie pro Monats-Slice — sonst zählt der erste Wert eines Monats fälschlich
 * als Bestmarke), Top-Muskeln, Ø-RIR, deterministische Headline + Kolumne.
 * Rückgabe: neueste Ausgabe zuerst.
 */
export function buildIssues(
  log: LoggedSession[],
  allLib: Exercise[],
  ref: Date = new Date(),
): MagazineIssue[] {
  const byMonth = new Map<string, LoggedSession[]>();
  for (const s of log) {
    if (!s?.date) continue;
    const k = monthKeyOf(s.date);
    const arr = byMonth.get(k);
    if (arr) arr.push(s);
    else byMonth.set(k, [s]);
  }
  const keys = [...byMonth.keys()].sort();
  if (!keys.length) return [];

  const allPrs = prTimeline(log);
  const byId = new Map(allLib.map((e) => [e.id, e] as const));
  const curKey = monthKeyOf(ref);
  let bestTonnageBefore = 0;

  const issues = keys.map((key, idx) => {
    const sessions = byMonth.get(key)!;
    const volKg = sessions.reduce((a, s) => a + sessionVolume(s), 0);
    const tonnageT = Math.round(volKg / 100) / 10;
    const prs = allPrs.filter((e) => monthKeyOf(e.date) === key);

    const items = sessions.flatMap((s) =>
      (s.exercises ?? []).map((se) => ({
        ex: byId.get(se.id) ?? { id: se.id, pattern: "core" as Pattern },
        sets: workSets(se.sets ?? []).filter(isFilled).length,
      })),
    );
    const topMuscles = exerciseMuscleVolume(items)
      .filter((m) => m.sets > 0)
      .sort((a, b) => b.sets - a.sets)
      .slice(0, 3)
      .map((m) => ({ muscle: m.muscle, label: MUSCLE_LABEL[m.muscle], sets: m.sets }));

    let rirSum = 0;
    let rirN = 0;
    for (const s of sessions)
      for (const e of s.exercises ?? [])
        for (const st of workSets(e.sets ?? []).filter(isFilled))
          if (st.rir != null) {
            rirSum += st.rir;
            rirN++;
          }
    const avgRir = rirN ? Math.round((rirSum / rirN) * 10) / 10 : null;

    // Headline-Kaskade: größter relativer PR-Sprung → Tonnage-Bestmonat → Schichten.
    const seed = issueSeed(key);
    const topPr = [...prs].sort(
      (a, b) => (b.value - b.prev) / b.prev - (a.value - a.prev) / a.prev,
    )[0];
    const isTonnageRecord = idx > 0 && tonnageT > bestTonnageBefore;
    let headline: string;
    let headlineSub: string;
    if (topPr) {
      headline = `${topPr.name}: ${topPr.value} ${recordUnit(topPr.kind)}`.toUpperCase();
      headlineSub = pick(PR_SUBS, seed);
    } else if (isTonnageRecord) {
      headline = "REKORDMONAT";
      headlineSub = `${fmtT(tonnageT)} Tonnen bewegt — dein Bestwert.`;
    } else {
      headline = `${sessions.length} ${sessions.length === 1 ? "SCHICHT" : "SCHICHTEN"}`;
      headlineSub = "Eingezahlt aufs Fundament.";
    }
    bestTonnageBefore = Math.max(bestTonnageBefore, tonnageT);

    const facts =
      `${pick(OPENERS, seed)} ${sessions.length} ${sessions.length === 1 ? "Einheit" : "Einheiten"}, ` +
      `${fmtT(tonnageT)} Tonnen bewegtes Eisen` +
      (topMuscles[0] ? `, Schwerpunkt ${topMuscles[0].label}` : "") +
      ". " +
      (prs.length
        ? `${prs.length} ${prs.length === 1 ? "neue Bestmarke" : "neue Bestmarken"} — ${prs[0].name} führt die Liste an.`
        : "Keine neue Bestmarke — Basis-Arbeit, die sich später auszahlt.");
    const column = [facts, pick(OUTLOOKS, seed + 1)];

    return {
      nr: idx + 1,
      monthKey: key,
      monthLabel: monthLabelOf(key),
      current: key === curKey,
      sessions: sessions.length,
      tonnageT,
      prs,
      topMuscles,
      avgRir,
      headline,
      headlineSub,
      column,
    };
  });

  return issues.reverse();
}
