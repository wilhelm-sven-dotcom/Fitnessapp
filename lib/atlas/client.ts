import {
  STROM_ENDE,
  STROM_KOPF,
  ZUGANG_KOPF,
  istFehlerArt,
  type AtlasFehlerArt,
} from "@/lib/atlas/fehler";

/**
 * Was die Oberfläche für jede ATLAS-Anfrage braucht: Kopfzeilen (Zugangscode,
 * Stromformat), das Datum des Geräts und das Lesen der Textströme.
 */

/** Der Zugangscode liegt nur auf diesem Gerät: nicht in den Einstellungen
 *  (die gehen in Cloud und Export), aber unter dem App-Präfix, damit „Alle
 *  Daten löschen“ ihn mitnimmt. */
const CODE_KEY = "wilhelm-training-atlas-code";

export function atlasCode(): string {
  try {
    return window.localStorage.getItem(CODE_KEY) ?? "";
  } catch {
    return "";
  }
}

export function setzeAtlasCode(code: string): void {
  try {
    const sauber = code.trim();
    if (sauber) window.localStorage.setItem(CODE_KEY, sauber);
    else window.localStorage.removeItem(CODE_KEY);
  } catch {
    /* privater Modus */
  }
}

/** Kopfzeilen einer ATLAS-Anfrage. `strom`: neues Stromformat anfordern. */
export function atlasKopf(strom = false): Record<string, string> {
  const code = typeof window === "undefined" ? "" : atlasCode();
  return {
    "Content-Type": "application/json",
    ...(code ? { [ZUGANG_KOPF]: code } : {}),
    ...(strom ? { [STROM_KOPF]: "2" } : {}),
  };
}

/** Heutiges Datum des Geräts als JJJJ-MM-TT — der Server läuft in UTC und
 *  wüsste abends nicht, welcher Tag beim Nutzer ist. */
export function geraeteDatum(d: Date = new Date()): string {
  const zwei = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${zwei(d.getMonth() + 1)}-${zwei(d.getDate())}`;
}

/** Fehlerart aus einer JSON-Antwort der ATLAS-Routen. */
export function fehlerAus(
  status: number,
  j: { configured?: unknown; fehler?: unknown } | null,
): AtlasFehlerArt {
  if (j?.configured === false) return "aus";
  if (istFehlerArt(j?.fehler)) return j.fehler;
  if (status === 429) return "limit";
  if (status === 401) return "zugang";
  return status >= 500 ? "ueberlastet" : "netz";
}

export type StromErgebnis =
  | { ok: true; text: string }
  | { ok: false; fehler: AtlasFehlerArt; text: string };

const istAbbruch = (e: unknown) => e instanceof Error && e.name === "AbortError";

/**
 * Schickt eine Anfrage an eine Strom-Route (Chat, Auswertung, Rückblick) und
 * liest den Text Stück für Stück. `beiText` bekommt jeweils den ganzen
 * bisherigen Text. Wirft nie.
 *
 * Der Strom endet mit `STROM_ENDE` und einer JSON-Zeile. Fehlt sie, ist die
 * Verbindung abgerissen (Zeitlimit des Servers, Netz weg) — dann gilt der
 * Text NICHT als fertige Antwort.
 */
export async function atlasStrom(
  url: string,
  body: unknown,
  opts: { beiText?: (bisher: string) => void; signal?: AbortSignal } = {},
): Promise<StromErgebnis> {
  if (typeof navigator !== "undefined" && navigator.onLine === false)
    return { ok: false, fehler: "netz", text: "" };
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: atlasKopf(true),
      body: JSON.stringify(body),
      signal: opts.signal,
    });
  } catch (e) {
    return { ok: false, fehler: istAbbruch(e) ? "abgebrochen" : "netz", text: "" };
  }
  if (res.headers.get("content-type")?.includes("application/json")) {
    const j = (await res.json().catch(() => null)) as { configured?: unknown; fehler?: unknown } | null;
    return { ok: false, fehler: fehlerAus(res.status, j), text: "" };
  }
  if (!res.ok || !res.body) return { ok: false, fehler: fehlerAus(res.status, null), text: "" };

  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let roh = "";
  const sichtbar = () => {
    const i = roh.indexOf(STROM_ENDE);
    return i < 0 ? roh : roh.slice(0, i);
  };
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      roh += dec.decode(value, { stream: true });
      opts.beiText?.(sichtbar());
    }
  } catch (e) {
    return { ok: false, fehler: istAbbruch(e) ? "abgebrochen" : "netz", text: sichtbar() };
  }
  const i = roh.indexOf(STROM_ENDE);
  if (i < 0) return { ok: false, fehler: "netz", text: roh };
  let ende: { ok?: unknown; fehler?: unknown } = {};
  try {
    ende = JSON.parse(roh.slice(i + 1)) as typeof ende;
  } catch {
    /* unlesbares Ende zählt als abgerissen */
  }
  const text = roh.slice(0, i);
  if (ende.ok === true) return { ok: true, text };
  return { ok: false, fehler: istFehlerArt(ende.fehler) ? ende.fehler : "netz", text };
}
