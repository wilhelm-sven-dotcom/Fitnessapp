import { bestForExercise } from "@/lib/records";
import { isFilled, oneRm, workSets } from "@/lib/stats";
import { figurFor, PATTERN_FIGUR, type PhasenFigurDef } from "@/lib/phasen/figuren";
import type { DailySession, PlannedExercise } from "@/lib/session-model";
import type { Exercise, LoggedSession, SetEntry } from "@/lib/types";

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
  kader: Kader[];
}

const FILL_OHNE_REKORD = 0.62;
const FILL_FLOOR = 0.12;

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
    kader,
  };
}

/** Geplante Einheit (Heute): alle Kader offen — leeres Raster + Basislinie. */
export function bandOfPlanned(
  items: PlannedExercise[],
  byId: Map<string, Exercise>,
): KaderGruppe[] {
  return items.map((it) => {
    const ex = byId.get(it.exerciseId);
    const n = ex?.pattern === "cardio" ? 1 : Math.max(1, it.sets);
    const reps = it.repHigh || it.repLow || ex?.repHigh || 10;
    const w = widthOf(ex, reps);
    return gruppe(
      it.id,
      it.exerciseId,
      ex,
      Array.from({ length: n }, (_, i) => ({
        key: `${it.id}:${i}`,
        widthReps: w,
        fillRatio: 0,
        status: "offen" as const,
        iwf: null,
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
