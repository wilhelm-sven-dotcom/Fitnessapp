import { isFilled, workSets } from "@/lib/stats";
import { muscleOf } from "@/lib/volume";
import type { DailySession, PlannedExercise, SessionVariant } from "@/lib/session-model";
import type { Exercise, LoggedSession, Muscle, Pattern, SetEntry } from "@/lib/types";

/**
 * Das Etappen-Profil — die Signatur der App (Komoot-Prinzip: deine Daten
 * werden zum Bild). Jede Einheit wird zur Skyline aus flachen Farbblöcken:
 * x = Übungen in Reihenfolge (Breite = Arbeitssätze), Höhe = strukturelle
 * Intensitätsklasse des Musters, Farbe = Körperregion. Pur & deterministisch.
 *
 * Farbcode (Tokens, validiert mit dem dataviz-Palette-Validator): Beine =
 * Blau (--accent), Druck = Orange, Zug = Grün, Rumpf = TINTE (--fg — bewusst
 * NICHT Gelb: Gelb↔Grün fällt beim Protan-Check durch, und Gelb ist im
 * Design die Warnfarbe), Cardio/unbekannt = neutral (--muted). Identität ist
 * nie farb-allein: Legende mit Text, feste Höhenklassen je Region, 2-px-
 * Lücken — und die Übungsliste steht direkt daneben.
 */

export type Region = "unterkoerper" | "push" | "pull" | "core" | "cardio";

export interface EtappenBlock {
  /** Item-Instanz-Id (geplant/live) bzw. `${exId}-${idx}` (Log). */
  key: string;
  /** null = unbekannte Übung (z. B. gelöschte eigene) — neutral gefärbt. */
  region: Region | null;
  /** 0..1 — quantisierte Intensitätsklasse des Musters. */
  h: number;
  /** Relative Breite = Zahl der Arbeitssätze (≥ 1). */
  w: number;
  /** 0..1 erledigte Arbeitssätze — nur live relevant, sonst 1. */
  done: number;
}

export const REGION_VAR: Record<Region, string> = {
  unterkoerper: "var(--accent)",
  push: "var(--orange)",
  pull: "var(--gruen)",
  core: "var(--fg)",
  cardio: "var(--muted)",
};

export const REGION_LABEL: Record<Region, string> = {
  unterkoerper: "Beine",
  push: "Druck",
  pull: "Zug",
  core: "Rumpf",
  cardio: "Cardio",
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

/**
 * Höhe = strukturelle Intensitätsklasse des Musters — bewusst KEINE
 * In-Session-Normalisierung (sonst sähe eine Mini-Einheit aus wie eine
 * große; so bleibt die Skyline über Einheiten hinweg vergleichbar) und
 * keine Gewichts-Abhängigkeit (funktioniert für geplant/live/Log gleich).
 */
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

function block(
  key: string,
  ex: Exercise | undefined,
  w: number,
  done: number,
): EtappenBlock {
  if (!ex) return { key, region: null, h: UNKNOWN_H, w: Math.max(1, w), done };
  return {
    key,
    region: regionOf(ex),
    h: INTENSITAET[ex.pattern] ?? UNKNOWN_H,
    w: Math.max(1, w),
    done,
  };
}

/** Geplante Einheit (Heute-Karte): Breite = geplante Sätze, alles „voll". */
export function profileOfPlanned(
  items: PlannedExercise[],
  byId: Map<string, Exercise>,
): EtappenBlock[] {
  return items.map((it) => {
    const ex = byId.get(it.exerciseId);
    return block(it.id, ex, ex?.pattern === "cardio" ? 1 : it.sets, 1);
  });
}

/** Laufende Einheit: Breite aus den echten Arbeitssätzen (deckt die
 *  Prüfungs-Rampe ab), `done` füllt sich Satz für Satz. */
export function profileOfActive(
  session: DailySession,
  entries: Record<string, SetEntry[]>,
  byId: Map<string, Exercise>,
): EtappenBlock[] {
  return session.items.map((it) => {
    const ex = byId.get(it.exerciseId);
    const sets = entries[it.id] ?? [];
    if (ex?.pattern === "cardio") {
      const done = sets[0] && isFilled(sets[0]) ? 1 : 0;
      return block(it.id, ex, 1, done);
    }
    const work = workSets(sets);
    const w = work.length || it.sets;
    const done = work.length ? work.filter(isFilled).length / work.length : 0;
    return block(it.id, ex, w, done);
  });
}

/** Gespeicherte Einheit (Verlauf): der Fingerabdruck dessen, was wirklich war. */
export function profileOfLogged(
  s: LoggedSession,
  byId: Map<string, Exercise>,
): EtappenBlock[] {
  return (s.exercises ?? []).map((e, idx) => {
    const ex = byId.get(e.id);
    const w = ex?.pattern === "cardio" ? 1 : workSets(e.sets ?? []).filter(isFilled).length;
    return block(`${e.id}-${idx}`, ex, w, 1);
  });
}

/* ── Piktogramm-Pose der Einheit (Heute-Hero, Sieger-Moment) ── */

export type PictogramPose = "ganzkoerper" | "unterkoerper" | "push" | "pull" | "core";

/** Dominante Region (satzgewichtet, ≥ 50 %) → deren Pose; sonst Ganzkörper.
 *  Reset-Einheiten sind per Definition Rumpf-Arbeit. */
export function poseForSession(
  items: PlannedExercise[],
  byId: Map<string, Exercise>,
  variant?: SessionVariant,
): PictogramPose {
  if (variant === "reset") return "core";
  const weights = new Map<Region, number>();
  let total = 0;
  for (const it of items) {
    const ex = byId.get(it.exerciseId);
    if (!ex || ex.pattern === "cardio") continue;
    const r = regionOf(ex);
    weights.set(r, (weights.get(r) ?? 0) + it.sets);
    total += it.sets;
  }
  if (!total) return "ganzkoerper";
  for (const [r, w] of weights) {
    if (w / total >= 0.5 && r !== "cardio")
      return r === "unterkoerper" || r === "push" || r === "pull" || r === "core"
        ? r
        : "ganzkoerper";
  }
  return "ganzkoerper";
}
