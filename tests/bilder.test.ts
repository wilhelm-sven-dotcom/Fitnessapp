/**
 * Mitgelieferte Bilder (public/geraete, public/bewegung, public/momente):
 * jede eingetragene Kennung hat ihre Dateien, und jede Datei gehört zu einer
 * Übung, einer Aufwärmübung oder einem Gerät der App. Sonst zeigte die App
 * ein leeres Feld, oder ein Bild läge ungenutzt im Offline-Speicher.
 */
import assert from "node:assert/strict";
import { existsSync, readdirSync } from "node:fs";
import { describe, test } from "node:test";
import { BEWEGUNGEN, bewegungUrl, hatBewegung } from "@/lib/bewegung";
import { LIB, MASCHINEN_KEYS } from "@/lib/exercises";
import { geraetBildUrl } from "@/lib/geraete";
import { momentUrl, type Moment } from "@/lib/momente";
import { WARMUP_CATALOG } from "@/lib/warmup";

/** `/ordner/datei.webp?v=1` → Pfad in `public/`. */
const datei = (url: string) => `public${url.split("?")[0]}`;

describe("Bewegungsbilder", () => {
  const uebungen = new Set(LIB.map((e) => e.id));
  const drills = new Set(WARMUP_CATALOG.map((d) => d.id));

  test("jede eingetragene Bewegung hat beide Dateien", () => {
    assert.ok(BEWEGUNGEN.length >= 20, `${BEWEGUNGEN.length} Bewegungen`);
    for (const id of BEWEGUNGEN) {
      for (const klein of [false, true]) {
        const url = bewegungUrl(id, klein);
        assert.ok(url && existsSync(datei(url)), `${id}${klein ? " (klein)" : ""}: Datei fehlt`);
      }
    }
  });

  test("jede Bewegung gehört zu einer Übung oder Aufwärmübung der App", () => {
    for (const id of BEWEGUNGEN) assert.ok(uebungen.has(id) || drills.has(id), `${id} gibt es nicht`);
  });

  test("keine Datei ohne Eintrag", () => {
    const ids = readdirSync("public/bewegung")
      .filter((f) => f.endsWith(".webp"))
      .map((f) => f.replace(/(-klein)?\.webp$/, ""));
    for (const id of ids) assert.ok(hatBewegung(id), `public/bewegung/${id}: nicht eingetragen`);
  });

  test("ohne Bild gibt es keine Adresse", () => {
    assert.equal(bewegungUrl("gibt_es_nicht"), null);
    assert.equal(bewegungUrl(undefined), null);
    assert.equal(hatBewegung(""), false);
  });
});

describe("Gerätebilder", () => {
  test("alle elf Studiogeräte haben beide Dateien", () => {
    for (const key of [...MASCHINEN_KEYS, "cable"] as const) {
      for (const klein of [false, true]) {
        const url = geraetBildUrl(key as Parameters<typeof geraetBildUrl>[0], klein);
        assert.ok(url && existsSync(datei(url)), `${key}${klein ? " (klein)" : ""}: Bild fehlt`);
      }
    }
  });
});

describe("Momente", () => {
  const ALLE: Moment[] = [
    "begruessung",
    "ort-zuhause",
    "ort-studio",
    "rekord",
    "gespeichert",
    "verlauf-leer",
    "uebersicht-leer",
    "koerper-leer",
    "nichts-gefunden",
    "atlas-aus",
  ];
  test("jeder Moment hat seine Datei, Querformate auch die kleine", () => {
    for (const m of ALLE) {
      assert.ok(existsSync(datei(momentUrl(m))), `${m}: Datei fehlt`);
      assert.ok(existsSync(datei(momentUrl(m, true))), `${m} (klein): Datei fehlt`);
    }
  });
});
