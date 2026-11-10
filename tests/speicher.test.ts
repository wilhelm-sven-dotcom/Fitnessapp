/**
 * Speicherschicht (lib/storage.ts): Schreiben meldet Erfolg, vom Verlauf
 * bleibt eine Sicherung, Unlesbares wird beiseitegelegt statt gelöscht.
 */
import assert from "node:assert/strict";
import { beforeEach, describe, test } from "node:test";
import { KEYS, SPEICHER_VOLL, cloudOffen, cloudPush, storage } from "@/lib/storage";
import { ereignisse, frischerSpeicher, type SpeicherAttrappe } from "./speicher-attrappe";

const LOG = KEYS.log;
const eintrag = (tag: string) => ({ date: `2026-11-${tag}T18:00:00.000Z` });
const GESTERN = "2020-01-01";

let ls: SpeicherAttrappe;
beforeEach(() => {
  ls = frischerSpeicher();
});

describe("Schreiben meldet Erfolg", () => {
  test("gespeichert → true, der Wert steht da", async () => {
    assert.equal(await storage.setJSON(LOG, [eintrag("01")]), true);
    assert.deepEqual(await storage.getJSON(LOG, []), [eintrag("01")]);
  });

  test("Speicher voll → false, der alte Wert bleibt", async () => {
    await storage.setJSON(KEYS.settings, { a: 1 });
    ls.grenze = 40;
    assert.equal(await storage.setJSON(KEYS.settings, { a: "x".repeat(200) }), false);
    assert.deepEqual(await storage.getJSON(KEYS.settings, null), { a: 1 });
  });

  test("Speicher voll → die App meldet sich, außer der Aufrufer kümmert sich selbst", async () => {
    ls.grenze = 10;
    await storage.setJSON(KEYS.settings, { a: 1 }, { still: true });
    assert.deepEqual(ereignisse, []);
    await storage.setJSON(KEYS.settings, { a: 1 });
    assert.deepEqual(ereignisse, [SPEICHER_VOLL]);
  });

  test("Speicher voll → Sicherungen weichen dem neuen Stand", async () => {
    const alt = [eintrag("01"), eintrag("02")];
    await storage.setJSON(LOG, alt);
    await storage.setJSON(LOG, [...alt, eintrag("03")]); // legt die Sicherung an
    assert.ok(ls.getItem(`${LOG}-sicherung`));
    const neu = [...alt, eintrag("03"), eintrag("04")];
    // Platz für den neuen Stand, aber nicht zusätzlich für die Sicherung.
    ls.grenze = LOG.length + JSON.stringify(neu).length + 10;
    assert.equal(await storage.setJSON(LOG, neu), true);
    assert.equal(ls.getItem(`${LOG}-sicherung`), null);
    assert.deepEqual(await storage.getJSON(LOG, []), neu);
  });
});

describe("Sicherung des Verlaufs", () => {
  test("die erste Änderung des Tages hält den Stand davor fest", async () => {
    await storage.setJSON(LOG, [eintrag("01")]);
    assert.equal(await storage.sicherung(LOG), null, "ohne Vorgänger keine Sicherung");
    await storage.setJSON(LOG, [eintrag("01"), eintrag("02")]);
    assert.equal((await storage.sicherung(LOG))?.anzahl, 1);
    // Weitere Änderungen am selben Tag lassen die Sicherung stehen.
    await storage.setJSON(LOG, [eintrag("01"), eintrag("02"), eintrag("03")]);
    assert.equal((await storage.sicherung(LOG))?.anzahl, 1);
  });

  test("am nächsten Tag rückt die Sicherung nach", async () => {
    await storage.setJSON(LOG, [eintrag("01")]);
    await storage.setJSON(LOG, [eintrag("01"), eintrag("02")]);
    ls.setItem(`${LOG}-sicherung-tag`, GESTERN);
    await storage.setJSON(LOG, [eintrag("01"), eintrag("02"), eintrag("03")]);
    assert.equal((await storage.sicherung(LOG))?.anzahl, 2);
  });

  test("ein leerer Verlauf überschreibt keine gute Sicherung", async () => {
    await storage.setJSON(LOG, [eintrag("01"), eintrag("02")]);
    await storage.setJSON(LOG, []); // alles gelöscht: Sicherung = die zwei Einheiten
    ls.setItem(`${LOG}-sicherung-tag`, GESTERN);
    await storage.setJSON(LOG, [eintrag("05")]); // Vorgänger ist leer
    assert.equal((await storage.sicherung(LOG))?.anzahl, 2);
  });

  test("Zurückholen tauscht — zweimal ergibt wieder den Ausgang", async () => {
    await storage.setJSON(LOG, [eintrag("01")]);
    await storage.setJSON(LOG, [eintrag("01"), eintrag("02")]);
    assert.deepEqual(await storage.tauscheSicherung(LOG), [eintrag("01")]);
    assert.deepEqual(await storage.getJSON(LOG, []), [eintrag("01")]);
    assert.equal((await storage.sicherung(LOG))?.anzahl, 2);
    await storage.tauscheSicherung(LOG);
    assert.deepEqual(await storage.getJSON(LOG, []), [eintrag("01"), eintrag("02")]);
  });

  test("andere Schlüssel bekommen keine Sicherung", async () => {
    await storage.setJSON(KEYS.settings, { a: 1 });
    await storage.setJSON(KEYS.settings, { a: 2 });
    assert.equal(ls.getItem(`${KEYS.settings}-sicherung`), null);
  });
});

describe("Unlesbares wird beiseitegelegt", () => {
  test("kaputter Verlauf: die Sicherung springt ein, das Kaputte bleibt liegen", async () => {
    await storage.setJSON(LOG, [eintrag("01")]);
    await storage.setJSON(LOG, [eintrag("01"), eintrag("02")]);
    ls.setItem(LOG, '[{"date":"2026-11-0');
    assert.deepEqual(await storage.getJSON(LOG, []), [eintrag("01")]);
    assert.equal(ls.getItem(`${LOG}-defekt`), '[{"date":"2026-11-0');
    assert.deepEqual(JSON.parse(ls.getItem(LOG) as string), [eintrag("01")]);
  });

  test("kaputter Wert ohne Sicherung: Vorgabe, aber nichts geht verloren", async () => {
    ls.setItem(KEYS.settings, "{kaputt");
    assert.deepEqual(await storage.getJSON(KEYS.settings, { neu: true }), { neu: true });
    assert.equal(ls.getItem(`${KEYS.settings}-defekt`), "{kaputt");
  });
});

describe("Alles löschen und Cloud", () => {
  test("leereAlles entfernt jeden Schlüssel der App, fremde bleiben", async () => {
    await storage.setJSON(LOG, [eintrag("01")]);
    await storage.setJSON(LOG, [eintrag("01"), eintrag("02")]);
    await storage.setJSONLocal(KEYS.active, { x: 1 });
    ls.setItem("sb-projekt-auth-token", "anmeldung");
    await storage.leereAlles();
    assert.deepEqual(ls.schluessel(), ["sb-projekt-auth-token"]);
  });

  test("ohne eingerichtete Cloud gibt es nichts nachzureichen", async () => {
    assert.equal(await cloudPush(LOG, "[]"), true);
    assert.equal(await cloudOffen(), false);
  });
});
