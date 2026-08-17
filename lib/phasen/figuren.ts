import type { Exercise, Pattern } from "@/lib/types";

/**
 * Phasenfiguren „Platte 311" — Muybridge-Piktogramme nach den 10 Regeln des
 * Design-Handoffs: 48er-Raster, Glieder Stroke 5 (round), Torso als Kapsel
 * Stroke 9, Kopf gefüllter Kreis Ø 7 mit Luftspalt, Hantel Stroke 2 mit
 * Scheiben r 2,5, Winkel grob auf 15°-Stufen, GENAU EINE Farbe je Figur
 * (currentColor — der Renderer setzt sie), nie Gesicht/Finger/Perspektive.
 * Jede Übung existiert als 3 Phasen (exzentrisch: Start → Mitte → Endphase);
 * erledigte Kader frieren die ENDPHASE ein (Regel 9).
 *
 * Die Kniebeuge ist die Referenzgeometrie aus dem Handoff (Heute.dc,
 * fig-p1/p2/p3 — Koordinaten 1:1 übernommen); die Hebe-Silhouette FIGUR_LIFT
 * ist das App-Icon (Onboarding.dc, ob-lift). Alle weiteren Muster folgen
 * derselben Anatomie: Torso-Länge ~14, Kopfradius 3,5, Fußstrich ~5,
 * Boden bei y=44 (Figuren ohne Bodenkontakt — Hang, Hollow — schweben).
 */

export type Punkt = readonly [number, number];

export type PhasenPrimitive =
  /** Torso + Becken: EINE Kapsel, Stroke 9, round caps. */
  | { t: "torso"; a: Punkt; b: Punkt }
  /** Glied (Arm/Bein inkl. Fußstrich): Polyline, Stroke 5, round. */
  | { t: "limb"; pts: readonly Punkt[] }
  /** Kopf: gefüllter Kreis r 3,5. */
  | { t: "head"; c: Punkt }
  /** Hantel: Linie Stroke 2 + gefüllte Scheiben r 2,5 an den Enden. */
  | { t: "bar"; a: Punkt; b: Punkt }
  /** Gerät ohne Scheiben (Klimmzugstange, Bank): Linie, Stroke w (Def. 2). */
  | { t: "strich"; a: Punkt; b: Punkt; w?: number }
  /** Einzelne Scheibe/Kurzhantel frontal: gefüllter Kreis r 2,5. */
  | { t: "scheibe"; c: Punkt; r?: number };

export interface PhasenFigurDef {
  id: string;
  /** viewBox — Standard "0 0 48 48"; die Hebe-Silhouette braucht 48×50. */
  vb?: string;
  /** 3 Phasen, exzentrisch geordnet; Endphase = eingefrorener Kader. */
  phases: readonly (readonly PhasenPrimitive[])[];
}

const torso = (a: Punkt, b: Punkt): PhasenPrimitive => ({ t: "torso", a, b });
const limb = (...pts: Punkt[]): PhasenPrimitive => ({ t: "limb", pts });
const head = (c: Punkt): PhasenPrimitive => ({ t: "head", c });
const bar = (a: Punkt, b: Punkt): PhasenPrimitive => ({ t: "bar", a, b });
const strich = (a: Punkt, b: Punkt, w?: number): PhasenPrimitive => ({ t: "strich", a, b, w });
const scheibe = (c: Punkt): PhasenPrimitive => ({ t: "scheibe", c });

/* ── Referenz: Kniebeuge (Handoff Heute.dc, fig-p1/p2/p3 — 1:1) ─────────── */

const KNIEBEUGE: PhasenFigurDef = {
  id: "squat",
  phases: [
    [
      torso([24, 16], [24, 30]),
      head([24, 7]),
      limb([24, 30], [25, 37], [24, 44], [29, 44]),
      limb([24, 16], [29, 18], [30, 13]),
      bar([12, 13], [36, 13]),
    ],
    [
      torso([25, 19], [20, 34]),
      head([28, 10]),
      limb([20, 34], [28, 38], [24, 44], [29, 44]),
      limb([25, 19], [30, 22], [31, 16]),
      bar([13, 16], [37, 16]),
    ],
    [
      torso([26, 24], [18, 38]),
      head([30, 16]),
      limb([18, 38], [28, 38], [24, 44], [29, 44]),
      limb([26, 24], [31, 27], [32, 21]),
      bar([14, 21], [38, 21]),
    ],
  ],
};

/* ── App-Icon-Silhouette: Hantel über Kopf (Onboarding.dc, ob-lift) ─────── */

