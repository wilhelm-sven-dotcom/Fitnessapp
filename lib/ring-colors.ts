/**
 * Farbquelle für SVG-Strokes (Activity-Rings, Charts). SVG-Attribute dürfen
 * CSS-Variablen tragen — so folgen Ringe und Charts dem Theme automatisch.
 * Spiegelt die `accent.*`-Tokens in tailwind.config.ts (München-’72-Trio:
 * Blau = Einheiten · Grün = Volumen · Orange = Abdeckung).
 */
export const RING = {
  move: "var(--accent)", // sessions (blau)
  exercise: "var(--gruen)", // volume (grün)
  stand: "var(--orange)", // coverage (orange)
} as const;

export const RING_TRACK = "var(--line)"; // unfilled groove — theme-korrekt

export type RingId = keyof typeof RING;

export interface RingMetric {
  id: RingId;
  value: number;
  target: number;
  label: string;
  color: string;
}
