/**
 * Grundfarben für Stellen, die keine CSS-Variablen lesen: Pre-Paint-Skript und
 * `viewport.themeColor` (app/layout.tsx), `lib/theme.ts`, Manifest, Bild-Routen
 * (Icon, iOS-Startbilder), Startbild-CSS und `global-error.tsx`.
 * Die Werte MÜSSEN zu app/globals.css passen (--base, --fg, --line, --muted).
 */
export const GRUND_HELL = "#eef0f4";
export const GRUND_DUNKEL = "#0f1015";
export const KARTE_HELL = "#ffffff";
export const KARTE_DUNKEL = "#1a1c24";
export const TINTE_HELL = "#0e0f14";
export const TINTE_DUNKEL = "#f3f4f8";
export const LINIE_HELL = "#c5cad4";
export const LINIE_DUNKEL = "#343845";
export const NEBEN_HELL = "#535866";
export const NEBEN_DUNKEL = "#a7acba";

/** Markenfarben „spotter“ (modusgleich): Elektroblau, Signalorange, Sonne. */
export const MARKE = {
  blau: "#2f45ff",
  orange: "#ff5a1f",
  sonne: "#ffd43b",
} as const;