export const FIGUR_LIFT: PhasenFigurDef = {
  id: "lift",
  vb: "0 0 48 50",
  phases: [
    [
      head([24, 7]),
      torso([24, 17], [24, 31]),
      limb([24, 17], [18, 10], [17, 4]),
      limb([24, 17], [30, 10], [31, 4]),
      bar([8, 3], [40, 3]),
      limb([24, 31], [20, 38], [20, 44]),
      limb([24, 31], [28, 38], [28, 44]),
    ],
  ],
};

/* ── Muster-Figuren (Seitenansicht, wenn nicht anders vermerkt) ─────────── */

/** Kreuzheben: aufrecht → Hüftkippe → tiefe Beuge, Hantel vorm Körper. */
const HINGE: PhasenFigurDef = {
  id: "hinge",
  phases: [
    [
      torso([24, 16], [24, 30]),
      head([24, 7]),
      limb([24, 30], [25, 37], [24, 44], [29, 44]),
      limb([24, 16], [25, 24], [25, 31]),
      bar([13, 32], [37, 32]),
    ],
    [
      torso([28, 20], [22, 32]),
      head([31, 12]),
      limb([22, 32], [24, 38], [22, 44], [27, 44]),
      limb([28, 20], [28, 28], [28, 34]),
      bar([16, 35], [40, 35]),
    ],
    [
      torso([30, 26], [20, 36]),
      head([34, 19]),
      limb([20, 36], [25, 39], [22, 44], [27, 44]),
      limb([30, 26], [30, 33], [30, 39]),
      bar([18, 40], [42, 40]),
    ],
  ],
};

/** Ausfallschritt: Stand → Schritt → tiefer Ausfall (Torso bleibt lotrecht). */
const LUNGE: PhasenFigurDef = {
  id: "lunge",
  phases: [
    [
      torso([24, 16], [24, 30]),
      head([24, 7]),
      limb([24, 30], [25, 37], [24, 44], [29, 44]),
      limb([24, 16], [25, 23], [25, 30]),
    ],
    [
      torso([24, 17], [24, 31]),
      head([24, 8]),
      limb([24, 31], [30, 36], [30, 44], [35, 44]),
      limb([24, 31], [18, 37], [16, 44]),
      limb([24, 17], [25, 24], [25, 31]),
    ],
    [
      torso([24, 19], [24, 33]),
      head([24, 10]),
      limb([24, 33], [32, 36], [32, 44], [37, 44]),
      limb([24, 33], [17, 38], [13, 43]),
      limb([24, 19], [25, 26], [25, 33]),
    ],
  ],
};

/** Bankdrücken (liegend, Kopf links): Strecklage → halbe Beuge → Brust. */
const HPUSH: PhasenFigurDef = {
  id: "hpush",
  phases: [
    [
      strich([10, 38], [34, 38]),
      torso([17, 33], [29, 33]),
      head([12, 33]),
      limb([29, 33], [35, 37], [35, 44], [40, 44]),
      limb([22, 33], [22, 26], [22, 19]),
      bar([10, 18], [34, 18]),
    ],
    [
      strich([10, 38], [34, 38]),
      torso([17, 33], [29, 33]),
      head([12, 33]),
      limb([29, 33], [35, 37], [35, 44], [40, 44]),
      limb([22, 33], [18, 28], [22, 24]),
      bar([10, 23], [34, 23]),
    ],
    [
      strich([10, 38], [34, 38]),
      torso([17, 33], [29, 33]),
      head([12, 33]),
      limb([29, 33], [35, 37], [35, 44], [40, 44]),
      limb([22, 33], [16, 31], [22, 29]),
      bar([10, 28], [34, 28]),
    ],
  ],
};

/** Überkopfdrücken (frontal, ob-lift-Familie): Rack → halb → Lockout. */
const VPUSH: PhasenFigurDef = {
  id: "vpush",
  phases: [
    [
      head([24, 7]),
      torso([24, 17], [24, 31]),
      limb([24, 17], [19, 15], [18, 12]),
      limb([24, 17], [29, 15], [30, 12]),
      bar([8, 12], [40, 12]),
      limb([24, 31], [20, 38], [20, 44]),
      limb([24, 31], [28, 38], [28, 44]),
    ],
    [
      head([24, 7]),
      torso([24, 17], [24, 31]),
      limb([24, 17], [19, 11], [18, 7]),
      limb([24, 17], [29, 11], [30, 7]),
      bar([8, 7], [40, 7]),
      limb([24, 31], [20, 38], [20, 44]),
      limb([24, 31], [28, 38], [28, 44]),
    ],
    [
      head([24, 7]),
      torso([24, 17], [24, 31]),
      limb([24, 17], [18, 10], [17, 4]),
      limb([24, 17], [30, 10], [31, 4]),
      bar([8, 3], [40, 3]),
      limb([24, 31], [20, 38], [20, 44]),
      limb([24, 31], [28, 38], [28, 44]),
    ],
  ],
};

