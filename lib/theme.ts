/**
 * Hell/Dunkel. Nur data-theme auf <html> steuert den Modus ("system" wird zur
 * Laufzeit aufgelöst); Hell ist der Grundzustand. Alle Farben gehören dem
 * Design (globals.css). Das Training folgt der Einstellung wie jede andere
 * Seite (Nutzer-Entscheid Nov 2026, vorher erzwungenes Dunkel).
 */
import { GRUND_DUNKEL, GRUND_HELL } from "@/lib/grundfarben";

export type ThemePref = "dark" | "light" | "system";

const DARK_BG = GRUND_DUNKEL;
const LIGHT_BG = GRUND_HELL;

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
