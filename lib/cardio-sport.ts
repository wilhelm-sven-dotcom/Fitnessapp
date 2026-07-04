import type { CardioSession } from "@/lib/types";

/**
 * Sport-Typ-Helfer für den Ausdauer-Hub: deutsche Labels, Strava-Mapping und
 * Distanz/Pace-Formatierung. Rein & SSR-sicher (keine DOM-/Datums-Abhängigkeit).
 */
export type Sport = NonNullable<CardioSession["sport"]>;

export const SPORTS: Sport[] = ["run", "ride", "interval", "row", "walk", "other"];

/** Deutsches Label je Sport. */
export const SPORT_LABEL: Record<Sport, string> = {
  run: "Lauf",
  ride: "Rad",
  interval: "Intervalle",
  row: "Rudern",
  walk: "Gehen",
  other: "Cardio",
};

export function sportLabel(sport: Sport | undefined): string {
  return sport ? SPORT_LABEL[sport] : SPORT_LABEL.other;
}

/** Strava `type`/`sport_type` → unser Sport-Bucket. */
export function stravaSport(type?: string, sportType?: string): Sport {
  const t = (sportType || type || "").toLowerCase();
  if (t.includes("run") || t.includes("trail")) return "run";
  if (t.includes("walk") || t.includes("hike")) return "walk";
  if (t.includes("row") || t.includes("kayak") || t.includes("canoe")) return "row";
  if (
    t.includes("ride") ||
    t.includes("cycl") ||
    t.includes("bike") ||
    t.includes("spin") ||
    t.includes("velomobile") ||
    t.includes("ebike")
  )
    return "ride";
  if (
    t.includes("hiit") ||
    t.includes("interval") ||
    t.includes("crossfit") ||
    t.includes("workout")
  )
    return "interval";
  return "other";
}

/** "12,4 km" aus Metern — null unter 10 m. Deutsche Dezimalkomma. */
export function kmLabel(distanceM?: number): string | null {
  if (!distanceM || distanceM < 10) return null;
  const km = distanceM / 1000;
  return `${km.toFixed(km >= 10 ? 0 : 1).replace(".", ",")} km`;
}

/** "5:30 /km" aus Metern + Sekunden (nur sinnvoll bei Lauf/Gehen). */
export function paceLabel(distanceM?: number, durationSec?: number): string | null {
  if (!distanceM || distanceM < 100 || !durationSec) return null;
  const secPerKm = durationSec / (distanceM / 1000);
  if (!isFinite(secPerKm) || secPerKm <= 0) return null;
  const m = Math.floor(secPerKm / 60);
  const s = Math.round(secPerKm % 60);
  return `${m}:${String(s).padStart(2, "0")} /km`;
}

export function intensityLabel(i: CardioSession["intensity"]): string {
  return i === "hard" ? "hart" : i === "moderate" ? "moderat" : i === "easy" ? "locker" : "";
}
