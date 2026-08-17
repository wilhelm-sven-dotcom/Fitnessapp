/**
 * Appearance helpers. EINE Design-Identität („Platte 311"); nur data-theme
 * auf <html> steuert Archiv/Atelier ("system" wird zur Laufzeit aufgelöst) —
 * das ARCHIV (hell) ist der Grundzustand. Alle Farben gehören dem Design
 * (globals.css); es gibt keinen Akzent-Override und keinen Icon-Designer mehr.
 *
 * Theme-Lock: Der Fokus-Modus (/workout) läuft IMMER im Atelier. Die Route
 * setzt `setThemeLock("dark")` und räumt beim Verlassen wieder auf; solange
 * der Lock steht, gewinnt er gegen jede Präferenz (auch bei System-Wechseln,
 * die der Provider weiterreicht). Das Pre-Paint-Skript in layout.tsx spiegelt
 * dieselbe Regel für den Kaltstart auf /workout.
 */

export type ThemePref = "dark" | "light" | "system";

const DARK_BG = "#141210";
const LIGHT_BG = "#f2ecdd";

let themeLock: "dark" | null = null;

/** Erzwungenes Atelier (Fokus-Modus) an-/abschalten — Aufrufer wendet danach
 *  `applyTheme` an, damit der Wechsel sofort sichtbar wird. */
export function setThemeLock(lock: "dark" | null): void {
  themeLock = lock;
}

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
  const resolved = themeLock ?? resolveTheme(pref);
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