/** Rudern (vorgebeugt): Arm gestreckt → halber Zug → Hantel am Rumpf. */
const HPULL: PhasenFigurDef = {
  id: "hpull",
  phases: [
    [
      torso([28, 20], [22, 32]),
      head([31, 12]),
      limb([22, 32], [24, 38], [22, 44], [27, 44]),
      limb([28, 20], [28, 28], [28, 35]),
      bar([16, 36], [40, 36]),
    ],
    [
      torso([28, 20], [22, 32]),
      head([31, 12]),
      limb([22, 32], [24, 38], [22, 44], [27, 44]),
      limb([28, 20], [25, 26], [27, 31]),
      bar([15, 32], [39, 32]),
    ],
    [
      torso([28, 20], [22, 32]),
      head([31, 12]),
      limb([22, 32], [24, 38], [22, 44], [27, 44]),
      limb([28, 20], [23, 24], [26, 28]),
      bar([14, 29], [38, 29]),
    ],
  ],
};

/** Klimmzug (frontal, feste Stange): Hang → halber Zug → Kinn über Stange. */
const VPULL: PhasenFigurDef = {
  id: "vpull",
  phases: [
    [
      strich([8, 4], [40, 4]),
      torso([24, 20], [24, 34]),
      head([24, 11]),
      limb([24, 20], [20, 12], [19, 5]),
      limb([24, 20], [28, 12], [29, 5]),
      limb([24, 34], [22, 39], [23, 44]),
      limb([24, 34], [26, 39], [25, 44]),
    ],
    [
      strich([8, 4], [40, 4]),
      torso([24, 16], [24, 30]),
      head([24, 7]),
      limb([24, 16], [19, 10], [19, 5]),
      limb([24, 16], [29, 10], [29, 5]),
      limb([24, 30], [22, 36], [24, 41]),
      limb([24, 30], [26, 36], [25, 41]),
    ],
    [
      strich([8, 4], [40, 4]),
      torso([24, 13], [24, 27]),
      head([24, 5]),
      limb([24, 13], [19, 9], [19, 5]),
      limb([24, 13], [29, 9], [29, 5]),
      limb([24, 27], [22, 33], [24, 39]),
      limb([24, 27], [26, 33], [25, 39]),
    ],
  ],
};

/** Curl (Kurzhantel seitlich): hängend → 90° → oben. */
const ARM: PhasenFigurDef = {
  id: "arm",
  phases: [
    [
      torso([24, 16], [24, 30]),
      head([24, 7]),
      limb([24, 30], [25, 37], [24, 44], [29, 44]),
      limb([24, 16], [25, 23], [26, 30]),
      bar([22, 31], [30, 31]),
    ],
    [
      torso([24, 16], [24, 30]),
      head([24, 7]),
      limb([24, 30], [25, 37], [24, 44], [29, 44]),
      limb([24, 16], [25, 23], [31, 22]),
      bar([27, 22], [35, 22]),
    ],
    [
      torso([24, 16], [24, 30]),
      head([24, 7]),
      limb([24, 30], [25, 37], [24, 44], [29, 44]),
      limb([24, 16], [25, 23], [29, 17]),
      bar([25, 16], [33, 16]),
    ],
  ],
};

/** Seitheben (frontal, Kurzhanteln als Scheiben): unten → halb → T-Position. */
const LATERAL: PhasenFigurDef = {
  id: "lateral",
  phases: [
    [
      head([24, 7]),
      torso([24, 17], [24, 31]),
      limb([24, 17], [20, 23], [19, 28]),
      limb([24, 17], [28, 23], [29, 28]),
      scheibe([19, 30]),
      scheibe([29, 30]),
      limb([24, 31], [20, 38], [20, 44]),
      limb([24, 31], [28, 38], [28, 44]),
    ],
    [
      head([24, 7]),
      torso([24, 17], [24, 31]),
      limb([24, 17], [18, 20], [14, 22]),
      limb([24, 17], [30, 20], [34, 22]),
      scheibe([13, 24]),
      scheibe([35, 24]),
      limb([24, 31], [20, 38], [20, 44]),
      limb([24, 31], [28, 38], [28, 44]),
    ],
    [
      head([24, 7]),
      torso([24, 17], [24, 31]),
      limb([24, 17], [18, 16], [13, 16]),
      limb([24, 17], [30, 16], [35, 16]),
      scheibe([11, 16]),
      scheibe([37, 16]),
      limb([24, 31], [20, 38], [20, 44]),
      limb([24, 31], [28, 38], [28, 44]),
    ],
  ],
};

