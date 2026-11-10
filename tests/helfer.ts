/**
 * Bausteine für die Unit-Tests (`npm test`): echte Übungen aus dem Katalog,
 * zwei Orte (Zuhause, Studio nur an Geräten) und kurze Schreibweisen für
 * Sätze und Einheiten.
 */
import { DEFAULT_EQUIP, LIB, STUDIO_EQUIP } from "@/lib/exercises";
import { hasFuer } from "@/lib/orte";
import type { Exercise, LoggedSession, SessionExercise, SetEntry } from "@/lib/types";

/** Übung aus dem Katalog, optional mit Plan-Werten. */
export function ex(id: string, plan: Partial<Exercise> = {}): Exercise {
  const e = LIB.find((x) => x.id === id);
  if (!e) throw new Error(`Übung ${id} gibt es nicht`);
  return { ...e, ...plan };
}

export const hasZuhause = hasFuer({ equip: DEFAULT_EQUIP, nurGeraete: false });
export const hasStudio = hasFuer({ equip: STUDIO_EQUIP, nurGeraete: true });

/** Ein Arbeitssatz. */
export const satz = (weight: number | string, reps: number, rir?: number): SetEntry => ({
  weight: String(weight),
  reps: String(reps),
  ...(rir == null ? {} : { rir }),
});

/** Ein Aufwärmsatz. */
export const warm = (weight: number, reps = 5): SetEntry => ({
  weight: String(weight),
  reps: String(reps),
  warmup: true,
});

export const uebung = (id: string, sets: SetEntry[]): SessionExercise => {
  const e = ex(id);
  return { id, name: e.name, unit: e.unit, sets };
};

/** Einheit vor `tage` Tagen (ISO-Datum relativ zu jetzt). */
export function einheit(
  tage: number,
  exercises: SessionExercise[],
  mehr: Partial<LoggedSession> = {},
): LoggedSession {
  return {
    date: new Date(Date.now() - tage * 86_400_000).toISOString(),
    dayKey: "today",
    dayName: "Ganzkörper",
    focus: "",
    exercises,
    ...mehr,
  };
}
