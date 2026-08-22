import { bestForExercise } from "@/lib/records";
import { isFilled, oneRm, workSets } from "@/lib/stats";
import { figurFor, PATTERN_FIGUR, type PhasenFigurDef } from "@/lib/phasen/figuren";
import { muscleOf } from "@/lib/volume";
import type { DailySession, PlannedExercise } from "@/lib/session-model";
import type { Exercise, LoggedSession, Muscle, Pattern, SetEntry } from "@/lib/types";

/**
 * Das Phasenband — die Signatur von „Platte 311": jede Einheit als Filmstreifen,
 * jeder ARBEITSSATZ ein Kader. Kaderbreite ∝ Wiederholungen, Füllhöhe =
 * Leistung relativ zum All-Time-Rekord der Übung (bewusste Vereinfachung:
 * der Rekord ist der aus dem GESAMTEN Log — im Verlauf füllt der PR-Satz
 * exakt bis zur Oberkante), Status = offen · aktiv · belichtet.
 *
 * Zweite Ebene (README-Token-Tabelle): die IWF-Scheibenfarben codieren die
 * bewegte Masse — Langhantel nach größter Scheibe pro Seite ((kg−20)/2:
 * ≥25 rot · ≥20 blau · ≥15 gelb · ≥10 grün), sonst direkt nach Satzlast;
 * unbeladen/unbekannt → null (Basislinie fällt auf Tinte zurück).
 * Pur & deterministisch — kein Zugriff auf Datum/Zufall.
 */

export type KaderStatus = "offen" | "aktiv" | "belichtet";
export type IwfFarbe = "rot" | "blau" | "gelb" | "gruen";

export interface Kader {
  key: string;
  /** Breite (flex-grow) ∝ Ziel-/Ist-Wiederholungen, clamp 3..15 (Sek: /5). */
  widthReps: number;
  /** Füllhöhe 0..1 — nur belichtete/aktive Kader; Anzeige-Floor 0,12. */
  fillRatio: number;
  status: KaderStatus;
  iwf: IwfFarbe | null;
}

export interface KaderGruppe {
  itemId: string;
  exerciseId: string;
  label: string;
  figur: PhasenFigurDef;
  /** Regionsfarbe (CSS-Var) — Tönung der offenen Kader + Farbtupfer im Label. */
  tintVar: string;
  kader: Kader[];
}

const FILL_OHNE_REKORD = 0.62;
const FILL_FLOOR = 0.12;

/* ── Region + Intensität: die Skyline des alten Etappen-Profils, zurück im
 *    Filmstreifen. Nach dem Re-Theme standen alle geplanten Kader als
 *    identische leere Raster da („fillRatio: 0, iwf: null“ als Literale) —
 *    Farbe, Höhenkontur und Legende des Vorgängers waren ersatzlos weg, und
 *    die Übersicht las sich tot. Mapping-Herkunft: b57c742:lib/etappen.ts,
 *    Farben auf die Platte-311-Tafel gelegt (die alten Tokens --orange und
 *    --gruen sind heute Aliasse DERSELBEN Cyanotypie — die alte Tabelle
 *    würde Druck und Zug gleich färben). Rumpf bewusst Tinte statt Gelb/
 *    Messing: Gelb↔Grün fällt beim Protan-Check durch, und Messing ist die
 *    Rekordfarbe. */

export type Region = "unterkoerper" | "push" | "pull" | "core" | "cardio";

export const REGION_VAR: Record<Region, string> = {
  unterkoerper: "var(--accent)",
  push: "var(--cyanotypie)",
  pull: "var(--messing)",
  core: "var(--fg)",
  cardio: "var(--muted)",
};

const MUSCLE_REGION: Record<Muscle, Region> = {
  quads: "unterkoerper",
  hamstrings: "unterkoerper",
  glutes: "unterkoerper",
  calves: "unterkoerper",
  chest: "push",
  shoulders: "push",
  triceps: "push",
  back: "pull",
  biceps: "pull",
  forearms: "pull",
  core: "core",
};

/** Körperregion einer Übung — Cardio vor muscleOf (das mappt cardio→core). */
export function regionOf(ex: Exercise): Region {
  if (ex.pattern === "cardio") return "cardio";
  return MUSCLE_REGION[muscleOf(ex).primary];
}

/** Tönungshöhe eines GEPLANTEN Kaders = strukturelle Intensitätsklasse des
 *  Musters — bewusst keine In-Session-Normalisierung (eine Mini-Einheit soll
 *  nicht aussehen wie eine große) und keine Gewichts-Abhängigkeit. */
const INTENSITAET: Record<Pattern, number> = {
  squat: 1,
  hinge: 1,
  lunge: 0.9,
  hpush: 0.8,
  vpush: 0.8,
  hpull: 0.8,
  vpull: 0.8,
  arm: 0.55,
  lateral: 0.55,
  calf: 0.55,
  core: 0.4,
  cardio: 0.25,
};

const UNKNOWN_H = 0.6;

function widthOf(ex: Exercise | undefined, reps: number): number {
  if (!ex || ex.pattern === "cardio") return 8;
  const r = ex.unit === "Sek" ? reps / 5 : reps;
  return Math.min(15, Math.max(3, Math.round(r || 8)));
}