/** Rumpf (Crunch/Hollow, liegend): flach → Schultern heben → Kompression. */
const CORE: PhasenFigurDef = {
  id: "core",
  phases: [
    [
      torso([18, 38], [30, 38]),
      head([9, 38]),
      limb([18, 38], [24, 40], [29, 41]),
      limb([30, 38], [36, 38], [42, 38]),
    ],
    [
      torso([19, 36], [30, 38]),
      head([10, 34]),
      limb([19, 36], [25, 39], [30, 40]),
      limb([30, 38], [36, 36], [42, 34]),
    ],
    [
      torso([20, 34], [30, 38]),
      head([12, 31]),
      limb([20, 34], [26, 38], [31, 40]),
      limb([30, 38], [36, 34], [42, 31]),
    ],
  ],
};

/** Wadenheben: flach → Ferse hebt → hoher Zehenstand. */
const CALF: PhasenFigurDef = {
  id: "calf",
  phases: [
    [
      torso([24, 16], [24, 30]),
      head([24, 7]),
      limb([24, 30], [25, 37], [24, 44], [29, 44]),
      limb([24, 16], [25, 23], [25, 30]),
    ],
    [
      torso([24, 14], [24, 28]),
      head([24, 5]),
      limb([24, 28], [25, 35], [25, 42], [29, 44]),
      limb([24, 14], [25, 21], [25, 28]),
    ],
    [
      torso([24, 13], [24, 27]),
      head([24, 4]),
      limb([24, 27], [25, 34], [26, 40], [29, 44]),
      limb([24, 13], [25, 20], [25, 27]),
    ],
  ],
};

/** Lauf (Zyklus): Abdruck → Flugphase → Gegenschritt. */
const CARDIO: PhasenFigurDef = {
  id: "cardio",
  phases: [
    [
      torso([27, 15], [23, 29]),
      head([29, 6]),
      limb([27, 15], [32, 20], [29, 24]),
      limb([27, 15], [22, 20], [25, 24]),
      limb([23, 29], [29, 34], [28, 42], [33, 43]),
      limb([23, 29], [17, 34], [13, 40]),
    ],
    [
      torso([27, 15], [23, 29]),
      head([29, 6]),
      limb([27, 15], [30, 21], [28, 26]),
      limb([27, 15], [24, 21], [26, 26]),
      limb([23, 29], [26, 36], [25, 43], [30, 44]),
      limb([23, 29], [19, 35], [19, 42]),
    ],
    [
      torso([27, 15], [23, 29]),
      head([29, 6]),
      limb([27, 15], [22, 20], [25, 24]),
      limb([27, 15], [32, 20], [29, 24]),
      limb([23, 29], [30, 34], [30, 42], [35, 43]),
      limb([23, 29], [16, 34], [13, 41]),
    ],
  ],
};

/* ── Katalog ────────────────────────────────────────────────────────────── */

/** Muster-Standard: jede der 12 Bewegungsfamilien hat EINE Figur. */
export const PATTERN_FIGUR: Record<Pattern, PhasenFigurDef> = {
  squat: KNIEBEUGE,
  lunge: LUNGE,
  hinge: HINGE,
  hpush: HPUSH,
  vpush: VPUSH,
  hpull: HPULL,
  vpull: VPULL,
  arm: ARM,
  lateral: LATERAL,
  core: CORE,
  calf: CALF,
  cardio: CARDIO,
};

/** Übungs-genaue Ausnahmen (id → Figur) — bewusst leer, bis eine Übung eine
 *  eigene Zeichnung verdient; die Musterfigur trägt den Katalog. */
export const EXERCISE_FIGUR: Record<string, PhasenFigurDef> = {};

/** Die Figur einer Übung: Übungs-Override, sonst Muster-Standard. */
export function figurFor(ex: Pick<Exercise, "id" | "pattern">): PhasenFigurDef {
  return EXERCISE_FIGUR[ex.id] ?? PATTERN_FIGUR[ex.pattern] ?? KNIEBEUGE;
}
