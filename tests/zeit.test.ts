/**
 * Wochenanfang, Wochenziel und Entlastungswoche stehen je an EINER Stelle
 * (lib/zeit.ts, lib/training-science.ts, lib/periodization.ts). Diese Tests
 * halten fest, was alle Bildschirme darunter verstehen.
 */
import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { startScale, withDeload } from "@/lib/active-session";
import { homeChips } from "@/lib/coaching";
import { ENTLASTUNG_LAST, ENTLASTUNG_TAGE, deloadAktiv } from "@/lib/periodization";
import { NEUTRAL_SCALE } from "@/lib/readiness";
import { weeklySetCount } from "@/lib/set-plan";
import { weeklyStreak } from "@/lib/stats";
import { WOCHENZIEL } from "@/lib/training-science";
import type { AppSettings, LoggedSession } from "@/lib/types";
import { weeklyVolume } from "@/lib/volume";
import { TAG_MS, WOCHE_MS, weekStartMon } from "@/lib/zeit";
import { satz, uebung } from "./helfer";

/** Ortszeit, damit die Tests in jeder Zeitzone dasselbe prüfen. */
const am = (jahr: number, monat: number, tag: number, stunde = 12, minute = 0) =>
  new Date(jahr, monat - 1, tag, stunde, minute);

const einheitAm = (d: Date): LoggedSession => ({
  date: d.toISOString(),
  dayKey: "today",
  dayName: "Ganzkörper",
  focus: "",
  exercises: [uebung("goblet", [satz(20, 10, 2), satz(20, 10, 2)])],
});

const SETTINGS: AppSettings = { timeBudgetMin: 45, autoregOn: true };

describe("Wochenanfang", () => {
  test("ist der Montag um 0 Uhr, für jeden Tag der Woche", () => {
    // 9. bis 15. November 2026 ist eine Woche von Montag bis Sonntag.
    const montag = am(2026, 11, 9, 0, 0);
    for (let tag = 9; tag <= 15; tag++) {
      assert.equal(weekStartMon(am(2026, 11, tag, 18, 30)).getTime(), montag.getTime(), `Tag ${tag}`);
    }
  });

  test("Sonntag gehört zur laufenden Woche, der Montag danach zur nächsten", () => {
    assert.equal(weekStartMon(am(2026, 11, 15, 23, 59)).getDate(), 9);
    assert.equal(weekStartMon(am(2026, 11, 16, 0, 0)).getDate(), 16);
  });

  test("rechnet über Monats- und Jahresgrenzen", () => {
    // Donnerstag, 1. Januar 2026 → Montag, 29. Dezember 2025.
    const m = weekStartMon(am(2026, 1, 1));
    assert.deepEqual([m.getFullYear(), m.getMonth() + 1, m.getDate()], [2025, 12, 29]);
  });

  test("gibt ein neues Datum zurück und lässt das übergebene unberührt", () => {
    const d = am(2026, 11, 11, 15);
    const vorher = d.getTime();
    const m = weekStartMon(d);
    m.setDate(m.getDate() - 7);
    assert.equal(d.getTime(), vorher);
    assert.notEqual(weekStartMon(d).getTime(), m.getTime());
  });

  test("ein Tag und eine Woche in Millisekunden", () => {
    assert.equal(TAG_MS, 24 * 60 * 60 * 1000);
    assert.equal(WOCHE_MS, 7 * TAG_MS);
  });
});

describe("Dieselbe Woche auf allen Bildschirmen", () => {
  // Mittwoch, 11. November 2026. Eine Einheit am Sonntag davor (8.) gehört zur
  // Vorwoche, eine am Montag (9.) zur laufenden.
  const heute = am(2026, 11, 11, 20);
  const log = [einheitAm(am(2026, 11, 8, 23)), einheitAm(am(2026, 11, 9, 6)), einheitAm(am(2026, 11, 11, 7))];

  test("Sätze und bewegtes Gewicht zählen ab Montag", () => {
    assert.equal(weeklySetCount(log, heute), 4); // zwei Einheiten zu je zwei Sätzen
    assert.equal(weeklyVolume(log, heute), 2 * 2 * 20 * 10);
  });
});