/** IWF-Scheibenfarbe der bewegten Masse (siehe Kopfkommentar). */
export function iwfFor(ex: Exercise | undefined, kg: number | null): IwfFarbe | null {
  if (!ex || !ex.weighted || kg == null || kg <= 0) return null;
  const proSeite = ex.req.includes("bar") ? Math.max(0, (kg - 20) / 2) : kg;
  if (proSeite >= 25) return "rot";
  if (proSeite >= 20) return "blau";
  if (proSeite >= 15) return "gelb";
  if (proSeite >= 10) return "gruen";
  return null;
}

function fillFor(
  ex: Exercise,
  set: SetEntry,
  best: ReturnType<typeof bestForExercise>,
): number {
  const w = Number(set.weight) || 0;
  const r = Number(set.reps) || 0;
  let ratio = FILL_OHNE_REKORD;
  if (best && best.best > 0) {
    if (best.kind === "weight" && ex.weighted && w > 0) ratio = oneRm(w, r) / best.best;
    else if (best.kind !== "weight") ratio = r / best.best;
  }
  return Math.min(1, Math.max(FILL_FLOOR, ratio));
}

const FALLBACK_FIGUR = PATTERN_FIGUR.squat;

function gruppe(
  itemId: string,
  exerciseId: string,
  ex: Exercise | undefined,
  kader: Kader[],
): KaderGruppe {
  return {
    itemId,
    exerciseId,
    label: ex?.name ?? "Übung",
    figur: ex ? figurFor(ex) : FALLBACK_FIGUR,
    tintVar: ex ? REGION_VAR[regionOf(ex)] : "var(--muted)",
    kader,
  };
}

/** Geplante Einheit (Heute): alle Kader offen — Raster + Regions-Tönung
 *  (Höhe = Intensitätsklasse) + Basislinie in der IWF-Farbe des GEPLANTEN
 *  Gewichts (`kgByItem` — die Karte rechnet die Vorschläge ohnehin für die
 *  Übungsliste; ohne Gewicht fällt der Renderer auf die Regionsfarbe). */
export function bandOfPlanned(
  items: PlannedExercise[],
  byId: Map<string, Exercise>,
  kgByItem?: Map<string, number>,
): KaderGruppe[] {
  return items.map((it) => {
    const ex = byId.get(it.exerciseId);
    const n = ex?.pattern === "cardio" ? 1 : Math.max(1, it.sets);
    const reps = it.repHigh || it.repLow || ex?.repHigh || 10;
    const w = widthOf(ex, reps);
    const fill = ex ? (INTENSITAET[ex.pattern] ?? UNKNOWN_H) : UNKNOWN_H;
    const iwf = iwfFor(ex, kgByItem?.get(it.id) ?? null);
    return gruppe(
      it.id,
      it.exerciseId,
      ex,
      Array.from({ length: n }, (_, i) => ({
        key: `${it.id}:${i}`,
        widthReps: w,
        fillRatio: fill,
        status: "offen" as const,
        iwf,
      })),
    );
  });
}

/** Laufende Einheit: belichtet = protokollierter Arbeitssatz, der ERSTE
 *  offene Satz der Einheit ist der aktive Kader. */
export function bandOfActive(
  session: DailySession,
  entries: Record<string, SetEntry[]>,
  byId: Map<string, Exercise>,
  log: LoggedSession[],
): KaderGruppe[] {
  let aktivGesetzt = false;
  return session.items.map((it) => {
    const ex = byId.get(it.exerciseId);
    const best = ex ? bestForExercise(log, ex.id) : null;
    const sets = ex?.pattern === "cardio" ? (entries[it.id] ?? []).slice(0, 1) : workSets(entries[it.id] ?? []);
    const kader = sets.map((s, i): Kader => {
      const belichtet = isFilled(s);
      let status: KaderStatus = belichtet ? "belichtet" : "offen";
      if (!belichtet && !aktivGesetzt) {
        status = "aktiv";
        aktivGesetzt = true;
      }
      const kg = Number(s.weight) || null;
      return {
        key: `${it.id}:${i}`,
        widthReps: widthOf(ex, Number(s.reps) || it.repHigh || it.repLow || 10),
        fillRatio: belichtet && ex ? fillFor(ex, s, best) : 0,
        status,
        iwf: iwfFor(ex, kg),
      };
    });
    return gruppe(it.id, it.exerciseId, ex, kader);
  });
}

/** Gespeicherte Einheit (Verlauf): alles belichtet, Füllung gegen den
 *  All-Time-Rekord aus dem GESAMTEN Log (der PR-Satz füllt voll). */
export function bandOfLogged(
  s: LoggedSession,
  byId: Map<string, Exercise>,
  log: LoggedSession[],
): KaderGruppe[] {
  return (s.exercises ?? []).map((e, idx) => {
    const ex = byId.get(e.id);
    const best = ex ? bestForExercise(log, ex.id) : null;
    const sets =
      ex?.pattern === "cardio"
        ? (e.sets ?? []).slice(0, 1)
        : workSets(e.sets ?? []).filter(isFilled);
    const kader = sets.map((set, i): Kader => ({
      key: `${e.id}-${idx}:${i}`,
      widthReps: widthOf(ex, Number(set.reps) || 10),
      fillRatio: ex ? fillFor(ex, set, best) : FILL_OHNE_REKORD,
      status: "belichtet" as const,
      iwf: iwfFor(ex, Number(set.weight) || null),
    }));
    return gruppe(`${e.id}-${idx}`, e.id, ex, kader);
  });
}
