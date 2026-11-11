import { ATLAS_FEHLER_STATUS, ATLAS_FEHLER_TEXT, STROM_KOPF, type AtlasFehlerArt } from "@/lib/atlas/fehler";
import { zugangErlaubt, zugangStatus } from "@/lib/atlas/zugang";
import { allowRequest, clientKey } from "@/lib/rate-limit";

/** JSON-Fehlerantwort einer ATLAS-Route: `fehler` ist die Art für die
 *  Oberfläche, `error` der Satz für ältere Fenster, die nur ihn lesen. */
export function fehlerAntwort(art: AtlasFehlerArt): Response {
  if (art === "aus") return Response.json({ configured: false });
  return Response.json(
    { ok: false, fehler: art, error: ATLAS_FEHLER_TEXT[art] },
    { status: ATLAS_FEHLER_STATUS[art] },
  );
}

export type Eingang<T> =
  | { ok: true; apiKey: string; body: T; v2: boolean }
  | { ok: false; antwort: Response };

/**
 * Was jede ATLAS-Route zuerst prüft, in dieser Reihenfolge: Schlüssel da?
 * Zugangscode (falls verlangt)? Minuten-Limit? Lesbare Anfrage?
 */
export async function atlasEingang<T>(
  req: Request,
  route: string,
  jeMinute: number,
): Promise<Eingang<T>> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return { ok: false, antwort: fehlerAntwort("aus") };
  if (!zugangErlaubt(zugangStatus(req))) return { ok: false, antwort: fehlerAntwort("zugang") };
  if (!allowRequest(`atlas-${route}:${clientKey(req)}`, jeMinute, 60_000))
    return { ok: false, antwort: fehlerAntwort("limit") };
  let body: T;
  try {
    body = (await req.json()) as T;
  } catch {
    return {
      ok: false,
      antwort: Response.json({ ok: false, fehler: "anfrage", error: "Ungültige Anfrage." }, { status: 400 }),
    };
  }
  return { ok: true, apiKey, body, v2: req.headers.get(STROM_KOPF) === "2" };
}

/** Freitext aus einer Anfrage: Typ geprüft, Länge gekappt. */
export const text = (v: unknown, max: number): string =>
  typeof v === "string" ? v.slice(0, max) : "";

/**
 * „Heute ist Dienstag, der 10. November 2026.“ — das Modell kennt das Datum
 * sonst nicht und rechnet „vor drei Tagen“ gegen sein Trainingswissen.
 * Bevorzugt das Datum des Geräts (`JJJJ-MM-TT`), sonst deutsche Zeit.
 */
export function heuteZeile(datum?: unknown): string {
  const vomGeraet =
    typeof datum === "string" && /^\d{4}-\d{2}-\d{2}$/.test(datum) ? new Date(`${datum}T12:00:00Z`) : null;
  const d = vomGeraet && Number.isFinite(vomGeraet.getTime()) ? vomGeraet : new Date();
  const tz = vomGeraet ? "UTC" : "Europe/Berlin";
  const tag = d.toLocaleDateString("de-DE", { weekday: "long", timeZone: tz });
  const lang = d.toLocaleDateString("de-DE", { day: "numeric", month: "long", year: "numeric", timeZone: tz });
  return `Heute ist ${tag}, der ${lang}.`;
}
