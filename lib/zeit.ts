/**
 * Zeit-Grundlagen der App an einer Stelle: ein Tag und eine Woche in
 * Millisekunden und der Wochenanfang.
 *
 * Die Woche beginnt überall am Montag (Wochenleiste, Serie, Sätze je Muskel,
 * Rekorde je Woche, Mission, Wochen-Rückblick). Vorher stand dieselbe Rechnung
 * zehnmal im Code — eine abweichende Kopie hätte zwei Bildschirme mit zwei
 * verschiedenen „dieser Woche“ ergeben.
 */

/** Ein Tag in Millisekunden. */
export const TAG_MS = 86_400_000;

/** Eine Woche in Millisekunden. */
export const WOCHE_MS = 7 * TAG_MS;

/** Montag 00:00 Uhr (Ortszeit) der Woche, in der `d` liegt. Gibt immer ein
 *  neues Datum zurück — der Aufrufer darf es verändern. */
export function weekStartMon(d: Date = new Date()): Date {
  const off = (d.getDay() + 6) % 7;
  const m = new Date(d);
  m.setHours(0, 0, 0, 0);
  m.setDate(d.getDate() - off);
  return m;
}
