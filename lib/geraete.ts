import { MASCHINEN } from "@/lib/exercises";
import type { GeraetKey } from "@/components/geraete/GeraetZeichnung";
import type { Exercise } from "@/lib/types";

/**
 * Welches Gerät gehört zu einer Übung? Maschinen-Übungen tragen ihr Gerät als
 * `req` (`m_*`), Kabel-Übungen hängen am Kabelzug. Freie Übungen haben kein
 * Gerät (null) — für sie bleibt es bei der Phasenfigur.
 */
export function geraetVon(ex: Pick<Exercise, "req"> | undefined | null): GeraetKey | null {
  const req = ex?.req ?? [];
  const m = req.find((t) => t.startsWith("m_"));
  if (m) return m as GeraetKey;
  if (req.includes("cable")) return "cable";
  return null;
}

/** Anzeigename eines Geräts („Beinpresse“, „Kabelzug“). */
export function geraetName(g: GeraetKey): string {
  if (g === "cable") return "Kabelzug";
  return MASCHINEN.find((m) => m.key === g)?.label ?? g;
}

/** Reihenfolge der Geräte im Katalog: Maschinen wie in den Einstellungen,
 *  der Kabelzug zuletzt. */
export const GERAETE_REIHENFOLGE: GeraetKey[] = [
  ...(MASCHINEN.map((m) => m.key) as GeraetKey[]),
  "cable",
];
