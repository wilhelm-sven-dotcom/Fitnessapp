/**
 * Hex source of truth for SVG strokes (activity rings, charts).
 * SVG attributes may use raw hex — only Tailwind classNames are constrained.
 * Mirrors the `accent.*` tokens in tailwind.config.ts.
 */
export const RING = {
  move: "#ff375f", // sessions (rot)
  exercise: "#30d158", // volume (grün)
  stand: "#0a84ff", // coverage (blau)
} as const;

export const RING_TRACK = "#2a2a30"; // unfilled groove (surface.3)

export type RingId = keyof typeof RING;
