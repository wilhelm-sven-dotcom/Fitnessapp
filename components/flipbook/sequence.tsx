/**
 * „Die Mischung" — die von Sven gewählte Daumenkino-Sequenz für den Boot.
 * Rhythmus wie das große Vorbild: überwiegend ruhige Tusche- und Technik-
 * Tafeln, unterbrochen von gezielten Farb-Momenten; Finale ist die rote
 * TRAINING-Karte, über deren Ränder die Motive hinausfliegen.
 */
import { ARCHIV } from "./plates-archiv";
import { BLAUPAUSE } from "./plates-blaupause";
import { ZOETROP } from "./plates-zoetrop";
import { KABINETT } from "./plates-kabinett";
import { GRANDE } from "./plates-grande";
import type { FlipConcept } from "./types";

const seq: [FlipConcept, number][] = [
  [ARCHIV, 0], // Kugelhantel — Papier, dezent
  [BLAUPAUSE, 0], // Langhantel — dunkle Technik
  [GRANDE, 0], // Gerätewand — dichter Farbbogen
  [ARCHIV, 1], // Bewegungsstudie — Papier
  [BLAUPAUSE, 2], // Hantelbahn — dunkel + Cyan
  [KABINETT, 3], // Stoppuhr — Gold, mild
  [GRANDE, 2], // Trophäen-Schwarm — DER Farb-Moment
  [ARCHIV, 5], // Ringe — Papier
  [ZOETROP, 0], // eine Bernstein-Phase — dunkel
  [GRANDE, 10], // KRAFT!-Plakat — rote Type
  [BLAUPAUSE, 3], // Winkelmesser — dunkel
  [GRANDE, 5], // rote Knallkarte
  [ARCHIV, 7], // Herz — Papier + Rot
  [KABINETT, 2], // Bahnrad — mild Grün
  [BLAUPAUSE, 6], // Zugmesser — dunkel
  [GRANDE, 4], // der Athlet — Papier, koloriert
];

export const FLIP_FRAMES: React.ReactNode[] = seq.map(([c, i]) => c.frames[i]);
export const FLIP_END: React.ReactNode = GRANDE.end;
