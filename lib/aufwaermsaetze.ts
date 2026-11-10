import { muscleOf } from "@/lib/volume";
import type { Exercise, Muscle } from "@/lib/types";

/**
 * Welche Übungen einer Einheit Aufwärmsätze bekommen.
 *
 * Regel (Nutzer-Entscheid Nov 2026): die zwei Aufwärmsätze nur noch bei der
 * ERSTEN gewichteten Übung für einen Muskel — also wenn ihr Hauptmuskel in
 * der Einheit noch nicht dran war, weder als Haupt- noch als Nebenmuskel
 * einer früheren Übung. Vorher bekam jede gewichtete Übung zwei Aufwärmsätze;
 * bei sechs Übungen gingen so rund zehn Minuten in Sätze, die den Muskel
 * nicht mehr aufwärmen mussten.
 *
 * Eine Quelle für Vorbelegung (`lib/active-session.ts`) und Zeitschätzung
 * (`lib/session-time.ts`), damit Plan und Uhr dasselbe meinen. Gibt je Übung
 * `true` zurück, wenn sie Aufwärmsätze bekommt; unbekannte Übungen und Cardio
 * bekommen nie welche und wärmen auch nichts vor.
 */
export function aufwaermPlan(
  reihe: readonly (Pick<Exercise, "id" | "pattern" | "weighted" | "tag" | "muscle" | "muscleSecondary"> | undefined | null)[],
): boolean[] {
  const warm = new Set<Muscle>();
  return reihe.map((ex) => {
    if (!ex || ex.pattern === "cardio") return false;
    const { primary, secondary } = muscleOf(ex);
    const braucht = !!ex.weighted && !warm.has(primary);
    warm.add(primary);
    if (secondary) warm.add(secondary);
    return braucht;
  });
}
