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

// EIN Formatierer für alle Gewichte: `toLocaleString` baut ihn bei jedem
// Aufruf neu, das kostete im Verlauf mit vielen Einheiten Sekunden.
const GEWICHT_FORMAT = new Intl.NumberFormat("de-DE", {
  maximumFractionDigits: 2,
  useGrouping: false,
});

/** Ladbares Gewicht (Hantelstufe 1,25/2,5/5) mit Komma: „20“, „22,5“,
 *  „81,25“. Anders als `fmtKg` NICHT auf eine Stelle gerundet — sonst
 *  stünde bei 1,25er-Stufen „81,3“ da, was keine Scheibe hergibt. */
export function fmtGewicht(kg: number | string): string {
  const n = typeof kg === "number" ? kg : parseFloat(String(kg).replace(",", "."));
  if (!Number.isFinite(n)) return String(kg);
  return GEWICHT_FORMAT.format(n);
}

/** Ein Satz in einer Schreibweise für Zeile, Karte, Dock und Abschluss:
 *  „22,5 kg × 12“ (mit Gewicht), „12 Wdh“ (ohne), „45 s“ (gehalten). */
export function fmtSatz(
  weight: string | number | undefined | null,
  reps: string | number | undefined | null,
  timed: boolean,
): string {
  const r = reps == null ? "" : String(reps);
  if (timed) return r ? `${r} s` : "";
  const kg = Number(String(weight ?? "").replace(",", "."));
  if (weight !== "" && weight != null && Number.isFinite(kg) && kg > 0)
    return `${fmtGewicht(kg)} kg × ${r}`.trim();
  return r ? `${r} Wdh` : "";
}

/** Veränderung mit Vorzeichen und Komma: „+0,5 kg“, „−1,5 kg“ (echtes
 *  Minuszeichen), „0,0 cm“. Eine Nachkommastelle. */
export function fmtDelta(d: number, unit: string): string {
  const r = Math.round(d * 10) / 10;
  const betrag = Math.abs(r).toLocaleString("de-DE", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
  return `${r > 0 ? "+" : r < 0 ? "−" : ""}${betrag} ${unit}`;
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
