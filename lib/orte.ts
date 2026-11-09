import { EQUIP_LIST, STUDIO_EQUIP } from "@/lib/exercises";
import type { AppSettings, EquipKey, GymProfile, Pattern } from "@/lib/types";

/**
 * Trainingsorte („Zuhause“, „Studio“, frei benennbar). Im Code heißen sie
 * weiter `GymProfile`/`gyms` — die Oberfläche sagt „Ort“.
 *
 * Der aktive Ort ist DIE Wahrheit für die Geräte: `equip` wird daraus
 * abgeleitet, KEYS.equip ist nur noch ein Spiegel. Vorher liefen die flache
 * Liste (Merge: lokal gewinnt) und `activeGymId` (Merge: Cloud gewinnt)
 * auseinander, sobald zwei Geräte im Spiel waren.
 */

/** Feste Ids der vorbelegten Orte — auf jedem Gerät gleich, damit die
 *  Cloud-Union (Merge per id) keine Dubletten erzeugt. */
export const ORT_ZUHAUSE_ID = "gym_zuhause";
export const ORT_STUDIO_ID = "gym_studio";

/** Früherer Auto-Name des ersten Profils — nie vom Nutzer gewählt. */
const ALT_NAME = "Mein Gym";

const GUELTIG = new Set<string>(EQUIP_LIST.map((e) => e.key));

/** Nur bekannte Geräte-Keys, ohne Dubletten (Sync-/Import-Härtung). */
export function cleanEquip(x: unknown): EquipKey[] {
  if (!Array.isArray(x)) return [];
  const out: EquipKey[] = [];
  for (const k of x)
    if (typeof k === "string" && GUELTIG.has(k) && !out.includes(k as EquipKey))
      out.push(k as EquipKey);
  return out;
}

export const istStudio = (g: GymProfile) => /studio/i.test(g.name);

const equipKey = (equip: readonly string[]) => [...equip].sort().join(",");

/** Erkennt Ortswechsel UND Geräte-Änderungen am selben Ort. */
export function ortSignatur(g: Pick<GymProfile, "id" | "equip">): string {
  return `${g.id}|${equipKey(g.equip)}`;
}

/** Geräte-Namen in Listenreihenfolge (für Anzeige und ATLAS). */
export function geraeteLabels(equip: readonly EquipKey[]): string[] {
  return EQUIP_LIST.filter((e) => equip.includes(e.key)).map((e) => e.label);
}

/** Piktogramm-Muster eines Orts: Maschinen/Kabel → Zug am Gerät, freie
 *  Gewichte → Hüftschwung, sonst Kniebeuge. */
export function ortMuster(g: Pick<GymProfile, "equip">): Pattern {
  if (g.equip.includes("machine") || g.equip.includes("cable")) return "vpull";
  if (g.equip.includes("kb") || g.equip.includes("db") || g.equip.includes("bar")) return "hinge";
  return "squat";
}

export interface OrteErgebnis {
  gyms: GymProfile[];
  settings: AppSettings;
  /** Etwas wurde repariert/migriert — der Aufrufer persistiert. */
  changed: boolean;
}

/**
 * Bringt die Orte in einen gültigen Zustand. Pur, läuft in `loadAll` (und
 * nach einem Import), BEVOR die Oberfläche rendert:
 * · keine Orte → „Zuhause“ aus der geladenen Geräteliste
 * · „Mein Gym“ (alter Auto-Name) heißt jetzt „Zuhause“
 * · Dubletten aus dem Cloud-Merge zweier Geräte (gleicher Name, gleiche
 *   Geräte) fallen weg
 * · Erstlauf (`orteM1` fehlt): der aktive Ort übernimmt einmalig die flache
 *   Liste (die bis dahin die Wahrheit war), „Studio“ kommt dazu, wenn es
 *   keinen Studio-Ort gibt. Danach `orteM1` — ein gelöschtes Studio kommt
 *   nicht wieder.
 * · `activeGymId` zeigt immer auf einen vorhandenen Ort.
 */
export function ensureOrte(
  gymsIn: readonly GymProfile[],
  equipFlat: readonly EquipKey[],
  settings: AppSettings,
): OrteErgebnis {
  const erstlauf = !settings.orteM1;
  let gyms: GymProfile[] = gymsIn.map((g) => {
    const name = typeof g.name === "string" && g.name.trim() ? g.name.trim() : "Ort";
    return { ...g, name: name === ALT_NAME ? "Zuhause" : name, equip: cleanEquip(g.equip) };
  });

  const gesehen = new Set<string>();
  gyms = gyms.filter((g) => {
    const k = `${g.name.toLowerCase()}|${equipKey(g.equip)}`;
    if (gesehen.has(k)) return false;
    gesehen.add(k);
    return true;
  });

  if (gyms.length === 0) {
    gyms = [{ id: ORT_ZUHAUSE_ID, name: "Zuhause", equip: cleanEquip(equipFlat) }];
  } else if (erstlauf) {
    const aid = gyms.some((g) => g.id === settings.activeGymId)
      ? settings.activeGymId
      : gyms[0].id;
    gyms = gyms.map((g) => (g.id === aid ? { ...g, equip: cleanEquip(equipFlat) } : g));
  }

  if (erstlauf && !gyms.some(istStudio) && !gyms.some((g) => g.id === ORT_STUDIO_ID))
    gyms = [...gyms, { id: ORT_STUDIO_ID, name: "Studio", equip: [...STUDIO_EQUIP] }];

  let next = settings;
  if (erstlauf) next = { ...next, orteM1: true };
  if (!gyms.some((g) => g.id === next.activeGymId))
    next = { ...next, activeGymId: gyms[0].id };

  const changed =
    next !== settings || JSON.stringify(gyms) !== JSON.stringify(gymsIn);
  return { gyms, settings: next, changed };
}
