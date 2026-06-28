/**
 * Appearance helpers: theme preference (dark/light/system) and a selectable
 * brand accent. Theming is driven by `data-theme` + the `--accent` CSS variable
 * on <html>; "system" is resolved to dark/light at runtime.
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

const LIGHT_BG = "#f4f4f6";
const DARK_BG = "#0a0a0a";

export function resolveTheme(pref: ThemePref | undefined): "dark" | "light" {
  if (pref === "light") return "light";
  if (pref === "system" && typeof window !== "undefined" && window.matchMedia) {
    return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
  }
  return "dark";
}

/** Apply theme + accent to <html> and keep the status-bar meta in sync. */
export function applyTheme(pref: ThemePref | undefined, accentId: string | undefined): void {
  if (typeof document === "undefined") return;
  const resolved = resolveTheme(pref);
  const root = document.documentElement;
  root.setAttribute("data-theme", resolved);
  root.style.setProperty("--accent", accentHex(accentId));
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", resolved === "light" ? LIGHT_BG : DARK_BG);
}
