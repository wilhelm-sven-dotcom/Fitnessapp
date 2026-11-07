import { kindsAcross, sessionBest, type RecordKind } from "@/lib/records";
import { isFilled, workSets } from "@/lib/stats";
import type { LoggedSession } from "@/lib/types";

/**
 * Verlauf je Übung — EINE Quelle für die Übersicht (Liste mit Mini-Kurve)
 * und das Übungsdetail (Kurve, Bestwert). Die Art der Kennzahl gilt über die
 * GANZE Historie (`kindsAcross`, wie die Rekorde): früher entschied jede
 * Einheit selbst, und eine Einheit ohne Gewicht setzte Wiederholungen auf
 * die 1RM-Kurve.
 */

export interface SeriesPoint {
  date: string;
  /** Gerundetes geschätztes 1RM (kg), Wiederholungen oder Sekunden. */
  value: number;
  /** Bester Satz der Einheit, fertig formatiert („22,5 kg × 8“, „12 Wdh“, „45 s“). */
  label: string;
}

export interface ExerciseSeries {
  id: string;
  name: string;
  kind: RecordKind;
  /** Älteste zuerst. */
  points: SeriesPoint[];
  best: number;
  bestPt: SeriesPoint;
  latest: SeriesPoint;
  /** Die letzte Einheit hält den Bestwert (und es gab mehr als eine). */
  isPR: boolean;
}

/** Beschriftung der Kennzahl je Art. */
export const KENNZAHL: Record<RecordKind, string> = {
  weight: "geschätztes 1RM",
  reps: "Wiederholungen",
  time: "Haltezeit",
};

/** „105 kg“ / „15 Wdh“ / „60 s“. */
export function fmtKennzahl(kind: RecordKind, v: number): string {
  return `${v.toLocaleString("de-DE")} ${kind === "weight" ? "kg" : kind === "time" ? "s" : "Wdh"}`;
}

/** Alle Übungen mit Verlauf, zuletzt trainierte zuerst. */
export function exerciseSeries(log: LoggedSession[]): ExerciseSeries[] {
  const sorted = [...log].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const kinds = kindsAcross(sorted);
  const map = new Map<string, { id: string; name: string; kind: RecordKind; points: SeriesPoint[] }>();
  for (const s of sorted) {
    for (const ex of s.exercises ?? []) {
      const sets = workSets(ex.sets ?? []).filter(isFilled);
      if (!sets.length) continue;
      const kind = kinds[ex.id] ?? "reps";
      const { value, label } = sessionBest(kind, sets);
      // Gewichtsübung, an dem Tag ohne Gewicht: kein Punkt (sonst Wdh auf
      // der kg-Kurve) — genau wie bei den Rekorden.
      if (value <= 0) continue;
      const e = map.get(ex.id) ?? { id: ex.id, name: ex.name, kind, points: [] };
      e.points.push({
        date: s.date,
        value,
        label: kind === "weight" ? label.replace(" × ", " kg × ") : label,
      });
      map.set(ex.id, e);
    }
  }
  return [...map.values()]
    .map((e) => {
      const best = Math.max(...e.points.map((p) => p.value));
      const bestPt = e.points.find((p) => p.value === best)!;
      const latest = e.points[e.points.length - 1];
      return { ...e, best, bestPt, latest, isPR: e.points.length > 1 && latest.value >= best };
    })
    .sort((a, b) => new Date(b.latest.date).getTime() - new Date(a.latest.date).getTime());
}

/** Verlauf EINER Übung (null ohne Einträge). */
export function seriesFor(log: LoggedSession[], exId: string): ExerciseSeries | null {
  return exerciseSeries(log).find((e) => e.id === exId) ?? null;
}
