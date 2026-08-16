export const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("de-DE", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
  });

/** Short date for charts/records: 15.06.24 */
export const fmtDateShort = (iso: string) =>
  new Date(iso).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  });

export function fmtClock(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

/** kg mit deutschem Dezimalkomma, ohne nachlaufendes ",0" — zentral, statt
 *  lokaler Kopien in equipment/trainer/… */
export function fmtKg(kg: number): string {
  return (Math.round(kg * 10) / 10).toString().replace(".", ",");
}

export const fmtPct = (x: number) => `${Math.round(x * 100)} %`;

/** Ganze Kalendertage seit ISO-Datum — auf lokale Mitternacht normalisiert,
 *  damit „gestern Abend → heute früh" nicht auf 0 Tage kippt. Nie negativ. */
export function daysSince(iso: string): number {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return 0;
  d.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.max(0, Math.round((today.getTime() - d.getTime()) / 86_400_000));
}

/** „heute" · „gestern" · „vor N Tagen" — für die Letztes-Mal-Karte. */
export function fmtDaysAgo(iso: string): string {
  if (isNaN(new Date(iso).getTime())) return "—";
  const n = daysSince(iso);
  if (n === 0) return "heute";
  if (n === 1) return "gestern";
  return `vor ${n} Tagen`;
}

/** ISO-Kalenderwoche (Mo-basiert) — von lib/trainer re-exportiert. */
export function isoWeek(ref: Date = new Date()): number {
  const t = new Date(ref.getTime());
  t.setHours(0, 0, 0, 0);
  t.setDate(t.getDate() + 3 - ((t.getDay() + 6) % 7));
  const week1 = new Date(t.getFullYear(), 0, 4);
  return (
    1 +
    Math.round(
      ((t.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7,
    )
  );
}
