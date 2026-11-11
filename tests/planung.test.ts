import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { LIB } from "@/lib/exercises";
import { stressesInjury } from "@/lib/progression";
import { generateFallbackSession } from "@/lib/session-fallback";
import { passeZeitAn, schoneRuecken, type DailySession } from "@/lib/session-model";
import { estimateSessionMin } from "@/lib/session-time";
import { resolveDailySession } from "@/lib/session-model";
import { einheit, ex, hasStudio, hasZuhause, satz, uebung } from "./helfer";

const byId = new Map(LIB.map((e) => [e.id, e]));
const muster = (s: DailySession) => s.items.map((it) => byId.get(it.exerciseId)!.pattern);
const UNTERKOERPER = new Set(["squat", "lunge", "hinge"]);

/** Einheit aus Übungs-Ids (3 Sätze je Übung). */
function plan(ids: string[], mehr: Partial<DailySession> = {}): DailySession {
  return {
    id: "t",
    date: "2026-11-10",
    name: "Test",
    focus: "",
    briefing: "",
    items: ids.map((id, i) => {
      const e = ex(id);
      return { id: `i${i + 1}`, exerciseId: id, sets: 3, repLow: e.repLow, repHigh: e.repHigh, why: "", intro: "" };
    }),
    source: "atlas",
    variant: "normal",
    createdAt: new Date().toISOString(),
    schemaVersion: 1,
    ...mehr,
  } as DailySession;
}

describe("Basisplan", () => {
  it("hat im Studio (nur an Geräten) immer eine Unterkörper-Hauptübung", () => {
    // Gesäß/Beinrückseite haben den größten Bedarf: früher gewann dann der
    // Ausfallschritt, den es an Geräten nicht gibt, und der Platz blieb leer.
    const log = [
      einheit(2, [
        uebung("leg_press", [satz(100, 12, 2), satz(100, 12, 2), satz(100, 12, 2), satz(100, 12, 2)]),
        uebung("leg_extension", [satz(40, 12, 2), satz(40, 12, 2), satz(40, 12, 2), satz(40, 12, 2)]),
      ]),
    ];
    const s = generateFallbackSession({ allLib: LIB, has: hasStudio, log, budgetMin: 45, injuries: [] });
    assert.ok(UNTERKOERPER.has(muster(s)[0]), `erste Übung: ${s.items[0]?.exerciseId}`);
    assert.ok(s.items.length >= 4, `${s.items.length} Übungen`);
  });

  it("plant im Studio nur Übungen an Geräten", () => {
    const s = generateFallbackSession({ allLib: LIB, has: hasStudio, log: [], budgetMin: 60, injuries: [] });
    for (const it of s.items) {
      const e = byId.get(it.exerciseId)!;
      assert.ok(e.req.some((t) => t === "cable" || t.startsWith("m_")), `${e.id} ist keine Geräte-Übung`);
    }
  });

  it("nimmt bei Rückenschonung auch in langen Einheiten keine rückenkritische Übung dazu", () => {
    // Lange Einheiten werden mit Zusatz-Übungen aufgefüllt. Im Studio sind die
    // Pools klein, dort kamen so Rückenstrecker und Pull-Through dazu.
    for (const [ort, has] of [["Zuhause", hasZuhause], ["Studio", hasStudio]] as const) {
      for (const budgetMin of [45, 60, 90, 120, 180]) {
        const s = generateFallbackSession({
          allLib: LIB,
          has,
          log: [],
          budgetMin,
          backSafe: true,
          injuries: ["rücken"],
        });
        const kritisch = s.items
          .map((it) => byId.get(it.exerciseId)!)
          .filter((e) => stressesInjury(e, "rücken"));
        assert.deepEqual(kritisch.map((e) => e.id), [], `${ort}, ${budgetMin} Min`);
      }
    }
  });

  it("setzt kleine Muskeln nicht vor große, die genauso lange Pause hatten", () => {
    // Heute schon trainiert: Brust, Rücken, Schultern, Oberschenkel. Offen sind
    // Beinrückseite, Gesäß, Rumpf — und die kleinen Muskeln. Mit EINEM Ziel
    // für alle lagen Bizeps und Trizeps gleichauf und standen (Reihenfolge)
    // vorn; mit eigenem, kleinerem Zielband führen die großen Muskeln.
    const vier = (w: number) => [satz(w, 10, 2), satz(w, 10, 2), satz(w, 10, 2), satz(w, 10, 2)];
    const log = [
      einheit(0, [
        uebung("bench_db", vier(20)),
        uebung("row1", vier(20)),
        uebung("ohp_stand", vier(12)),
        uebung("goblet", vier(20)),
      ]),
    ];
    const s = generateFallbackSession({ allLib: LIB, has: hasZuhause, log, budgetMin: 45, injuries: [] });
    assert.doesNotMatch(s.focus, /Unterarme|Bizeps|Trizeps|Waden/, `Fokus „${s.focus}“`);
  });

  it("passt in das Zeitfenster (zwei Minuten Toleranz)", () => {
    for (const budgetMin of [20, 30, 45, 60]) {
      const s = generateFallbackSession({ allLib: LIB, has: hasStudio, log: [], budgetMin, injuries: [] });
      const min = estimateSessionMin(resolveDailySession(s, LIB, hasStudio));
      assert.ok(min <= budgetMin + 2, `${budgetMin} Min geplant, ${min} Min geschätzt`);
    }
  });
});

