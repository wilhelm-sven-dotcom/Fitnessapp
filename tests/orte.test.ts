/** Gewichtsstufe je Ort (lib/orte.ts). */
import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { gewichtsstufe } from "@/lib/orte";

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
