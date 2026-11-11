/**
 * Bilder für besondere Momente und leere Seiten (`public/momente/`, aus dem
 * ChatGPT-Prompt, Block M). Querformate (Begrüßung, Ort-Kacheln) gibt es in
 * 1200 × 800 und 600 × 400 (`klein`), die Sticker (Rekord, gespeichert, leere
 * Seiten) in 512 × 512 mit durchsichtigem Grund.
 */
export type Moment =
  | "begruessung"
  | "ort-zuhause"
  | "ort-studio"
  | "rekord"
  | "gespeichert"
  | "verlauf-leer"
  | "uebersicht-leer"
  | "koerper-leer"
  | "nichts-gefunden"
  | "atlas-aus";

const QUER: ReadonlySet<Moment> = new Set<Moment>(["begruessung", "ort-zuhause", "ort-studio"]);

/** Hochzählen, wenn ein Bild ersetzt wird (der Service Worker cacht die URL
 *  dauerhaft). */
const MOMENTE_STAND = 1;

export function momentUrl(m: Moment, klein = false): string {
  const groesse = klein && QUER.has(m) ? "-klein" : "";
  return `/momente/${m}${groesse}.webp?v=${MOMENTE_STAND}`;
}
