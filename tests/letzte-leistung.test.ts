import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { lastPerfOf } from "@/lib/last-perf";
import { presc } from "@/lib/progression";
import { einheit, ex, satz, uebung, warm } from "./helfer";

describe("Ausgangswert für den nächsten Vorschlag", () => {
  const normal = einheit(10, [uebung("leg_press", [satz(100, 12, 2), satz(100, 12, 2)])]);
  const entlastung = einheit(4, [uebung("leg_press", [satz(60, 10, 4), satz(60, 10, 4)])], { isDeload: true });
  const test = einheit(2, [uebung("leg_press", [satz(130, 3, 1)])], { isExam: true });

  it("nimmt die jüngste normale Einheit", () => {
    const lp = lastPerfOf([normal], "leg_press");
    assert.equal(lp?.sets[0].weight, "100");
  });

  it("überspringt Entlastungs- und Test-Einheiten", () => {
    const lp = lastPerfOf([normal, entlastung, test], "leg_press");
    assert.equal(lp?.sets[0].weight, "100");
    assert.equal(lp?.date, normal.date);
  });

  it("rechnet nach einer Entlastungswoche vom Gewicht davor weiter, nicht von den 60 %", () => {
    const lp = lastPerfOf([normal, entlastung], "leg_press");
    const p = presc(ex("leg_press", { sets: 2, repLow: 10, repHigh: 12 }), lp);
    assert.equal(p.w, "102.5");
  });

  it("nimmt die Entlastung, wenn es sonst keine Leistung gibt", () => {
    const lp = lastPerfOf([entlastung], "leg_press");
    assert.equal(lp?.sets[0].weight, "60");
  });

  it("zählt eine Übung nur mit gefülltem Arbeitssatz", () => {
    const nurWarm = einheit(1, [uebung("leg_press", [warm(40)])]);
    assert.equal(lastPerfOf([normal, nurWarm], "leg_press")?.date, normal.date);
    assert.equal(lastPerfOf([nurWarm], "leg_press"), null);
  });

  it("kennt keine Leistung für eine nie trainierte Übung", () => {
    assert.equal(lastPerfOf([normal], "hack_squat"), null);
  });
});
