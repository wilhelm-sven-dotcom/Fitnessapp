import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  prefillEntries,
  reconcileEntries,
  restLeft,
  shiftRest,
  type PrefillOpts,
  type RestState,
} from "@/lib/active-session";
import { paceLabel } from "@/lib/cardio-sport";
import { LIB } from "@/lib/exercises";
import { fatigueState } from "@/lib/fatigue";
import { lastPerfOf } from "@/lib/last-perf";
import { NEUTRAL_SCALE } from "@/lib/readiness";
import {
  bestForExercise,
  exerciseRecords,
  prTimeline,
  recordsById,
  sessionBest,
} from "@/lib/records";
import { sanitizeCardio } from "@/lib/sanitize";
import type { DailySession } from "@/lib/session-model";
import type { CardioSession, LoggedSession } from "@/lib/types";
import { einheit, ex, satz, uebung, warm } from "./helfer";

function plan(ids: string[]): DailySession {
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
    source: "fallback",
    variant: "normal",
    createdAt: new Date().toISOString(),
    schemaVersion: 1,
  } as DailySession;
}

const optsMit = (log: LoggedSession[], daysAgo: number | null = 2): PrefillOpts => ({
  allLib: LIB,
  lastPerf: (id) => lastPerfOf(log, id),
  daysAgo,
  weightStep: 2.5,
  scale: NEUTRAL_SCALE,
});

describe("Vorbelegung der Sätze", () => {
  const log = [
    einheit(3, [
      uebung("leg_press", [satz(100, 10, 2), satz(100, 10, 2)]),
      uebung("leg_extension", [satz(40, 12, 2), satz(40, 12, 2)]),
      uebung("chest_press_machine", [satz(50, 10, 2), satz(50, 10, 2)]),
      uebung("pec_deck", [satz(30, 12, 2), satz(30, 12, 2)]),
    ]),
  ];
  const session = plan(["leg_press", "leg_extension", "chest_press_machine", "pec_deck"]);

  it("gibt Aufwärmsätze nur der ersten Übung je Muskel", () => {
    const e = prefillEntries(session, optsMit(log));
    const aufwaerm = (id: string) => e[id].filter((s) => s.warmup).length;
    assert.deepEqual([aufwaerm("i1"), aufwaerm("i2"), aufwaerm("i3"), aufwaerm("i4")], [2, 0, 2, 0]);
  });

  it("legt immer die geplanten Arbeitssätze an", () => {
    const e = prefillEntries(session, optsMit(log));
    for (const it of session.items) assert.equal(e[it.id].filter((s) => !s.warmup).length, 3, it.exerciseId);
  });

  it("setzt die Aufwärmsätze auf 40 % und 65 % des Arbeitsgewichts", () => {
    const e = prefillEntries(session, optsMit(log));
    const w = e.i1.filter((s) => s.warmup).map((s) => Number(s.weight));
    const arbeit = Number(e.i1.find((s) => !s.warmup)!.weight);
    assert.deepEqual(w, [Math.round((arbeit * 0.4) / 2.5) * 2.5, Math.round((arbeit * 0.65) / 2.5) * 2.5]);
  });

  it("steigt nach 20 Tagen Pause mit gleichem Gewicht ein, nach 30 Tagen 10 % leichter", () => {
    const ruhig = prefillEntries(session, optsMit(log, 20));
    const leichter = prefillEntries(session, optsMit(log, 30));
    const arbeit = (e: typeof ruhig) => Number(e.i1.find((s) => !s.warmup)!.weight);
    assert.equal(arbeit(ruhig), 100);
    assert.equal(arbeit(leichter), 90);
  });

  it("läuft nach 7 Tagen Pause normal weiter (früher: ruhig einsteigen)", () => {
    const e = prefillEntries(session, optsMit(log, 7));
    // 100 kg × 10 bei RIR 2 in der Spanne 10–12: Gewicht halten, kein „leichter“.
    assert.equal(Number(e.i1.find((s) => !s.warmup)!.weight), 100);
  });

  it("gibt einer neu eingetauschten Übung Aufwärmsätze nur, wenn ihr Muskel noch kalt ist", () => {
    const vorher = prefillEntries(session, optsMit(log));
    // Beinstrecker → Hack-Squat (gleicher Muskel wie die Beinpresse davor).
    const getauscht: DailySession = {
      ...session,
      items: session.items.map((it) => (it.id === "i2" ? { ...it, exerciseId: "hack_squat" } : it)),
    };
    const e = reconcileEntries(vorher, session, getauscht, optsMit(log));
    assert.equal(e.i2.filter((s) => s.warmup).length, 0);
    assert.equal(e.i2.filter((s) => !s.warmup).length, 3);
  });
});

