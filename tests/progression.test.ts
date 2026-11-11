import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  pauseStufe,
  presc,
  rirAdjust,
  stufeHoch,
  stufeRunter,
} from "@/lib/progression";
import { ex, satz, warm } from "./helfer";

// Beinpresse mit dem Plan 3 × 10–12.
const presse = ex("leg_press", { sets: 3, repLow: 10, repHigh: 12 });
const lp = (sets: ReturnType<typeof satz>[]) => ({ sets, date: new Date().toISOString() });

describe("Gewichtsstufen", () => {
  it("geht auf dem Raster der Stufe hoch und runter", () => {
    assert.equal(stufeHoch(40, 2.5), 42.5);
    assert.equal(stufeRunter(40, 2.5), 37.5);
    assert.equal(stufeHoch(40, 5), 45);
    assert.equal(stufeRunter(40, 5), 35);
    assert.equal(stufeHoch(81.25, 1.25), 82.5);
  });

  it("springt von einem Zwischenwert auf die nächste Rasterstufe, nicht zwei weiter", () => {
    assert.equal(stufeHoch(22.5, 5), 25);
    assert.equal(stufeRunter(22.5, 5), 20);
  });

  it("fällt nie unter eine Stufe", () => {
    assert.equal(stufeRunter(2.5, 2.5), 2.5);
    assert.equal(stufeRunter(5, 5), 5);
  });
});

describe("Früher steigern (rirAdjust)", () => {
  it("steigert, wenn alle Sätze oben in der Spanne sind und 1–2 in Reserve bleiben", () => {
    const r = rirAdjust(presse, [satz(100, 12, 2), satz(100, 12, 2), satz(100, 12, 1)]);
    assert.deepEqual(r, { weight: 102.5, repTarget: 10, reason: "up" });
  });

  it("steigert weiter bei 3 in Reserve, auch unterhalb der oberen Grenze", () => {
    const r = rirAdjust(presse, [satz(100, 10, 3), satz(100, 10, 3), satz(100, 10, 4)]);
    assert.deepEqual(r, { weight: 102.5, repTarget: 10, reason: "up" });
  });

  it("hält das Gewicht und fordert eine Wiederholung mehr, solange nicht alle Sätze oben sind", () => {
    const r = rirAdjust(presse, [satz(100, 12, 2), satz(100, 11, 2), satz(100, 10, 1)]);
    assert.deepEqual(r, { weight: 100, repTarget: 12, reason: "rep" });
  });

  it("hält statt zu senken, wenn alle Sätze oben sind, aber einer am Versagen war", () => {
    const r = rirAdjust(presse, [satz(100, 12, 2), satz(100, 12, 1), satz(100, 12, 0)]);
    assert.deepEqual(r, { weight: 100, repTarget: 12, reason: "hold" });
  });

  it("senkt eine Stufe, wenn ein Satz am Versagen war und die Spanne nicht geschafft ist", () => {
    const r = rirAdjust(presse, [satz(100, 10, 1), satz(100, 9, 0), satz(100, 8, 0)]);
    assert.deepEqual(r, { weight: 97.5, repTarget: 10, reason: "down" });
  });

  it("nimmt die eingestellte Gewichtsstufe: 5 kg hoch, 5 kg runter", () => {
    const hoch = rirAdjust(presse, [satz(100, 12, 2), satz(100, 12, 2)], 5);
    assert.equal(hoch?.weight, 105);
    const runter = rirAdjust(presse, [satz(100, 9, 0), satz(100, 8, 0)], 5);
    assert.equal(runter?.weight, 95);
  });

  it("wertet einen einzelnen Satz oben nicht als Beleg für mehr Gewicht", () => {
    const r = rirAdjust(presse, [satz(100, 12, 2)]);
    assert.equal(r?.reason, "rep");
    assert.equal(r?.weight, 100);
  });

  it("zählt Aufwärmsätze nicht mit", () => {
    const r = rirAdjust(presse, [warm(40), warm(65), satz(100, 12, 2), satz(100, 12, 2)]);
    assert.equal(r?.reason, "up");
    assert.equal(r?.weight, 102.5);
  });

  it("gibt ohne RIR-Angaben nichts zurück (dann greift die Wiederholungsregel)", () => {
    assert.equal(rirAdjust(presse, [satz(100, 12), satz(100, 12)]), null);
  });
});

describe("Vorschlag (presc)", () => {
  it("schlägt nach einer sauberen Einheit oben in der Spanne die nächste Stufe vor", () => {
    const p = presc(presse, lp([satz(100, 12, 2), satz(100, 12, 2), satz(100, 12, 1)]));
    assert.equal(p.w, "102.5");
    assert.equal(p.r, "10");
    assert.equal(p.reason, "up");
  });

  it("„etwas leichter“ gibt bei 5-kg-Stufe wirklich weniger Gewicht", () => {
    const p = presc(presse, lp([satz(40, 9, 0), satz(40, 8, 0)]), { step: 5 });
    assert.equal(p.reason, "down");
    assert.equal(p.w, "35");
  });

  it("steigert ohne RIR-Angaben um die eingestellte Stufe, wenn alle Sätze oben sind", () => {
    const p = presc(presse, lp([satz(100, 12), satz(100, 12), satz(100, 12)]), { step: 5 });
    assert.equal(p.reason, "up");
    assert.equal(p.w, "105");
  });
});

describe("Trainingslücke", () => {
  it("stuft nach Tagen seit der letzten Einheit ab", () => {
    assert.equal(pauseStufe(null), undefined);
    assert.equal(pauseStufe(6), undefined);
    assert.equal(pauseStufe(13), undefined);
    assert.equal(pauseStufe(14), "ruhig");
    assert.equal(pauseStufe(27), "ruhig");
    assert.equal(pauseStufe(28), "leichter");
    assert.equal(pauseStufe(90), "leichter");
  });

  it("läuft bis 13 Tage normal weiter", () => {
    const p = presc(presse, lp([satz(100, 12, 2), satz(100, 12, 2)]), { pause: pauseStufe(7) });
    assert.equal(p.reason, "up");
  });

  it("steigt ab 14 Tagen ruhig ein: gleiches Gewicht, unterste Wiederholungszahl", () => {
    const p = presc(presse, lp([satz(100, 12, 2), satz(100, 12, 2)]), { pause: "ruhig" });
    assert.equal(p.reason, "lighter");
    assert.equal(p.w, "100");
    assert.equal(p.r, "10");
    assert.match(p.line, /^Ruhig einsteigen/);
  });

  it("nimmt ab 28 Tagen 10 % weniger Gewicht", () => {
    const p = presc(presse, lp([satz(100, 12, 2), satz(100, 12, 2)]), { pause: "leichter" });
    assert.equal(p.reason, "lighter");
    assert.equal(p.w, "90");
    assert.equal(p.r, "10");
    assert.match(p.line, /10 % leichter/);
  });

  it("rundet die 10 % auf die Gewichtsstufe", () => {
    const p = presc(presse, lp([satz(42.5, 12, 2), satz(42.5, 12, 2)]), { pause: "leichter", step: 2.5 });
    assert.equal(p.w, "37.5");
  });
});
