/**
 * Appearance helpers. EINE Design-Identität („München ’72"); nur data-theme
 * auf <html> steuert hell/dunkel ("system" wird zur Laufzeit aufgelöst) —
 * HELL ist der Grundzustand. Der Akzent (Lichtblau) gehört dem Design
 * (globals.css); `accentOverride` kann ihn ersetzen.
 * Die ACCENTS/PALETTE-Listen speisen den App-Icon-Designer.
 */

export type ThemePref = "dark" | "light" | "system";

export const ACCENTS = [
  { id: "red", label: "Rot", hex: "#ff375f" },
  { id: "orange", label: "Orange", hex: "#ff9f0a" },
  { id: "green", label: "Grün", hex: "#30d158" },
  { id: "blue", label: "Blau", hex: "#0a84ff" },
  { id: "purple", label: "Violett", hex: "#bf5af2" },
  { id: "pink", label: "Pink", hex: "#ff2d92" },
] as const;

export type AccentId = (typeof ACCENTS)[number]["id"];
export const DEFAULT_ACCENT: AccentId = "red";

export function accentHex(id: string | undefined): string {
  return ACCENTS.find((a) => a.id === id)?.hex ?? "#ff375f";
}

/**
 * Contrast ink for text/icons sitting on an accent-filled surface. A light
 * accent (white, bone, yellow) gets dark ink; a dark/saturated accent gets
 * light ink — keeps accent CTAs readable under any `accentOverride`. Mirrors
 * the icon's luminance test (see `iconInk` in lib/app-icon.ts).
 */
export function onAccent(hex: string): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16) / 255;
  const g = parseInt(h.slice(2, 4), 16) / 255;
  const b = parseInt(h.slice(4, 6), 16) / 255;
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return lum > 0.6 ? "#121619" : "#ffffff";
}

/** Relative luminance 0..1 (sRGB, gamma-corrected) of a #rrggbb color. */
function relLuminance(hex: string): number {
  const h = hex.replace("#", "");
  const chan = (i: number) => {
    const v = parseInt(h.slice(i, i + 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * chan(0) + 0.7152 * chan(2) + 0.0722 * chan(4);
}

/** WCAG contrast ratio (1..21) between two #rrggbb colors. */
function contrastRatio(a: string, b: string): number {
  const la = relLuminance(a);
  const lb = relLuminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/**
 * The accent rendered as a FOREGROUND mark (icon, text, small indicator) on the
 * page. Keeps the accent when it reads on the base, else falls back to ink — so
 * a light `accentOverride` (white/bone/yellow) never goes invisible on a light
 * page (and a near-black override never vanishes on a dark page). Dual to
 * `onAccent`, which colours text ON an accent-filled surface.
 */
export function accentInk(hex: string, baseIsLight: boolean): string {
  const base = baseIsLight ? "#f2f4f2" : "#14171a";
  if (contrastRatio(hex, base) >= 3) return hex;
  return baseIsLight ? "#121619" : "#edf0f2";
}

/**
 * Full color palette (incl. black & white) for the icon designer (background +
 * glyph) and the optional app-accent override. Hex so it can drive SVG/canvas
 * and inline `--accent`.
 */
export const PALETTE = [
  "#ff375f", // Rot
  "#ff2d92", // Pink
  "#ff9f0a", // Bernstein
  "#ffd60a", // Gelb
  "#30d158", // Grün
  "#64d2ff", // Cyan
  "#0a84ff", // Blau
  "#5e5ce6", // Indigo
  "#bf5af2", // Violett
  "#ac8e68", // Bronze
  "#8a93a3", // Stahl
  "#e8e2d6", // Knochen
  "#ffffff", // Weiß
  "#0c0e12", // Schwarz
] as const;

/* ── Theme (light / dark) — HELL ist der Grundzustand ───────────────────── */

const DARK_BG = "#14171a";
const LIGHT_BG = "#f2f4f2";

export function resolveTheme(pref: ThemePref | undefined): "dark" | "light" {
  if (pref === "dark") return "dark";
  if (pref === "system" && typeof window !== "undefined" && window.matchMedia) {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  return "light";
}

/** Apply theme to <html> and match the status-bar color. */
export function applyTheme(pref: ThemePref | undefined): void {
  if (typeof document === "undefined") return;
  const resolved = resolveTheme(pref);
  const commit = () => {
    document.documentElement.setAttribute("data-theme", resolved);
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", resolved === "light" ? LIGHT_BG : DARK_BG);
  };
  // Echter Wechsel als kurzer Crossfade (View Transition) statt hartem
  // Umschlag aller Flächen; No-Op-Aufrufe (Boot, gleiche Wahl) und
  // reduced motion committen direkt. Ohne Browser-Support: ebenso.
  const changed = document.documentElement.getAttribute("data-theme") !== resolved;
  const reduce =
    typeof window !== "undefined" &&
    !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  const doc = document as Document & {
    startViewTransition?: (cb: () => void) => unknown;
  };
  if (changed && !reduce && typeof doc.startViewTransition === "function") {
    doc.startViewTransition(commit);
  } else {
    commit();
  }
}