describe("Satzpause aus der Uhr", () => {
  const jetzt = 1_000_000_000_000;
  const pause: RestState = { itemId: "i1", setIdx: 2, endsAt: jetzt + 90_000, total: 90 };

  it("rechnet die Restzeit aus der Endzeit", () => {
    assert.equal(restLeft(pause.endsAt, jetzt), 90);
    assert.equal(restLeft(pause.endsAt, jetzt + 30_400), 60);
    assert.equal(restLeft(pause.endsAt, jetzt + 600_000), 0);
  });

  it("verlängert um 15 s", () => {
    const r = shiftRest(pause, 15, jetzt + 10_000);
    assert.equal(restLeft(r.endsAt, jetzt + 10_000), 95);
    assert.equal(r.total, 105);
  });

  it("startet eine abgelaufene Pause mit +15 s neu ab jetzt", () => {
    const spaet = jetzt + 300_000;
    const r = shiftRest(pause, 15, spaet);
    assert.equal(restLeft(r.endsAt, spaet), 15);
  });

  it("kürzt um 15 s, aber nie unter jetzt und nie unter 15 s Gesamtlänge", () => {
    const r = shiftRest(pause, -15, jetzt + 85_000);
    assert.equal(restLeft(r.endsAt, jetzt + 85_000), 0);
    assert.equal(r.total, 75);
    assert.equal(shiftRest({ ...pause, total: 20 }, -15, jetzt).total, 15);
  });
});

describe("Rekorde", () => {
  const log: LoggedSession[] = [
    einheit(20, [uebung("leg_press", [warm(40), satz(100, 10, 2), satz(100, 9, 1)])]),
    einheit(10, [uebung("leg_press", [satz(105, 10, 2)]), uebung("plank", [satz("", 45)])]),
    einheit(3, [uebung("leg_press", [satz(102.5, 8, 2)])]),
  ];

  it("findet den besten Satz und beschriftet ihn mit Komma", () => {
    const r = bestForExercise(log, "leg_press");
    assert.equal(r?.kind, "weight");
    assert.equal(r?.label, "105 × 10");
    assert.equal(r?.best, Math.round(105 * (1 + 10 / 30)));
    assert.equal(sessionBest("weight", [satz(22.5, 8), satz(22.5, 10)]).label, "22,5 × 10");
  });

  it("zählt Aufwärmsätze nie als Rekord", () => {
    const nurWarm = [einheit(1, [uebung("leg_press", [warm(200, 5)])])];
    assert.equal(bestForExercise(nurWarm, "leg_press"), null);
  });

  it("rechnet je Verlauf nur einmal (gleiches Ergebnis-Objekt)", () => {
    assert.equal(exerciseRecords(log), exerciseRecords(log));
    assert.equal(recordsById(log), recordsById(log));
    assert.equal(prTimeline(log), prTimeline(log));
  });

  it("rechnet für einen neuen Verlauf neu", () => {
    const mehr = [...log, einheit(0, [uebung("leg_press", [satz(110, 10, 2)])])];
    assert.notEqual(exerciseRecords(mehr), exerciseRecords(log));
    assert.equal(bestForExercise(mehr, "leg_press")?.label, "110 × 10");
    assert.equal(bestForExercise(log, "leg_press")?.label, "105 × 10");
  });

  it("meldet jeden neuen Bestwert einmal im PR-Verlauf", () => {
    const prs = prTimeline(log).filter((e) => e.exId === "leg_press");
    assert.equal(prs.length, 1);
    assert.equal(prs[0].label, "105 × 10");
  });
});

describe("Belastung und Ausdauer", () => {
  const kraft = [28, 21, 14, 7, 3].map((t) => einheit(t, [uebung("leg_press", [satz(100, 10, 2), satz(100, 10, 2)])]));

  it("stuft einen Ausdauer-Eintrag ohne Dauer nicht als „hoch“ ein", () => {
    const kaputt = { id: "c1", date: new Date(Date.now() - 86_400_000).toISOString(), source: "strava" } as unknown as CardioSession;
    const ohne = fatigueState(kraft, []);
    const mit = fatigueState(kraft, [kaputt]);
    assert.equal(mit.band, ohne.band);
    assert.ok(Number.isFinite(mit.ratio));
  });

  it("gibt beim Laden jeder Ausdauer-Einheit eine endliche Dauer", () => {
    const roh = [
      { id: "a", date: "2026-11-01T10:00:00.000Z", durationSec: 1800 },
      { id: "b", date: "2026-11-02T10:00:00.000Z" },
      { id: "c", date: "2026-11-03T10:00:00.000Z", durationSec: "abc" },
      { date: "2026-11-04T10:00:00.000Z", durationSec: 60 },
    ];
    assert.deepEqual(sanitizeCardio(roh).map((c) => [c.id, c.durationSec]), [["a", 1800], ["b", 0], ["c", 0]]);
  });

  it("schreibt das Tempo nie als „5:60“", () => {
    // 5:59,6 je Kilometer.
    assert.equal(paceLabel(1000, 359.6), "6:00 /km");
    assert.equal(paceLabel(5000, 1650), "5:30 /km");
  });
});
