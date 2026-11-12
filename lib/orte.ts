import { ALLE_GERAETE, MASCHINEN_KEYS, STUDIO_EQUIP } from "@/lib/exercises";
import { NUR_GERAETE } from "@/lib/progression";
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

const GUELTIG = new Set<string>(ALLE_GERAETE.map((e) => e.key));

/** Nur bekannte Geräte-Keys, ohne Dubletten (Sync-/Import-Härtung). Der alte
 *  Sammelschalter `machine` wird zu allen Einzelgeräten — auch für Daten, die
 *  ein Gerät mit älterem Stand per Cloud-Sync schickt. */
export function cleanEquip(x: unknown): EquipKey[] {
  if (!Array.isArray(x)) return [];
  const out: EquipKey[] = [];
  const add = (k: EquipKey) => {
    if (!out.includes(k)) out.push(k);
  };
  for (const k of x) {
    if (k === "machine") MASCHINEN_KEYS.forEach(add);
    else if (typeof k === "string" && GUELTIG.has(k)) add(k as EquipKey);
  }
  return out;
}

/**
 * Gewichtsstufe, auf die Vorschläge und die ±-Tasten runden: die des Orts,
 * sonst die allgemeine, sonst 2,5 kg. Vorher gab es nur EINE Stufe für alles —
 * wer zuhause mit 1,25-kg-Scheiben und im Studio an 5-kg-Stufen trainiert,
 * bekam an einem der beiden Orte Vorschläge, die sich nicht laden ließen.
 */
export function gewichtsstufe(
  ort: Pick<GymProfile, "weightStep"> | null | undefined,
  settings: Pick<AppSettings, "weightStep">,
): number {
  for (const v of [ort?.weightStep, settings.weightStep]) {
    if (typeof v === "number" && Number.isFinite(v) && v > 0) return v;
  }
  return 2.5;
}

/** `has()` eines Orts: seine Geräte plus die Regel „nur an Geräten“. */
export function hasFuer(g: Pick<GymProfile, "equip" | "nurGeraete">): (k: string) => boolean {
  return (k) => (k === NUR_GERAETE ? !!g.nurGeraete : (g.equip as string[]).includes(k));
}

export const istStudio = (g: GymProfile) => /studio/i.test(g.name);

const equipKey = (equip: readonly string[]) => [...equip].sort().join(",");

/** Erkennt Ortswechsel UND Geräte-Änderungen am selben Ort (inkl. „nur an
 *  Geräten“). Mit `ausgeblendet` auch eine geänderte Auswahl im Katalog: wer
 *  Übungen ein- oder ausblendet, bekommt die Einheit neu zusammengestellt.
 *  Ohne ausgeblendete Übungen bleibt die Signatur wie bisher. */
export function ortSignatur(
  g: Pick<GymProfile, "id" | "equip" | "nurGeraete">,
  ausgeblendet?: readonly string[],
): string {
  const ort = `${g.id}|${equipKey(g.equip)}${g.nurGeraete ? "|nurGeraete" : ""}`;
  if (!ausgeblendet?.length) return ort;
  let h = 5381;
  for (const ch of [...ausgeblendet].sort().join(",")) h = ((h << 5) + h + ch.charCodeAt(0)) >>> 0;
  return `${ort}|aus:${ausgeblendet.length}:${h.toString(36)}`;
}

/** Geräte-Namen in Listenreihenfolge (für Anzeige und ATLAS). */
export function geraeteLabels(equip: readonly EquipKey[]): string[] {
  return ALLE_GERAETE.filter((e) => equip.includes(e.key)).map((e) => e.label);
}

/** Piktogramm-Muster eines Orts: Maschinen/Kabel → Zug am Gerät, freie
 *  Gewichte → Hüftschwung, sonst Kniebeuge. */
export function ortMuster(g: Pick<GymProfile, "equip">): Pattern {
  if (g.equip.some((k) => k.startsWith("m_")) || g.equip.includes("cable")) return "vpull";
  if (g.equip.includes("kb") || g.equip.includes("db") || g.equip.includes("bar")) return "hinge";
  return "squat";
}

