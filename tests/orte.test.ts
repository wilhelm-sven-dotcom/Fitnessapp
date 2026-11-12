/** Orte: Gewichtsstufe, ein Ort je Name (lib/orte.ts). */
import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { ensureOrte, freierOrtsname, gewichtsstufe, ORT_ZUHAUSE_ID, ortSignatur } from "@/lib/orte";
import type { AppSettings, GymProfile } from "@/lib/types";

describe("Gewichtsstufe je Ort", () => {
  test("die Stufe des Orts gilt vor der allgemeinen", () => {
    assert.equal(gewichtsstufe({ weightStep: 5 }, { weightStep: 1.25 }), 5);
  });

  test("ohne eigene Stufe gilt die allgemeine aus den Einstellungen", () => {
    assert.equal(gewichtsstufe({}, { weightStep: 1.25 }), 1.25);
    assert.equal(gewichtsstufe(null, { weightStep: 5 }), 5);
  });

  test("ohne beides und bei unbrauchbaren Werten gelten 2,5 kg", () => {
    assert.equal(gewichtsstufe(undefined, {}), 2.5);
    assert.equal(gewichtsstufe({ weightStep: 0 }, { weightStep: Number.NaN }), 2.5);
    assert.equal(gewichtsstufe({ weightStep: -5 }, {}), 2.5);
  });
});

describe("Ein Ort je Name", () => {
  const fertig = { orteM1: true, geraeteM1: true } as AppSettings;
  const alt: GymProfile = { id: "gym_abc", name: "Zuhause", equip: ["db", "bench"] };
  const vorbelegt: GymProfile = { id: ORT_ZUHAUSE_ID, name: "Zuhause", equip: ["db", "kb", "bar"] };
  const studio: GymProfile = { id: "gym_studio", name: "Studio", equip: ["cable"], nurGeraete: true };

  test("zwei „Zuhause“ mit verschiedenen Geräten: der aktive bleibt, mit seinen Geräten", () => {
    const r = ensureOrte([alt, studio, vorbelegt], [], { ...fertig, activeGymId: "gym_abc" });
    assert.deepEqual(r.gyms.map((g) => g.id), ["gym_abc", "gym_studio"]);
    assert.deepEqual(r.gyms[0].equip, ["db", "bench"]);
    assert.equal(r.settings.activeGymId, "gym_abc");
    assert.equal(r.changed, true);
  });

  test("ist der andere aktiv, bleibt der", () => {
    const r = ensureOrte([alt, studio, vorbelegt], [], { ...fertig, activeGymId: ORT_ZUHAUSE_ID });
    assert.deepEqual(r.gyms.map((g) => g.id), ["gym_studio", ORT_ZUHAUSE_ID]);
    assert.deepEqual(r.gyms[1].equip, ["db", "kb", "bar"]);
  });

  test("ist ein dritter Ort aktiv, bleibt der vorbelegte; „Mein Gym“ zählt als „Zuhause“", () => {
    const meinGym: GymProfile = { ...alt, name: "Mein Gym" };
    const r = ensureOrte([meinGym, studio, vorbelegt], [], { ...fertig, activeGymId: "gym_studio" });
    assert.deepEqual(r.gyms.map((g) => g.id), ["gym_studio", ORT_ZUHAUSE_ID]);
  });

  test("verschiedene Namen bleiben, ein zweiter Lauf ändert nichts mehr", () => {
    const r = ensureOrte([alt, studio], [], { ...fertig, activeGymId: "gym_abc" });
    assert.equal(r.gyms.length, 2);
    assert.equal(r.changed, false);
  });

  test("neuer oder umbenannter Ort bekommt einen freien Namen", () => {
    assert.equal(freierOrtsname("Garage", [alt, studio]), "Garage");
    assert.equal(freierOrtsname("zuhause", [alt, studio]), "zuhause 2");
    assert.equal(freierOrtsname("Zuhause", [alt, { id: "x", name: "Zuhause 2" }]), "Zuhause 3");
    // Umbenennen auf den eigenen Namen ist kein Konflikt.
    assert.equal(freierOrtsname("Zuhause", [alt, studio], "gym_abc"), "Zuhause");
  });
});

describe("Signatur des Orts", () => {
  const ort: GymProfile = { id: "gym_zuhause", name: "Zuhause", equip: ["db", "bench"] };

  test("ohne ausgeblendete Übungen bleibt sie wie bisher", () => {
    assert.equal(ortSignatur(ort), "gym_zuhause|bench,db");
    assert.equal(ortSignatur(ort, []), ortSignatur(ort));
  });

  test("ändert sich mit der Auswahl im Katalog, die Reihenfolge ist egal", () => {
    const a = ortSignatur(ort, ["pushup", "plank"]);
    assert.notEqual(a, ortSignatur(ort));
    assert.equal(a, ortSignatur(ort, ["plank", "pushup"]));
    assert.notEqual(a, ortSignatur(ort, ["pushup"]));
    assert.notEqual(a, ortSignatur(ort, ["pushup", "crunch"]));
  });
});
