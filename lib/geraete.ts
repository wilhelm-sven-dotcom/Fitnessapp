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

/**
 * Geräte mit mitgeliefertem Bild in `public/geraete/` (3:2, je `<key>.webp`
 * und `<key>-klein.webp`). Die übrigen zeigen die Zeichnung. Neues Bild:
 * Dateien ablegen und den Key hier eintragen (siehe README dort).
 */
const MIT_BILD: ReadonlySet<GeraetKey> = new Set<GeraetKey>([
  "cable",
  "m_waden",
  "m_rudern",
  "m_schulterpresse",
  "m_butterfly",
  "m_beinpresse",
  "m_hacksquat",
  "m_beinstrecker",
  "m_beinbeuger",
  "m_rueckenstrecker",
  "m_brustpresse",
]);

/** Hochzählen, wenn ein Bild ersetzt wird: der Service Worker cacht die URL
 *  dauerhaft, erst ein neuer `?v=` holt die neue Datei. */
const GERAET_BILD_STAND = 1;

/** URL des mitgelieferten Gerätebilds oder null. `klein` = 360 × 240 für
 *  Listen und die Trainingskarte, sonst 1200 × 800. */
export function geraetBildUrl(g: GeraetKey | null, klein = false): string | null {
  if (!g || !MIT_BILD.has(g)) return null;
  return `/geraete/${g}${klein ? "-klein" : ""}.webp?v=${GERAET_BILD_STAND}`;
}
