/** Shared motion constants so timing values stop being copy-pasted. */

/* ── Platte 311 · „Filmtransport" (Design-Handoff, motion/) ────────────────
   Vier Primitive: TRANSPORT — der Filmgreifer: Anlauf, volle Geschwindigkeit
   am Anschlag, stoppt tot (nur transform). BLITZ — 1 Kreide-Frame Belichtung
   (steps(1), nie ein Fade). RASTE — einrastende Kurbel: Überschuss, 1 Frame
   halten (Keyframe ~82 % + step-end). ZOETROP — CSS-Klassen zp1-3 in
   globals.css (8 B/s, 1-2-3-2). Dauern-Skala (brutal, nichts dazwischen):
   0 · 60 · 80 · 120 · 160 · 240 · 300 ms — einzige Ausnahme Sieger ~900 ms.
   Nur transform/opacity; Archiv und Atelier verhalten sich identisch;
   prefers-reduced-motion: Dauern → 0 (harte Schnitte). */

export const TRANSPORT_EIN = [0.55, 0, 1, 1] as [number, number, number, number];
export const TRANSPORT_AUS = [0.45, 0, 1, 1] as [number, number, number, number];

/** Dauern in Sekunden (Framer-Konvention). */
export const FILM = {
  blitz: 0.06,
  press: 0.08,
  toast: 0.12,
  liste: 0.14,
  screen: 0.16,
  sheetZu: 0.18,
  fuellung: 0.24,
  /** 213 ms Transport + 47 ms Raste (Keyframe bei 82 %). */
  sheetAuf: 0.26,
} as const;

/* ── Alt-Bestand (München ’72) — trägt die noch nicht umgezogenen
   Nutzstellen; neue Arbeit nimmt ausschließlich Filmtransport-Werte. */
export const SPRING = {
  press: { type: "spring", stiffness: 400, damping: 30 },
  panel: { type: "spring", stiffness: 360, damping: 36 },
  pop: { type: "spring", stiffness: 500, damping: 30 },
} as const;

export const EASE_OUT = [0.22, 1, 0.36, 1] as [number, number, number, number];
