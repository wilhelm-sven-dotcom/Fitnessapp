import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { aufwaermPlan } from "@/lib/aufwaermsaetze";
import {
  estimateSessionMin,
  estimateSlotMin,
  fitToBudget,
  istGrunduebung,
  restSecFor,
  TIME,
} from "@/lib/session-time";
import type { ResolvedSlot } from "@/lib/types";
import { ex } from "./helfer";

const slot = (id: string, sets = 3, pool: string[] = []): ResolvedSlot => ({
  ex: ex(id, { sets }),
  slotKey: `today:${id}`,
  pool: pool.map((p) => ex(p)),
});

describe("Pause nach Übungsart", () => {
  it("gibt Grundübungen 2:30", () => {
    for (const id of ["leg_press", "hack_squat", "chest_press_machine", "shoulder_press_machine", "row_machine", "lat_pulldown", "bench_db", "pullup"])
      assert.equal(restSecFor(ex(id)), 150, id);
  });

  it("lässt eingelenkige Übungen, Arme, Schultern, Waden und Rumpf bei 1:30", () => {
    for (const id of ["leg_extension", "leg_curl", "pec_deck", "cable_fly", "back_ext", "straight_arm_pulldown", "cable_curl", "pushdown", "cable_lateral", "calf_seated", "cable_chop"])
      assert.equal(restSecFor(ex(id)), 90, id);
  });

  it("zählt Halteübungen nicht zu den Grundübungen", () => {
    assert.equal(istGrunduebung(ex("wall_sit")), false);
    assert.equal(restSecFor(ex("plank")), 90);
  });
});

describe("Aufwärmsätze", () => {
  it("bekommt nur die erste gewichtete Übung für einen Muskel", () => {
    const reihe = [ex("leg_press"), ex("leg_extension"), ex("chest_press_machine"), ex("pec_deck")];
    assert.deepEqual(aufwaermPlan(reihe), [true, false, true, false]);
  });

  it("zählt den Nebenmuskel einer früheren Übung als vorgewärmt", () => {
    // Schulterpresse arbeitet den Trizeps mit — Trizepsdrücken danach ohne Aufwärmsätze.
    const reihe = [ex("shoulder_press_machine"), ex("pushdown")];
    assert.deepEqual(aufwaermPlan(reihe), [true, false]);
  });

  it("gibt Übungen ohne Gewicht, Cardio und unbekannten Übungen keine", () => {
    assert.deepEqual(aufwaermPlan([ex("pushup"), undefined, ex("bench_db")]), [false, false, false]);
  });

  it("wärmt mit einer Übung ohne Gewicht den Muskel trotzdem vor", () => {
    // Liegestütz (Brust) vor Bankdrücken (Brust): Bankdrücken ohne Aufwärmsätze.
    assert.deepEqual(aufwaermPlan([ex("pushup"), ex("bench_db")]), [false, false]);
  });
});

describe("Zeitschätzung", () => {
  it("rechnet Grundübungen mit 2:30 Pause und eingelenkige mit 1:30", () => {
    const grund = estimateSlotMin(ex("leg_press", { sets: 3 }), false);
    const iso = estimateSlotMin(ex("leg_extension", { sets: 3 }), false);
    assert.equal(Math.round((grund - iso) * 60), 3 * (TIME.restGrundSec - TIME.restSec));
  });

  it("zählt die Aufwärmsätze nur bei der ersten Übung je Muskel", () => {
    const mitBeiden = estimateSlotMin(ex("leg_press"), true) + estimateSlotMin(ex("leg_extension"), true);
    const einheit = estimateSessionMin([slot("leg_press"), slot("leg_extension")]);
    const gespart = 2 * (TIME.warmupSetSec + TIME.warmupRestSec) / 60;
    assert.ok(Math.abs(einheit - (mitBeiden - gespart)) <= 1, `${einheit} gegen ${mitBeiden - gespart}`);
  });
});

describe("Zeitfenster (fitToBudget)", () => {
  const plan = () => [
    slot("leg_press", 4),
    slot("chest_press_machine", 4),
    slot("row_machine", 4),
    slot("shoulder_press_machine", 3),
    slot("cable_curl", 3),
    slot("pushdown", 3),
    slot("cable_chop", 3),
  ];

  it("kürzt eine zu lange Einheit auf das Zeitfenster", () => {
    const vorher = estimateSessionMin(plan());
    const r = fitToBudget(plan(), 30);
    assert.ok(vorher > 32, `Ausgangsplan ${vorher} Min`);
    assert.ok(r.estMin <= 32, `nach dem Kürzen ${r.estMin} Min`);
    assert.equal(r.adjusted, "trim");
  });

  it("ergänzt mit „nur kürzen“ weder Sätze noch Übungen", () => {
    const kurz = [slot("leg_press", 2, ["hack_squat"]), slot("chest_press_machine", 2), slot("row_machine", 2)];
    const r = fitToBudget(kurz, 90, { nurKuerzen: true });
    assert.equal(r.adjusted, "none");
    assert.deepEqual(r.list.map((s) => [s.ex.id, s.ex.sets]), [["leg_press", 2], ["chest_press_machine", 2], ["row_machine", 2]]);
  });

  it("füllt ohne „nur kürzen“ ein großes Zeitfenster auf", () => {
    const kurz = [slot("leg_press", 2, ["hack_squat"]), slot("chest_press_machine", 2), slot("row_machine", 2)];
    const r = fitToBudget(kurz, 90);
    assert.notEqual(r.adjusted, "none");
    assert.ok(r.estMin > estimateSessionMin(kurz));
  });
});
