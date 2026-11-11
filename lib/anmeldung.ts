/**
 * Was jemand ins Code-Feld der Cloud-Anmeldung tippt oder einfügt.
 *
 * Ob die Anmelde-Mail von Supabase einen Code oder nur einen Link enthält,
 * entscheidet die Mail-Vorlage im Supabase-Projekt (`{{ .Token }}` bzw.
 * `{{ .ConfirmationURL }}`), nicht die App. In der App auf dem
 * Home-Bildschirm hilft der Link nicht: iOS öffnet ihn in Safari, und Safari
 * hat einen eigenen Speicher, die Anmeldung landet also nicht in der App.
 *
 * Darum nimmt das Feld beides: den Code aus der Mail oder den kopierten Link.
 * Aus dem Link zählen nur `token` (bzw. `token_hash`) und `type`; damit meldet
 * `verifyOtp({ token_hash, type })` direkt in der App an, ohne Safari.
 * Hat ein Mail-Schutz (z. B. „Safe Links“) den Link umgeschrieben, steckt der
 * echte Link als Parameter darin; auch der wird gefunden.
 */

const LINK_TYPEN = ["magiclink", "signup", "recovery", "invite", "email_change", "email"] as const;
export type LinkTyp = (typeof LINK_TYPEN)[number];

export type AnmeldeEingabe =
  | { art: "code"; code: string }
  | { art: "link"; tokenHash: string; typ: LinkTyp };

const istLinkTyp = (t: string | null): t is LinkTyp => !!t && (LINK_TYPEN as readonly string[]).includes(t);

/** Token und Typ aus einer Adresse, auch eine Ebene tiefer in einem Parameter. */
function ausAdresse(text: string, tiefe = 0): AnmeldeEingabe | null {
  let url: URL;
  try {
    url = new URL(text);
  } catch {
    return null;
  }
  const tokenHash = url.searchParams.get("token_hash") ?? url.searchParams.get("token");
  const typ = url.searchParams.get("type");
  if (tokenHash && istLinkTyp(typ)) return { art: "link", tokenHash, typ };
  if (tiefe > 0) return null;
  for (const wert of url.searchParams.values()) {
    if (/^https?:\/\//i.test(wert)) {
      const innen = ausAdresse(wert, tiefe + 1);
      if (innen) return innen;
    }
  }
  return null;
}

/**
 * Code (6 bis 10 Ziffern, Leerzeichen und Bindestriche egal) oder Anmelde-Link
 * aus der Mail; `null`, wenn es keins von beiden ist.
 */
export function leseAnmeldeEingabe(text: string): AnmeldeEingabe | null {
  const roh = text.trim();
  if (!roh) return null;
  const ziffern = roh.replace(/[\s-]/g, "");
  if (/^\d{6,10}$/.test(ziffern)) return { art: "code", code: ziffern };
  const adresse = roh.match(/https?:\/\/[^\s<>"']+/i);
  return adresse ? ausAdresse(adresse[0]) : null;
}
