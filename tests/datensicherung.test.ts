/**
 * Export und Import (lib/datensicherung.ts) und die liegengebliebene Einheit
 * (lib/active-session.ts).
 */
import assert from "node:assert/strict";
import { beforeEach, describe, test } from "node:test";
import {
  hatEingetrageneSaetze,
  istLiegengeblieben,
  loadActiveState,
  loadLiegengeblieben,
  type ActiveSessionState,
} from "@/lib/active-session";
import {
  ergaenze,
  nachDatum,
  ohneZugaenge,
  pruefeChat,
  pruefeSpruenge,
  vereinige,
} from "@/lib/datensicherung";
import { KEYS } from "@/lib/storage";
import type { AppSettings } from "@/lib/types";
import { frischerSpeicher, type SpeicherAttrappe } from "./speicher-attrappe";

describe("Backup ergänzen", () => {
  const geraet = [
    { date: "2026-11-03", name: "Gerät, bearbeitet" },
    { date: "2026-11-05", name: "nur Gerät" },
  ];
  const datei = [
    { date: "2026-11-01", name: "nur Datei" },
    { date: "2026-11-03", name: "Datei, alt" },
  ];

  test("Fehlendes kommt dazu, Vorhandenes bleibt vom Gerät", () => {
    const erg = nachDatum(ergaenze(geraet, datei, (x) => x.date));
    assert.deepEqual(
      erg.map((x) => x.name),
      ["nur Datei", "Gerät, bearbeitet", "nur Gerät"],
    );
  });

  test("nichts vom Gerät geht verloren, auch bei leerer Datei", () => {
    assert.deepEqual(ergaenze(geraet, [], (x) => x.date), geraet);
  });

  test("der Verlauf steht danach aufsteigend nach Datum", () => {
    const wirr = [{ date: "2026-11-09T10:00:00Z" }, { date: "2026-11-01T10:00:00Z" }, { date: "2026-11-05T10:00:00Z" }];
    assert.deepEqual(
      nachDatum(wirr).map((x) => x.date.slice(8, 10)),
      ["01", "05", "09"],
    );
  });

  test("Kennungen werden ohne Dubletten vereinigt", () => {
    assert.deepEqual(vereinige(["a", "b"], ["b", "c"]), ["a", "b", "c"]);
  });
});

describe("Export", () => {
  test("die Datei enthält keine Zugänge zu Strava und Spotify", () => {
    const s = {
      timeBudgetMin: 45,
      strava: { accessToken: "geheim", refreshToken: "geheim", expiresAt: 1 },
      spotify: { accessToken: "geheim", refreshToken: "geheim", expiresAt: 1 },
    } as unknown as AppSettings;
    const raus = ohneZugaenge(s);
    assert.equal(JSON.stringify(raus).includes("geheim"), false);
    assert.equal(raus.timeBudgetMin, 45);
    assert.ok(s.strava, "das Original bleibt unberührt");
  });

  test("Chat und Sprungtests: nur gültige Einträge kommen durch", () => {
    assert.deepEqual(
      pruefeChat([{ role: "user", content: "Hallo" }, { role: "system", content: "x" }, "quatsch", null]),
      [{ role: "user", content: "Hallo" }],
    );
    assert.equal(pruefeSpruenge([{ date: "2026-11-01", heightCm: 42 }, { date: 5, heightCm: 40 }, { heightCm: 0 }]).length, 1);
    assert.deepEqual(pruefeChat("kein Feld"), []);
  });
});

describe("Liegengebliebene Einheit", () => {
  const vorStunden = (h: number) => new Date(Date.now() - h * 3600_000).toISOString();
  const stand = (startedAt: string, reps: string): ActiveSessionState =>
    ({
      schemaVersion: 1,
      session: { name: "Ganzkörper · Zug", items: [{ id: "i1", exerciseId: "row1", sets: 3 }] },
      entries: {
        i1: [
          { weight: "10", reps: "5", warmup: true },
          { weight: "20", reps },
        ],
      },
      currentIndex: 0,
      phase: "exercise",
      startedAt,
      backSafe: false,
    }) as unknown as ActiveSessionState;

  let ls: SpeicherAttrappe;
  beforeEach(() => {
    ls = frischerSpeicher();
  });

  test("ab sechs Stunden gilt eine Einheit als liegengeblieben", () => {
    assert.equal(istLiegengeblieben(vorStunden(5)), false);
    assert.equal(istLiegengeblieben(vorStunden(7)), true);
    assert.equal(istLiegengeblieben("kein Datum"), true);
  });

  test("nur eingetragene Arbeitssätze zählen, Aufwärmsätze nicht", () => {
    assert.equal(hatEingetrageneSaetze(stand(vorStunden(1), "")), false);
    assert.equal(hatEingetrageneSaetze(stand(vorStunden(1), "12")), true);
  });

  test("eine frische Einheit wird fortgesetzt", async () => {
    ls.setItem(KEYS.active, JSON.stringify(stand(vorStunden(1), "12")));
    assert.ok(await loadActiveState());
    assert.equal(await loadLiegengeblieben(), null);
  });

  test("eine alte Einheit mit Sätzen bleibt liegen, statt zu verschwinden", async () => {
    ls.setItem(KEYS.active, JSON.stringify(stand(vorStunden(20), "12")));
    assert.equal(await loadActiveState(), null, "wird nicht still fortgesetzt");
    assert.equal((await loadLiegengeblieben())?.session.name, "Ganzkörper · Zug");
    assert.ok(ls.getItem(KEYS.active), "und nicht gelöscht");
  });

  test("eine alte Einheit ohne Sätze wird weggeräumt", async () => {
    ls.setItem(KEYS.active, JSON.stringify(stand(vorStunden(20), "")));
    assert.equal(await loadLiegengeblieben(), null);
    assert.equal(ls.getItem(KEYS.active), null);
  });
});
