/* „Projektion" — ATLAS rechnet die Kraft-Zukunft: für die Kernübungen mit
   genug Historie wird die nächste runde Marke bestimmt und der lineare Trend
   (lib/projection.ts, pro Woche) in eine Kalenderwochen-ETA übersetzt.
   Deterministisch; ehrliche Zustände statt Fantasie-Daten. */

import { isoWeek } from "@/lib/format";
import { exercise1RMHistory, MIN_POINTS, project, weeksToTarget } from "@/lib/projection";
import { exerciseRecords } from "@/lib/records";
import type { Exercise, LoggedSession } from "@/lib/types";

export type ProjectionState =
  /** Trend positiv, Ziel in Reichweite → ETA-KW wird genannt. */
  | "kurs"
  /** Trend flach/negativ → keine Prognose, erst Konstanz. */
  | "flach"
  /** Trend positiv, aber Ziel jenseits des Horizonts. */
  | "fern";

export interface ProjectionTarget {
  exId: string;
  name: string;
  /** Aktuelle Bestmarke (geschätztes 1RM, wie Rekord-Board/PR-Timeline). */
  current: number;
  /** Nächste runde Marke über der Bestmarke (auf weightStep gerastert). */
  targetKg: number;
  slopePerWeek: number;
  etaWeeks: number | null;
  etaKw: number | null;
  state: ProjectionState;
  /** e1RM-Serie fürs TrendChart. */
  values: number[];
}

/** Jenseits davon ist eine lineare Prognose unseriös. */
const HORIZON_WEEKS = 26;

export function projectionTargets(
  log: LoggedSession[],
  allLib: Exercise[],
  opts: { weightStep?: number; max?: number; ref?: Date } = {},
): ProjectionTarget[] {
  const { weightStep, max = 3, ref = new Date() } = opts;
  const step = Math.max(weightStep ?? 2.5, 2.5);

  const candidates = exerciseRecords(log)
    .filter((r) => r.kind === "weight")
    .map((r) => ({ r, series: exercise1RMHistory(log, allLib, r.exId) }))
    .filter((c) => c.series.length >= MIN_POINTS)
    // Deterministisch: meiste Datenpunkte zuerst, dann stabiler Id-Tiebreak.
    .sort((a, b) => b.series.length - a.series.length || a.r.exId.localeCompare(b.r.exId))
    .slice(0, max);

  return candidates.map(({ r, series }) => {
    const current = series.reduce((m, p) => Math.max(m, p.value), 0);
    const targetKg = Math.floor(current / step) * step + step;
    const p = project(series, 8);
    const slopePerWeek = p?.slopePerWeek ?? 0;
    const etaWeeks = slopePerWeek > 0.01 ? weeksToTarget(series, targetKg) : null;
    const state: ProjectionState =
      etaWeeks == null ? "flach" : etaWeeks > HORIZON_WEEKS ? "fern" : "kurs";
    const etaKw =
      state === "kurs" && etaWeeks != null
        ? isoWeek(new Date(ref.getTime() + etaWeeks * 7 * 86400000))
        : null;
    return {
      exId: r.exId,
      name: r.name,
      current,
      targetKg,
      slopePerWeek,
      etaWeeks,
      etaKw,
      state,
      values: series.map((pt) => pt.value),
    };
  });
}