/**
 * Ortsname, den es noch nicht gibt: „Zuhause“ → „Zuhause 2“, wenn ein anderer
 * Ort schon so heißt (Groß/Klein egal). Gleichnamige Orte sind in der
 * Ortswahl nicht zu unterscheiden, `ensureOrte` legt sie beim nächsten Laden
 * zusammen. `ausserId` = der Ort, der gerade umbenannt wird.
 */
export function freierOrtsname(
  name: string,
  gyms: readonly Pick<GymProfile, "id" | "name">[],
  ausserId?: string,
): string {
  const vergeben = new Set(gyms.filter((g) => g.id !== ausserId).map((g) => g.name.toLowerCase()));
  if (!vergeben.has(name.toLowerCase())) return name;
  for (let n = 2; ; n++) {
    const kandidat = `${name} ${n}`;
    if (!vergeben.has(kandidat.toLowerCase())) return kandidat;
  }
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
 * · Je Name bleibt ein Ort (Dubletten aus dem Cloud-Merge oder aus einem
 *   alten Profil): der aktive, sonst der vorbelegte, sonst der erste
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
  const geraeteErstlauf = !settings.geraeteM1;
  let gyms: GymProfile[] = gymsIn.map((g) => {
    const name = typeof g.name === "string" && g.name.trim() ? g.name.trim() : "Ort";
    const ort: GymProfile = { ...g, name: name === ALT_NAME ? "Zuhause" : name, equip: cleanEquip(g.equip) };
    if (ort.nurGeraete !== true) delete ort.nurGeraete;
    // Einmalig: das Studio plant ab jetzt nur an Geräten (Nutzer-Entscheid
    // Nov 2026); danach gilt nur noch der Schalter in den Einstellungen.
    if (geraeteErstlauf && (g.id === ORT_STUDIO_ID || istStudio(ort))) ort.nurGeraete = true;
    return ort;
  });

  // Je Name bleibt EIN Ort. Zwei „Zuhause“ entstehen, wenn ein altes Profil
  // („Mein Gym“, eigene Id) und der vorbelegte Ort zusammenkommen; in der
  // Ortswahl lassen sie sich nicht unterscheiden. Es bleibt der gerade aktive,
  // sonst der vorbelegte, sonst der erste, mit SEINEN Geräten.
  const rang = (g: GymProfile) =>
    g.id === settings.activeGymId ? 0 : g.id === ORT_ZUHAUSE_ID || g.id === ORT_STUDIO_ID ? 1 : 2;
  const bleibt = new Map<string, GymProfile>();
  for (const g of gyms) {
    const k = g.name.toLowerCase();
    const bisher = bleibt.get(k);
    if (!bisher || rang(g) < rang(bisher)) bleibt.set(k, g);
  }
  gyms = gyms.filter((g) => bleibt.get(g.name.toLowerCase()) === g);

  if (gyms.length === 0) {
    gyms = [{ id: ORT_ZUHAUSE_ID, name: "Zuhause", equip: cleanEquip(equipFlat) }];
  } else if (erstlauf) {
    const aid = gyms.some((g) => g.id === settings.activeGymId)
      ? settings.activeGymId
      : gyms[0].id;
    gyms = gyms.map((g) => (g.id === aid ? { ...g, equip: cleanEquip(equipFlat) } : g));
  }

  if (erstlauf && !gyms.some(istStudio) && !gyms.some((g) => g.id === ORT_STUDIO_ID))
    gyms = [...gyms, { id: ORT_STUDIO_ID, name: "Studio", equip: [...STUDIO_EQUIP], nurGeraete: true }];

  let next = settings;
  if (erstlauf) next = { ...next, orteM1: true };
  if (geraeteErstlauf) next = { ...next, geraeteM1: true };
  if (!gyms.some((g) => g.id === next.activeGymId))
    next = { ...next, activeGymId: gyms[0].id };

  const changed =
    next !== settings || JSON.stringify(gyms) !== JSON.stringify(gymsIn);
  return { gyms, settings: next, changed };
}
