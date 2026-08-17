import type { LoggedSession } from "@/lib/types";

/**
 * Platten-Nummerierung „Platte 311": jede gespeicherte Einheit ist eine
 * fotografische Platte mit laufender Nummer. Die Nummer wird IMMER aus dem
 * Log ABGELEITET und nie persistiert — löscht der Athlet eine Platte,
 * rücken die folgenden auf (das Archiv kennt keine Registerlücken;
 * akzeptierte Konsequenz der Ableitung).
 */

/** Nummer der NÄCHSTEN Platte (die heutige, noch unbelichtete Studie). */
export function plattenNummer(log: LoggedSession[]): number {
  return log.length + 1;
}

/** Nummer einer gespeicherten Platte: chronologischer Index + 1.
 *  `log` in Speicher-Reihenfolge (neueste zuerst ODER älteste zuerst —
 *  wir sortieren defensiv nach Datum). */
export function plattenNummerOf(log: LoggedSession[], session: LoggedSession): number {
  const sorted = [...log].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );
  const idx = sorted.indexOf(session);
  return (idx === -1 ? sorted.length : idx) + 1;
}

/** Katalogschild-Datum: „SO 17. AUG" — versal gesetzt via CSS. */
export function fmtPlatteDatum(d: Date = new Date()): string {
  const wd = d.toLocaleDateString("de-DE", { weekday: "short" }).replace(".", "");
  const tag = d.getDate();
  const monat = d.toLocaleDateString("de-DE", { month: "short" }).replace(".", "");
  return `${wd} ${tag}. ${monat}`;
}
