import type { LastPerf, LoggedSession, SetEntry } from "@/lib/types";

/** Nur ein gefüllter ARBEITSSATZ zählt als Leistung — ein Eintrag nur aus
 *  Aufwärmsätzen (vorbelegte Wiederholungen) würde den nächsten Vorschlag auf
 *  „3 × 1“ zusammenfallen lassen. */
export const hatArbeitssatz = (sets?: SetEntry[]): boolean =>
  !!sets && sets.some((s) => !s.warmup && s.reps !== "" && s.reps != null);

/**
 * Letzte Leistung einer Übung — der AUSGANGSWERT für den nächsten Vorschlag.
 *
 * Entlastungs- und Test-Einheiten zählen dafür nicht: In der Entlastungswoche
 * stehen bewusst 60 % auf der Stange, am Testtag ein schwerer Dreier. Vorher
 * rechnete die App nach einer Entlastung von den 60 % weiter (und in der
 * Entlastungswoche selbst ab der zweiten Einheit 60 % von 60 %), nach einem
 * Testtag vom Testgewicht. Gibt es NUR solche Einheiten, gilt die jüngste
 * davon — besser ein schiefer Anker als gar keiner.
 *
 * Erwartet den Verlauf chronologisch (älteste zuerst), wie er gespeichert ist.
 */
export function lastPerfOf(log: readonly LoggedSession[], id: string): LastPerf | null {
  let ersatz: LastPerf | null = null;
  for (let i = log.length - 1; i >= 0; i--) {
    const s = log[i];
    const ex = s.exercises?.find((e) => e.id === id);
    if (!ex || !hatArbeitssatz(ex.sets)) continue;
    const lp: LastPerf = { sets: ex.sets, date: s.date, note: ex.note };
    if (!s.isDeload && !s.isExam) return lp;
    ersatz ??= lp;
  }
  return ersatz;
}
