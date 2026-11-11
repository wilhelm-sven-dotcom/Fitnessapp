/**
 * Code-Feld der Cloud-Anmeldung: nimmt den Code aus der Mail oder den
 * kopierten Anmelde-Link (für die App auf dem Home-Bildschirm, wo der Link
 * sonst nur Safari öffnet).
 */
import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { leseAnmeldeEingabe } from "@/lib/anmeldung";

const LINK =
  "https://abcd1234.supabase.co/auth/v1/verify?token=9f2c7e1b5a&type=magiclink&redirect_to=https://fitnessapp-blush.vercel.app/settings";

describe("Anmeldung: Code oder Link", () => {
  test("Code mit 6 bis 10 Ziffern, Leerzeichen und Bindestriche egal", () => {
    assert.deepEqual(leseAnmeldeEingabe("123456"), { art: "code", code: "123456" });
    assert.deepEqual(leseAnmeldeEingabe(" 123 456 "), { art: "code", code: "123456" });
    assert.deepEqual(leseAnmeldeEingabe("1234-5678"), { art: "code", code: "12345678" });
    assert.equal(leseAnmeldeEingabe("12345"), null);
    assert.equal(leseAnmeldeEingabe("12345678901"), null);
    assert.equal(leseAnmeldeEingabe(""), null);
  });

  test("Link aus der Standard-Vorlage: Token und Typ", () => {
    assert.deepEqual(leseAnmeldeEingabe(LINK), { art: "link", tokenHash: "9f2c7e1b5a", typ: "magiclink" });
  });

  test("Link für ein neues Konto und Link mit token_hash", () => {
    assert.deepEqual(leseAnmeldeEingabe(LINK.replace("type=magiclink", "type=signup")), {
      art: "link",
      tokenHash: "9f2c7e1b5a",
      typ: "signup",
    });
    assert.deepEqual(
      leseAnmeldeEingabe("https://fitnessapp-blush.vercel.app/auth/confirm?token_hash=abc&type=email"),
      { art: "link", tokenHash: "abc", typ: "email" },
    );
  });

  test("Link mit Text drumherum, wie er beim Kopieren aus der Mail kommen kann", () => {
    assert.deepEqual(leseAnmeldeEingabe(`Anmelden: ${LINK} \n`), {
      art: "link",
      tokenHash: "9f2c7e1b5a",
      typ: "magiclink",
    });
  });

  test("von einem Mail-Schutz umgeschriebener Link", () => {
    const geschuetzt = `https://eur01.safelinks.protection.outlook.com/?url=${encodeURIComponent(LINK)}&data=05`;
    assert.deepEqual(leseAnmeldeEingabe(geschuetzt), { art: "link", tokenHash: "9f2c7e1b5a", typ: "magiclink" });
  });

  test("kein Code und kein Anmelde-Link: null", () => {
    assert.equal(leseAnmeldeEingabe("https://fitnessapp-blush.vercel.app/settings"), null);
    assert.equal(leseAnmeldeEingabe(LINK.replace("type=magiclink", "type=irgendwas")), null);
    assert.equal(leseAnmeldeEingabe("hallo"), null);
  });
});
