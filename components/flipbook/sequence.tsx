/**
 * „Die Mischung" — die von Sven gewählte Daumenkino-Sequenz für den Boot.
 * Rhythmus wie das große Vorbild: überwiegend ruhige Tusche- und Technik-
 * Tafeln, unterbrochen von gezielten Farb-Momenten; Finale ist die rote
 * TRAINING-Karte, über deren Ränder die Motive hinausfliegen.
 *
 * Jeder Schritt trägt die Papier-/Grundfarbe seiner Tafel als `bg`: der
 * Player malt sie bildschirmfüllend hinter die Tafel, sodass jeder Frame
 * Kante zu Kante wirkt (die Tafel läuft nahtlos in ihren Bogen aus).
 */
import { ARCHIV } from "./plates-archiv";
import { BLAUPAUSE } from "./plates-blaupause";
import { ZOETROP } from "./plates-zoetrop";
import { KABINETT } from "./plates-kabinett";
import { GRANDE } from "./plates-grande";
import type { FlipConcept } from "./types";

export interface FlipStep {
  node: React.ReactNode;
  /** Bildschirmfüllende Grundfarbe = Papier-/Hintergrundfarbe der Tafel. */
  bg: string;
}

const PAPER = "#EFE8D6";
const TECH = "#0D1420";
const CARD = "#121814";

const seq: [FlipConcept, number, string][] = [
  [ARCHIV, 0, PAPER], // Kugelhantel — Papier, dezent
  [BLAUPAUSE, 0, TECH], // Langhantel — dunkle Technik
  [GRANDE, 0, PAPER], // Gerätewand — dichter Farbbogen
  [ARCHIV, 1, PAPER], // Bewegungsstudie — Papier
  [BLAUPAUSE, 2, TECH], // Hantelbahn — dunkel + Cyan
  [KABINETT, 3, CARD], // Stoppuhr — Gold, mild
  [GRANDE, 2, "#F0DFD0"], // Trophäen-Schwarm — DER Farb-Moment
  [ARCHIV, 5, PAPER], // Ringe — Papier
  [ZOETROP, 0, "#0E0F12"], // eine Bernstein-Phase — dunkel
  [GRANDE, 10, PAPER], // KRAFT!-Plakat — rote Type
  [BLAUPAUSE, 3, TECH], // Winkelmesser — dunkel
  [GRANDE, 5, "#C13A2C"], // rote Knallkarte
  [ARCHIV, 7, PAPER], // Herz — Papier + Rot
  [KABINETT, 2, CARD], // Bahnrad — mild Grün
  [BLAUPAUSE, 6, TECH], // Zugmesser — dunkel
  [GRANDE, 4, "#E5E8D2"], // der Athlet — Papier, koloriert
];

export const FLIP_STEPS: FlipStep[] = seq.map(([c, i, bg]) => ({ node: c.frames[i], bg }));
export const FLIP_END_STEP: FlipStep = { node: GRANDE.end, bg: "#C84B31" };
