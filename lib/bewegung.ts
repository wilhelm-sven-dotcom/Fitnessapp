/**
 * Bewegungsbilder (`public/bewegung/`): je Übung bzw. Aufwärmübung eine Datei
 * mit vier Phasen nebeneinander (Start, zwei Zwischenschritte, Umkehrpunkt),
 * geschnitten aus den ChatGPT-Rastern (siehe README dort). Die App spielt sie
 * als Bewegung ab (`components/bewegung/BewegungsBild.tsx`). Übungen ohne
 * Bild zeigen weiter die Phasenfigur.
 *
 * Kennung = Übungs-Id aus `lib/exercises.ts` bzw. Drill-Id aus `lib/warmup.ts`.
 * Neues Bild: Dateien ablegen und die Kennung hier eintragen.
 */
const MIT_BEWEGUNG: ReadonlySet<string> = new Set([
  // Zuhause (Z)
  "goblet",
  "walking_lunge",
  "rdl_db",
  "bench_db",
  "ohp_stand",
  "pullup",
  "curl",
  "lateral",
  "crunch",
  "calf_raise_bw",
  // Studio (S)
  "pec_deck",
  "reverse_fly_machine",
  "pull_through",
  "straight_arm_pulldown",
  // Aufwärmen (A)
  "march_high",
  "cat_cow",
  "side_plank_dip",
  "scap_pushup",
  "band_pullapart",
  "wall_slides",
  "side_steps",
  "pogo_calf",
  "pallof",
]);

/** Hochzählen, wenn ein Bild ersetzt wird: der Service Worker cacht die URL
 *  dauerhaft, erst ein neuer `?v=` holt die neue Datei. */
const BEWEGUNG_STAND = 1;

/** Gibt es zu dieser Übung ein Bewegungsbild? */
export function hatBewegung(id: string | null | undefined): boolean {
  return !!id && MIT_BEWEGUNG.has(id);
}

/** URL des Bewegungsbilds oder null. `klein` = Phasen je 360 × 240 (Kachel
 *  auf der Trainingskarte), sonst je 720 × 480. */
export function bewegungUrl(id: string | null | undefined, klein = false): string | null {
  if (!hatBewegung(id)) return null;
  return `/bewegung/${id}${klein ? "-klein" : ""}.webp?v=${BEWEGUNG_STAND}`;
}

/** Alle Kennungen mit Bild (für Tests und Prüfskripte). */
export const BEWEGUNGEN: readonly string[] = [...MIT_BEWEGUNG];
