/**
 * Datei-Sicherung: was in den Export gehört und wie eine Datei zurück aufs
 * Gerät kommt. Rein (kein Speicherzugriff), damit es sich testen lässt; der
 * Provider setzt die Ergebnisse in den Zustand.
 *
 * Zwei Arten, eine Datei einzuspielen:
 *  · „ergänzen“ (Vorgabe): Was in der Datei steht und auf dem Gerät fehlt,
 *    kommt dazu. Was es auf dem Gerät schon gibt, bleibt, wie es ist. Nichts
 *    wird gelöscht.
 *  · „ersetzen“: Das Gerät bekommt den Stand der Datei. Vorher wird der
 *    bisherige Verlauf als Sicherung festgehalten (lib/storage.ts).
 */
import type { JumpEntry } from "@/lib/jump";
import type { AppSettings } from "@/lib/types";

export type ImportModus = "ergaenzen" | "ersetzen";

/** Einstellungen für die Datei: ohne die Zugänge zu Strava und Spotify. Wer
 *  die Datei weitergibt oder in einer Cloud ablegt, gibt sonst seine Konten
 *  mit heraus. */
export function ohneZugaenge(s: AppSettings): AppSettings {
  const { strava: _strava, spotify: _spotify, ...rest } = s;
  void _strava;
  void _spotify;
  return rest;
}

/** Vereinigt zwei Listen. Bei gleichem Schlüssel bleibt der Eintrag vom
 *  Gerät; Einträge ohne Schlüssel aus der Datei fallen weg. */
export function ergaenze<T>(
  geraet: readonly T[],
  datei: readonly T[],
  key: (x: T) => string | undefined,
): T[] {
  const out = [...geraet];
  const da = new Set(geraet.map(key));
  for (const x of datei) {
    const k = key(x);
    if (!k || da.has(k)) continue;
    da.add(k);
    out.push(x);
  }
  return out;
}

/** Aufsteigend nach Datum — der Verlauf wird überall so erwartet (der letzte
 *  Eintrag ist der jüngste). */
export function nachDatum<T extends { date: string }>(liste: readonly T[]): T[] {
  const zeit = (x: T) => {
    const t = new Date(x.date).getTime();
    return Number.isFinite(t) ? t : 0;
  };
  return [...liste].sort((a, b) => zeit(a) - zeit(b));
}

/** Zwei Listen von Kennungen ohne Dubletten. */
export function vereinige(a: readonly string[], b: readonly string[]): string[] {
  return [...new Set([...a, ...b])];
}

/** Nur echte Text-Einträge einer Liste. */
export function nurTexte(x: unknown): string[] {
  return Array.isArray(x) ? x.filter((v): v is string => typeof v === "string") : [];
}

/** Sprungtests aus einer Datei: nur Einträge mit Datum und Höhe. */
export function pruefeSpruenge(x: unknown): JumpEntry[] {
  if (!Array.isArray(x)) return [];
  return x.filter(
    (j): j is JumpEntry =>
      !!j &&
      typeof j === "object" &&
      typeof (j as JumpEntry).date === "string" &&
      Number((j as JumpEntry).heightCm) > 0,
  );
}

export interface ChatZeile {
  role: "user" | "assistant";
  content: string;
}

/** ATLAS-Gespräch aus einer Datei: nur Zeilen mit Rolle und Text. */
export function pruefeChat(x: unknown, max = 40): ChatZeile[] {
  if (!Array.isArray(x)) return [];
  return x
    .filter(
      (m): m is ChatZeile =>
        !!m &&
        typeof m === "object" &&
        ((m as ChatZeile).role === "user" || (m as ChatZeile).role === "assistant") &&
        typeof (m as ChatZeile).content === "string",
    )
    .slice(-max);
}
