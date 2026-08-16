import { roundStep } from "@/lib/progression";
import type { EffectiveProfile } from "@/lib/athlete";
import type { Exercise, Pattern } from "@/lib/types";

/**
 * Deterministische Startgewichts-Schätzung für Übungen OHNE Historie — bewusst
 * konservativ („2–3 Wdh im Tank"), offline und sofort. Der Live-Coach verfeinert
 * nach dem ersten geloggten Satz; hier geht es nur um einen brauchbaren Anker
 * statt eines leeren „kg"-Felds.
 *
 * Dreistufig: PATTERN_BASE (Anteil Körpergewicht, Referenz Langhantel-Gesamtlast
 * bei ~10 Wdh, fortgeschritten) × EQUIP_MOD (Umrechnung auf den GELOGGTEN Wert
 * der Modalität — bei Kurzhanteln ist das PRO Hantel, Konvention dumbbellHint)
 * × EXERCISE_OVERRIDE (absolute Körpergewichts-Koeffizienten für Ausreißer,
 * ersetzt Base×Mod komplett).
 */

export interface StartSuggestion {
  /** Vorschlag in kg, bereits auf die Gewichtsstufe gerundet. */
  w: number;
  /** Kurze Herleitung (Debug/Tests — die UI nutzt die presc-Line). */
  why: string;
}

/** Anteil Körpergewicht je Muster (Langhantel-Referenz, ~10 Wdh). */
const PATTERN_BASE: Record<Pattern, number> = {
  squat: 0.45,
  lunge: 0.3,
  hinge: 0.55,
  hpush: 0.45,
  vpush: 0.28,
  hpull: 0.38,
  vpull: 0.45,
  arm: 0.16,
  lateral: 0.1,
  core: 0.16,
  calf: 0.4,
  cardio: 0,
};

/** Umrechnung Referenz → geloggter Wert der Modalität. Erster req-Token, der
 *  hier vorkommt, gewinnt (Alias dumbbell/kettlebell → db/kb wie in reqOk). */
const EQUIP_MOD: Record<string, number> = {
  bar: 1.0,
  machine: 1.15,
  cable: 0.55,
  db: 0.5, // PRO Hantel
  kb: 0.5,
  weight: 0.5,
  bench: 1.0,
  box: 1.0,
  pullup: 1.0,
  rings: 1.0,
  bands: 0.35,
  none: 0.35,
};

const REQ_ALIAS: Record<string, string> = { dumbbell: "db", kettlebell: "kb" };

/** Ausreißer: absoluter Körpergewichts-Koeffizient (ersetzt Base×Mod).
 *  Kalibriert auf 90 kg / fortgeschritten / Stufe 2,5 — siehe Node-Asserts. */
const EXERCISE_OVERRIDE: Record<string, number> = {
  // Unterkörper
  goblet: 0.25,
  squat_db: 0.17,
  front_squat: 0.38,
  leg_press: 1.0,
  hack_squat: 0.7,
  leg_extension: 0.3,
  bss: 0.1,
  stepup: 0.1,
  walking_lunge: 0.1,
  split_squat: 0.1,
  glutebridge: 0.35,
  hip_thrust: 0.8,
  rdl_db: 0.2,
  rdl_bar: 0.45,
  rdl_single: 0.12,
  kb_swing: 0.18,
  good_morning: 0.25,
  leg_curl: 0.3,
  back_ext: 0.2,
  calf_seated: 0.3,
  // Druck
  incline_db: 0.2,
  cable_fly: 0.12,
  db_fly: 0.08,
  pec_deck: 0.35,
  push_press: 0.32,
  // Zug
  cable_row: 0.4,
  row_machine: 0.4,
  renegade_row: 0.1,
  shrug_db: 0.25,
  lat_pulldown: 0.5,
  straight_arm_pulldown: 0.2,
  pullover_db: 0.15,
  // Arme
  curl: 0.07,
  hammer_curl: 0.07,
  incline_curl: 0.06,
  concentration_curl: 0.05,
  cable_curl: 0.1,
  skull_crusher: 0.08,
  pushdown: 0.2,
  tri_oh: 0.12,
  tri_cable_oh: 0.15,
  wrist_curl: 0.05,
  reverse_curl: 0.05,
  // Schulter seitlich/hinten
  lateral: 0.05,
  cable_lateral: 0.06,
  reverse_fly_db: 0.06,
  reverse_fly_machine: 0.3,
  front_raise: 0.05,
  upright_row: 0.12,
  face_pull_cable: 0.15,
  rear_delt_row: 0.1,
  // Core
  cable_chop: 0.15,
  db_chop: 0.08,
  around_world: 0.07,
  russian_twist: 0.05,
};

const EXP_MULT: Record<EffectiveProfile["experience"], number> = {
  anfänger: 0.7,
  fortgeschritten: 1.0,
  erfahren: 1.25,
};

const UPPER: ReadonlySet<Pattern> = new Set([
  "hpush",
  "vpush",
  "hpull",
  "vpull",
  "arm",
  "lateral",
]);

const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));

function equipModOf(ex: Exercise): number {
  for (const raw of ex.req || []) {
    const tok = REQ_ALIAS[raw] ?? raw;
    const mod = EQUIP_MOD[tok];
    if (mod != null) return mod;
  }
  return EQUIP_MOD.none;
}

/**
 * Startgewicht für eine Übung ohne Historie. `null` für unbelastete, gehaltene
 * (Sek) und Cardio-Übungen — die bleiben komplett unberührt.
 */
export function startWeight(
  ex: Exercise,
  profile: EffectiveProfile,
  opts: { step?: number } = {},
): StartSuggestion | null {
  if (!ex.weighted || ex.pattern === "cardio" || ex.unit === "Sek") return null;
  const step = opts.step && opts.step > 0 ? opts.step : 2.5;
  const bw = profile.bodyweightKg;

  const override = EXERCISE_OVERRIDE[ex.id];
  let coeff =
    override ?? PATTERN_BASE[ex.pattern] * equipModOf(ex);
  if (coeff <= 0) return null;

  // Erfahrung, optional Geschlecht (konservativ), Wiederholungsbereich:
  // hochrepetitive Assistenz wird automatisch leichter.
  coeff *= EXP_MULT[profile.experience];
  if (profile.sex === "w") coeff *= UPPER.has(ex.pattern) ? 0.75 : 0.9;
  const mid = (ex.repLow + ex.repHigh) / 2;
  coeff *= clamp(1 - 0.025 * (mid - 10), 0.75, 1.15);

  const hasBar = (ex.req || []).includes("bar");
  let w = roundStep(bw * coeff, step);
  // Floor: Langhantel-Übungen starten bei der leeren Standard-Stange (20 kg;
  // leichtere Stangen wären ein späteres Setting). Sonst kleinste Scheibe.
  w = Math.max(w, hasBar ? 20 : step);
  // Havarie-Klammer gegen absurde Profile/Custom-Übungen.
  w = Math.min(w, roundStep(bw * 1.2, step));
  if (w <= 0) return null;

  return {
    w,
    why: `Konservative Schätzung: ~${Math.round(coeff * 100)} % Körpergewicht (${profile.experience})`,
  };
}