describe("Rückenschonung für eine bestehende Einheit", () => {
  it("tauscht rückenkritische Übungen gegen schonende desselben Musters", () => {
    const s = plan(["rdl_db", "bench_db", "crunch"]);
    const r = schoneRuecken(s, LIB, hasZuhause);
    const neu = r.session.items.map((it) => byId.get(it.exerciseId)!);
    assert.equal(r.getauscht.length, 2);
    assert.equal(neu[0].pattern, "hinge");
    assert.equal(neu[2].pattern, "core");
    assert.ok(neu.every((e) => !stressesInjury(e, "rücken")));
    assert.equal(neu[1].id, "bench_db");
    assert.ok(neu[2].backStabilizer, `Rumpf-Ersatz ${neu[2].id} ist kein Stabilisator`);
  });

  it("behält Satzzahl und Reihenfolge und markiert die Einheit nicht als bearbeitet", () => {
    const s = plan(["rdl_db", "bench_db"]);
    const r = schoneRuecken(s, LIB, hasZuhause);
    assert.equal(r.session.items[0].id, "i1");
    assert.equal(r.session.items[0].sets, 3);
    assert.equal(r.session.edited, undefined);
  });

  it("streicht die Übung, wenn der Ort keine schonende hergibt", () => {
    // Studio nur an Geräten, Rückenstrecker und Pull-Through sind die einzigen
    // Hüftstrecker-Übungen neben dem Beinbeuger.
    const nurHinge = (k: string) => k === "nur-geraete" || k === "m_rueckenstrecker" || k === "m_brustpresse";
    const s = plan(["back_ext", "chest_press_machine"]);
    const r = schoneRuecken(s, LIB, nurHinge);
    assert.deepEqual(r.session.items.map((it) => it.exerciseId), ["chest_press_machine"]);
    assert.equal(r.gestrichen.length, 1);
  });

  it("streicht nie die letzte Übung", () => {
    const nur = (k: string) => k === "nur-geraete" || k === "m_rueckenstrecker";
    const s = plan(["back_ext"]);
    const r = schoneRuecken(s, LIB, nur);
    assert.equal(r.session.items.length, 1);
  });

  it("lässt eine schon schonende Einheit unverändert (dasselbe Objekt)", () => {
    const s = plan(["leg_press", "chest_press_machine", "row_machine"]);
    const r = schoneRuecken(s, LIB, hasStudio);
    assert.equal(r.session, s);
  });
});

describe("ATLAS-Plan und Zeitfenster", () => {
  it("kürzt einen zu langen Plan, ohne Übungen zu erfinden", () => {
    const s = plan(["leg_press", "hack_squat", "chest_press_machine", "row_machine", "shoulder_press_machine", "lat_pulldown", "cable_curl", "pushdown"]);
    const vorher = estimateSessionMin(resolveDailySession(s, LIB, hasStudio));
    const r = passeZeitAn(s, LIB, hasStudio, 30, { nurKuerzen: true });
    const nachher = estimateSessionMin(resolveDailySession(r, LIB, hasStudio));
    assert.ok(vorher > 45, `Ausgang ${vorher} Min`);
    assert.ok(nachher <= 32, `nach dem Kürzen ${nachher} Min`);
    const ids = new Set(s.items.map((it) => it.exerciseId));
    assert.ok(r.items.every((it) => ids.has(it.exerciseId)));
  });

  it("lässt einen kurzen Plan mit „nur kürzen“ unverändert", () => {
    const s = plan(["leg_press", "chest_press_machine", "row_machine"]);
    const r = passeZeitAn(s, LIB, hasStudio, 90, { nurKuerzen: true });
    assert.deepEqual(r.items, s.items);
  });
});