describe("Wochenziel", () => {
  const heute = am(2026, 11, 13, 20); // Freitag
  const woche = (montag: Date, anzahl: number) =>
    Array.from({ length: anzahl }, (_, i) => einheitAm(new Date(montag.getTime() + i * TAG_MS + 8 * 3_600_000)));

  test("sind drei Einheiten je Woche", () => {
    assert.equal(WOCHENZIEL, 3);
  });

  test("die Serie zählt Wochen, die das Ziel erreichen", () => {
    const diese = weekStartMon(heute);
    const letzte = new Date(diese.getTime() - WOCHE_MS);
    const vorletzte = new Date(diese.getTime() - 2 * WOCHE_MS);
    // Laufende Woche erst zwei Einheiten: sie bricht die Serie nicht, zählt aber noch nicht.
    const log = [...woche(vorletzte, WOCHENZIEL), ...woche(letzte, WOCHENZIEL), ...woche(diese, WOCHENZIEL - 1)];
    assert.equal(weeklyStreak(log, heute), 2);
    // Mit der dritten Einheit zählt auch die laufende Woche.
    assert.equal(weeklyStreak([...log, einheitAm(am(2026, 11, 13, 9))], heute), 3);
    // Eine Woche mit nur zwei Einheiten beendet die Serie.
    assert.equal(weeklyStreak([...woche(vorletzte, WOCHENZIEL - 1), ...woche(diese, WOCHENZIEL)], heute), 1);
  });

  test("der Hinweis „Starke Woche“ erscheint ab dem Wochenziel", () => {
    const text = (weekCount: number) => homeChips({ daysAgo: 1, weekCount }).map((c) => c.text).join(" ");
    assert.ok(!text(WOCHENZIEL - 1).includes("Starke Woche"));
    assert.ok(text(WOCHENZIEL).includes("Starke Woche"));
  });
});

describe("Entlastungswoche", () => {
  const jetzt = am(2026, 11, 11, 12);
  const vor = (tage: number) => new Date(jetzt.getTime() - tage * TAG_MS).toISOString();

  test("läuft sieben Tage ab der Bestätigung", () => {
    assert.equal(ENTLASTUNG_TAGE, 7);
    assert.equal(deloadAktiv({}, jetzt), false);
    assert.equal(deloadAktiv({ lastDeloadDate: vor(0) }, jetzt), true);
    assert.equal(deloadAktiv({ lastDeloadDate: vor(6.9) }, jetzt), true);
    assert.equal(deloadAktiv({ lastDeloadDate: vor(7) }, jetzt), false);
    assert.equal(deloadAktiv({ lastDeloadDate: vor(30) }, jetzt), false);
  });

  test("nimmt einen Satz weg und begrenzt die Last auf 60 %", () => {
    assert.equal(ENTLASTUNG_LAST, 0.6);
    assert.deepEqual(withDeload(NEUTRAL_SCALE, true), { setDelta: -1, loadMult: 0.6, cap: true });
    // Eine schon niedrigere Last (schlechte Tagesform) bleibt niedriger.
    assert.equal(withDeload({ setDelta: 0, loadMult: 0.5, cap: false }, true).loadMult, 0.5);
    // Ohne Entlastung bleibt die Tagesform, wie sie ist.
    assert.equal(withDeload(NEUTRAL_SCALE, false), NEUTRAL_SCALE);
  });

  test("gilt auch beim Start einer Einheit", () => {
    const start = startScale({ ...SETTINGS, lastDeloadDate: new Date().toISOString() }, null);
    assert.equal(start.loadMult, ENTLASTUNG_LAST);
    assert.equal(start.setDelta, -1);
    assert.deepEqual(startScale(SETTINGS, null), NEUTRAL_SCALE);
  });
});
