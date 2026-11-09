/**
 * Grundfarben für Stellen, die keine CSS-Variablen lesen: Pre-Paint-Skript und
 * `viewport.themeColor` (app/layout.tsx), `lib/theme.ts`, Manifest, Bild-Routen
 * (Icon, iOS-Startbilder), Startbild-CSS und `global-error.tsx`.
 * Die Werte MÜSSEN zu app/globals.css passen (--base, --fg, --line, --muted).
 */
export const GRUND_HELL = "#f6f4ef";
export const GRUND_DUNKEL = "#13120f";
export const KARTE_HELL = "#ffffff";
export const KARTE_DUNKEL = "#1d1b17";
export const TINTE_HELL = "#16140f";
export const TINTE_DUNKEL = "#f3f0e8";
export const LINIE_HELL = "#dcd6ca";
export const LINIE_DUNKEL = "#34302a";
export const NEBEN_HELL = "#5a554b";
export const NEBEN_DUNKEL = "#b8b1a2";

/** Wettkampf-Scheibenfarben = Regionsflächen (modusgleich). */
export const SCHEIBE = {
  rot: "#c7352b",
  blau: "#2b5fb8",
  gelb: "#e3a600",
  gruen: "#257a4c",
} as const;
