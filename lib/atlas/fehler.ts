/**
 * Was bei einer ATLAS-Anfrage schiefgehen kann — eine Liste für Server und
 * Oberfläche. Vorher gab es je Route eigene Texte, und für den Nutzer hieß
 * fast alles „nicht erreichbar“: das Minuten-Limit, eine abgelehnte Anfrage,
 * ein abgeschnittener Text.
 */
export type AtlasFehlerArt =
  /** Kein API-Schlüssel auf dem Server. */
  | "aus"
  /** Der Schlüssel wird nicht angenommen. */
  | "schluessel"
  /** Das Guthaben im Anthropic-Konto ist aufgebraucht. */
  | "guthaben"
  /** Zugangscode fehlt oder stimmt nicht (ATLAS_ZUGANGSCODE). */
  | "zugang"
  /** Zu viele Anfragen: eigenes Minuten-Limit oder das von Anthropic. */
  | "limit"
  /** Das Modell (und sein Ersatz) hat die Anfrage abgelehnt. */
  | "ablehnung"
  /** Die Antwort stieß an die Längengrenze. */
  | "abgeschnitten"
  /** Anthropic ist überlastet oder hat einen Serverfehler. */
  | "ueberlastet"
  /** Die Anfrage selbst wurde nicht angenommen (auch nicht vom Ersatzmodell). */
  | "anfrage"
  /** Die Antwort kam, war aber nicht zu gebrauchen. */
  | "unbrauchbar"
  /** Keine Verbindung, Zeitüberschreitung, Verbindung riss ab. */
  | "netz"
  /** Der Aufrufer hat selbst abgebrochen — kein Fehler, keine Meldung. */
  | "abgebrochen";

/** Sätze für den Nutzer. Kurz, ohne Technik, mit dem nächsten Schritt. */
export const ATLAS_FEHLER_TEXT: Record<AtlasFehlerArt, string> = {
  aus: "ATLAS ist nicht eingerichtet.",
  schluessel: "Der Schlüssel für ATLAS wird nicht angenommen.",
  guthaben: "ATLAS pausiert: Das Guthaben im Anthropic-Konto ist aufgebraucht.",
  zugang: "ATLAS braucht den Zugangscode. Trag ihn in den Einstellungen ein.",
  limit: "ATLAS ist ausgelastet. Versuch es in einer Minute nochmal.",
  ablehnung: "Dazu kann ATLAS nichts sagen.",
  abgeschnitten: "Die Antwort wurde zu lang und ist abgeschnitten.",
  ueberlastet: "ATLAS ist gerade überlastet. Versuch es gleich nochmal.",
  anfrage: "ATLAS hat die Anfrage nicht angenommen.",
  unbrauchbar: "ATLAS hat nichts Brauchbares geliefert.",
  netz: "ATLAS ist gerade nicht erreichbar.",
  abgebrochen: "",
};

const ARTEN = new Set<string>(Object.keys(ATLAS_FEHLER_TEXT));
export const istFehlerArt = (x: unknown): x is AtlasFehlerArt =>
  typeof x === "string" && ARTEN.has(x);

/** HTTP-Status je Fehlerart für die JSON-Routen. */
export const ATLAS_FEHLER_STATUS: Record<AtlasFehlerArt, number> = {
  aus: 200,
  schluessel: 502,
  guthaben: 402,
  zugang: 401,
  limit: 429,
  ablehnung: 422,
  abgeschnitten: 502,
  ueberlastet: 503,
  anfrage: 502,
  unbrauchbar: 422,
  netz: 502,
  abgebrochen: 499,
};

/**
 * Textströme (Chat, Auswertung, Wochen-Rückblick) enden mit diesem Zeichen
 * (ASCII „Record Separator“) und einer JSON-Zeile: `{"ok":true}` oder
 * `{"ok":false,"fehler":"…"}`. So steht nie mehr ein Fehlersatz mitten im
 * Text (und später im gespeicherten Chat), und ein Strom, der OHNE diese Zeile
 * endet, ist erkennbar abgerissen.
 */
export const STROM_ENDE = "\u001e";

/** Kopfzeile, mit der die Oberfläche das neue Stromformat anfordert. Ältere,
 *  noch nicht aktualisierte Fenster schicken sie nicht und bekommen das alte
 *  Format (reiner Text). */
export const STROM_KOPF = "x-atlas-format";

/** Kopfzeile, in der die Oberfläche den Zugangscode mitschickt
 *  (Server: lib/atlas/zugang.ts). */
export const ZUGANG_KOPF = "x-atlas-code";
