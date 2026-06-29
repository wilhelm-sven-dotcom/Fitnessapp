/**
 * Appearance helpers. Two orthogonal axes drive the look, both on <html>:
 *   · data-theme — dark (default) / light ; "system" resolved at runtime.
 *   · data-skin  — blueprint (default) / tactile ; carries its own accent,
 *     fonts, surfaces and signature (see globals.css). The skin owns --accent,
 *     so theme no longer sets it.
 * The legacy ACCENTS palette is retained only for the app-icon art.
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

/* ── Skins ────────────────────────────────────────────────────────────────── */

export type SkinId = "blueprint" | "tactile";

export const SKINS: { id: SkinId; label: string; hint: string }[] = [
  { id: "blueprint", label: "Blueprint", hint: "Messraster, Stahl & Rot — technisch, präzise." },
  { id: "tactile", label: "Tactile", hint: "Tacho & Bernstein — geschliffenes Instrument." },
];

export const DEFAULT_SKIN: SkinId = "blueprint";

const SKIN_BASE: Record<SkinId, string> = { blueprint: "#0c0e12", tactile: "#0e0f12" };
const LIGHT_BG = "#f2f3f5";

export function resolveSkin(skin: string | undefined): SkinId {
  return skin === "tactile" ? "tactile" : "blueprint";
}

/** Apply the skin to <html> and match the status-bar color (dark only). */
export function applySkin(skin: SkinId | undefined): void {
  if (typeof document === "undefined") return;
  const s = resolveSkin(skin);
  const root = document.documentElement;
  root.setAttribute("data-skin", s);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta && root.getAttribute("data-theme") !== "light") {
    meta.setAttribute("content", SKIN_BASE[s]);
  }
}

/* ── Theme (dark / light) ────────────────────────────────────────────────── */

export function resolveTheme(pref: ThemePref | undefined): "dark" | "light" {
  if (pref === "light") return "light";
  if (pref === "system" && typeof window !== "undefined" && window.matchMedia) {
    return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
  }
  return "dark";
}

/** Apply theme to <html>; the skin sets --accent and (in dark) the bar color. */
export function applyTheme(pref: ThemePref | undefined): void {
  if (typeof document === "undefined") return;
  const resolved = resolveTheme(pref);
  document.documentElement.setAttribute("data-theme", resolved);
  if (resolved === "light") {
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", LIGHT_BG);
  }
}
