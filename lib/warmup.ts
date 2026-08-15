import { band, readinessScore, type ReadinessBand } from "@/lib/readiness";
import type { Exercise, Pattern, Readiness } from "@/lib/types";
import type { PlannedExercise } from "@/lib/session-model";

/**
 * Geführtes Aufwärmen nach dem RAMP-Modell (Jeffreys): Raise (Puls) →
 * Mobilise (dynamische Beweglichkeit in den HEUTIGEN Mustern) → Activate
 * (Zielmuskulatur ansteuern) — Potentiate übernehmen danach die Aufwärmsätze
 * an der Hantel. Bewusst KEINE gehaltenen statischen Dehnungen: die drücken
 * unmittelbar vor Kraftarbeit die Leistung (Simic 2013; Behm & Chaouachi
 * 2011), während 5–10 min dynamisches, spezifisches Aufwärmen sie verbessern
 * (McGowan 2015). Auswahl und Umfang hängen an Einheit + Tagesform.
 * Pur und ohne Zufall — deterministisch je (Einheit, Tag), damit Reload und
 * Re-Render dieselbe Liste sehen.
 */
export interface WarmupDrill {
  id: string;
  name: string;
  cue: string;
  durationSec: number;
  /** Grobklasse (Player-Badge-Fallback). */
  kind: "mobility" | "activation";
  /** RAMP-Phase — bestimmt Reihenfolge und Slot-Vergabe. */
  phase: "raise" | "mobilise" | "activate";
  /** Bewegungsmuster, die der Drill vorbereitet ([] = allgemein). */
  patterns: Pattern[];
  /** Bleibt beim Budget-Trim länger drin, je höher. */
  priority: number;
  /** Rückenlast: „safe" wird bei Rücken-Ampel bevorzugt, „deep" gemieden. */
  backLoad: "safe" | "neutral" | "deep";
  /** Nötiges Equipment — ohne Eintrag immer machbar. */
  equipment?: "band"[];
  /** Figure key in `FIG` to animate. Defaults to the drill `id` when omitted. */
  figure?: string;
}

const D = {
  /* ── RAISE — Puls und Kerntemperatur heben ── */
  bike_easy: {
    id: "bike_easy",
    name: "Locker einrollen (Bike)",
    cue: "Locker auf dem Peloton, niedriger Widerstand — Kreislauf und Beine wach machen.",
    durationSec: 180,
    kind: "activation",
    phase: "raise",
    patterns: [],
    priority: 5,
    backLoad: "safe",
  },
  jumping_jacks: {
    id: "jumping_jacks",
    name: "Hampelmänner",
    cue: "Locker federn, Arme groß über den Kopf — Tempo so, dass der Atem spürbar wird.",
    durationSec: 45,
    kind: "activation",
    phase: "raise",
    patterns: [],
    priority: 5,
    backLoad: "neutral",
  },
  march_high: {
    id: "march_high",
    name: "Marschieren, Knie hoch",
    cue: "Auf der Stelle, Knie bis Hüfthöhe, Gegenarm schwingt mit — aufrecht bleiben.",
    durationSec: 45,
    kind: "activation",
    phase: "raise",
    patterns: [],
    priority: 5,
    backLoad: "safe",
  },

  /* ── MOBILISE — dynamische Beweglichkeit in den heutigen Mustern ── */
  cat_cow: {
    id: "cat_cow",
    name: "Katze-Kuh",
    cue: "Im Vierfüßler Wirbelsäule sanft runden und strecken, im Atemrhythmus.",
    durationSec: 40,
    kind: "mobility",
    phase: "mobilise",
    patterns: ["hinge", "squat", "core"],
    priority: 5,
    backLoad: "safe",
  },
  hip_circles: {
    id: "hip_circles",
    name: "Hüftkreisen",
    cue: "Im Stand große, langsame Kreise mit der Hüfte — je Richtung.",
    durationSec: 30,
    kind: "mobility",
    phase: "mobilise",
    patterns: ["squat", "lunge", "hinge"],
    priority: 4,
    backLoad: "safe",
  },
  ankle_rocks: {
    id: "ankle_rocks",
    name: "Sprunggelenk mobilisieren",
    cue: "Knie über die Zehen nach vorne schieben, Ferse bleibt am Boden. Pro Seite.",
    durationSec: 25,
    kind: "mobility",
    phase: "mobilise",
    patterns: ["squat", "lunge", "calf"],
    priority: 3,
    backLoad: "safe",
  },
  thoracic_open: {
    id: "thoracic_open",
    name: "Brustwirbelsäule öffnen",
    cue: "Im Vierfüßler eine Hand hinter den Kopf, Ellbogen zur Decke drehen. Pro Seite.",
    durationSec: 30,
    kind: "mobility",
    phase: "mobilise",
    patterns: ["hpush", "vpush", "hpull", "vpull"],
    priority: 4,
    backLoad: "safe",
  },
  shoulder_circles: {
    id: "shoulder_circles",
    name: "Schulterkreisen",
    cue: "Große Kreise rückwärts, Schultern locker, Nacken entspannt.",
    durationSec: 25,
    kind: "mobility",
    phase: "mobilise",
    patterns: ["hpush", "vpush", "hpull", "vpull", "lateral", "arm"],
    priority: 3,
    backLoad: "safe",
  },
  worlds_greatest: {
    id: "worlds_greatest",
    name: "Weltbester Stretch",
    cue: "Tiefer Ausfallschritt, Hände neben den Fuß, dann einen Arm zur Decke aufdrehen. Pro Seite.",
    durationSec: 45,
    kind: "mobility",
    phase: "mobilise",
    patterns: ["lunge", "hinge", "hpush"],
    priority: 4,
    backLoad: "deep",
  },
  squat_pry: {
    id: "squat_pry",
    figure: "squat_bw",
    name: "Tiefe Kniebeuge, federn",
    cue: "In die tiefe Hocke, Ellbogen drücken die Knie sanft nach außen, kurz federn, aufrichten.",
    durationSec: 35,
    kind: "mobility",
    phase: "mobilise",
    patterns: ["squat"],
    priority: 4,
    backLoad: "deep",
  },
  leg_swings: {
    id: "leg_swings",
    name: "Beinpendel",
    cue: "Am Standbein festhalten oder frei balancieren, Bein locker vor und zurück pendeln. Pro Seite.",
    durationSec: 30,
    kind: "mobility",
    phase: "mobilise",
    patterns: ["hinge", "lunge"],
    priority: 3,
    backLoad: "neutral",
  },
  hip_flexor_dyn: {
    id: "hip_flexor_dyn",
    figure: "reverse_lunge",
    name: "Hüftbeuger dynamisch",
    cue: "Ausfallschritt zurück, Hüfte nach vorn schieben, kurz halten, wechseln — nicht wippen.",
    durationSec: 35,
    kind: "mobility",
    phase: "mobilise",
    patterns: ["lunge", "squat"],
    priority: 3,
    backLoad: "neutral",
  },
  arm_crossswings: {
    id: "arm_crossswings",
    name: "Armschwünge über Kreuz",
    cue: "Arme weit öffnen und vor der Brust überkreuzen — locker schwingen, Tempo moderat.",
    durationSec: 25,
    kind: "mobility",
    phase: "mobilise",
    patterns: ["hpush", "lateral", "arm"],
    priority: 3,
    backLoad: "safe",
  },

  /* ── ACTIVATE — Zielmuskulatur ansteuern (Glutes/Core/Scapula) ── */
  glute_bridge: {
    id: "glute_bridge",
    figure: "glutebridge",
    name: "Glute Bridge",
    cue: "Auf dem Rücken, Füße auf, Hüfte hoch, oben den Po fest anspannen.",
    durationSec: 30,
    kind: "activation",
    phase: "activate",
    patterns: ["hinge", "squat", "lunge"],
    priority: 5,
    backLoad: "safe",
  },
  gb_march: {
    id: "gb_march",
    name: "Glute-Bridge-March",
    cue: "In der Brücke bleiben und die Füße abwechselnd anheben — Becken bleibt still.",
    durationSec: 30,
    kind: "activation",
    phase: "activate",
    patterns: ["hinge", "squat"],
    priority: 3,
    backLoad: "safe",
  },
  bird_dog: {
    id: "bird_dog",
    figure: "birddog",
    name: "Bird Dog",
    cue: "Gegenüberliegende Hand und Bein strecken, Rumpf ruhig, Becken stabil.",
    durationSec: 30,
    kind: "activation",
    phase: "activate",
    patterns: ["core", "hinge"],
    priority: 4,
    backLoad: "safe",
  },
  dead_bug: {
    id: "dead_bug",
    figure: "deadbug",
    name: "Dead Bug",
    cue: "Auf dem Rücken, unterer Rücken bleibt am Boden, Arm und Bein gegengleich absenken.",
    durationSec: 30,
    kind: "activation",
    phase: "activate",
    patterns: ["core"],
    priority: 4,
    backLoad: "safe",
  },
  side_plank_dip: {
    id: "side_plank_dip",
    figure: "sideplank",
    name: "Seitstütz mit Absenken",
    cue: "Im Seitstütz die Hüfte kontrolliert senken und heben — kurz je Seite.",
    durationSec: 35,
    kind: "activation",
    phase: "activate",
    patterns: ["core"],
    priority: 3,
    backLoad: "safe",
  },
  scap_pushup: {
    id: "scap_pushup",
    figure: "pushup",
    name: "Schulterblatt-Liegestütz",
    cue: "Im Stütz Arme gestreckt lassen, nur die Schulterblätter zusammenziehen und auseinanderschieben.",
    durationSec: 30,
    kind: "activation",
    phase: "activate",
    patterns: ["hpush"],
    priority: 4,
    backLoad: "neutral",
  },
  band_pullapart: {
    id: "band_pullapart",
    figure: "face_pull",
    name: "Band auseinanderziehen",
    cue: "Band auf Brusthöhe auseinanderziehen, Schulterblätter zusammen — langsam zurück.",
    durationSec: 30,
    kind: "activation",
    phase: "activate",
    patterns: ["hpull", "vpull"],
    priority: 4,
    backLoad: "safe",
    equipment: ["band"],
  },
  wall_slides: {
    id: "wall_slides",
    figure: "ohp_stand",
    name: "Überkopf-Slides",
    cue: "Arme in U-Halte langsam über den Kopf schieben und zurück — Rippen unten lassen.",
    durationSec: 30,
    kind: "activation",
    phase: "activate",
    patterns: ["vpush", "lateral"],
    priority: 4,
    backLoad: "neutral",
  },
  side_steps: {
    id: "side_steps",
    name: "Seitwärtsgänge",
    cue: "In halber Hocke seitwärts steigen, Knie bleiben über den Füßen — je Richtung.",
    durationSec: 30,
    kind: "activation",
    phase: "activate",
    patterns: ["squat", "lunge"],
    priority: 3,
    backLoad: "neutral",
  },
  pogo_calf: {
    id: "pogo_calf",
    figure: "squat_bw",
    name: "Waden-Federn",
    cue: "Kleine, schnelle Sprünge aus dem Sprunggelenk — Knie fast gestreckt, Fersen küssen den Boden.",
    durationSec: 25,
    kind: "activation",
    phase: "activate",
    patterns: ["calf"],
    priority: 3,
    backLoad: "neutral",
  },
  pallof: {
    id: "pallof",
    name: "Anti-Rotations-Press",
    cue: "Band seitlich gespannt, Arme nach vorn strecken und der Drehung widerstehen. Pro Seite.",
    durationSec: 30,
    kind: "activation",
    phase: "activate",
    patterns: ["core", "hinge", "squat"],
    priority: 2,
    backLoad: "safe",
    equipment: ["band"],
  },
} satisfies Record<string, WarmupDrill>;

/** Kompletter Katalog — für Tests/Absicherung exportiert. */
export const WARMUP_CATALOG: WarmupDrill[] = Object.values(D);

const RAISE = [D.jumping_jacks, D.march_high];
const MOBILISE = [
  D.cat_cow,
  D.hip_circles,
  D.ankle_rocks,
  D.thoracic_open,
  D.shoulder_circles,
  D.worlds_greatest,
  D.squat_pry,
  D.leg_swings,
  D.hip_flexor_dyn,
  D.arm_crossswings,
];
const ACT_CORE = [D.dead_bug, D.bird_dog, D.side_plank_dip, D.pallof];
const ACT_GLUTE = [D.glute_bridge, D.gb_march, D.side_steps];
const ACT_SCAP = [D.scap_pushup, D.band_pullapart, D.wall_slides];
const LOWERP: Pattern[] = ["squat", "lunge", "hinge", "calf"];
const PUSHPULL: Pattern[] = ["hpush", "vpush", "hpull", "vpull", "lateral", "arm"];

/** FNV-1a — deterministische Tages-Rotation ohne Math.random (Render-stabil). */
function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function pick<T>(arr: T[], seed: string, slot: string): T | undefined {
  if (!arr.length) return undefined;
  return arr[hash(`${seed}:${slot}`) % arr.length];
}

export interface WarmupOpts {
  readiness?: Readiness | null;
  /** Rücken-Ampel der Einheit (Schongang). */
  backSafe?: boolean;
  /** Letzte Einheit meldete roten Rücken. */
  lastBackRed?: boolean;
  /** „Auf dem Bike aufwärmen"-Setting. */
  bike?: boolean;
  /** Equipment-Predicate (z. B. has("band")). */
  has?: (tag: string) => boolean;
  /** Rotations-Seed — Datum der Einheit (Reload-stabil). */
  seed?: string;
}

/** Ziel-Budget in Sekunden je Tagesform: müde wärmt LÄNGER auf, frisch kompakter. */
function budgetSec(b: ReadinessBand): number {
  return b === "low" ? 450 : b === "high" ? 270 : 360;
}

const SWITCH_SEC = 5;
const totalSec = (list: WarmupDrill[]) =>
  list.reduce((s, d) => s + d.durationSec, 0) + SWITCH_SEC * Math.max(0, list.length - 1);

/**
 * Stellt das Aufwärmen für die HEUTIGE Einheit zusammen: Raise → Mobilise
 * (Abdeckung aller Session-Muster) → Activate (Core immer; Glutes/Scapula
 * nach Bedarf). Tagesform steuert das Zeitbudget, die Rücken-Ampel tauscht
 * tiefe Positionen gegen rückenfreundliche Aktivierung, Equipment filtert
 * Band-Drills, der Datums-Seed rotiert innerhalb gleichwertiger Kandidaten.
 */
export function warmupFor(
  items: PlannedExercise[],
  lib: Exercise[],
  opts: WarmupOpts = {},
): WarmupDrill[] {
  const byId = new Map(lib.map((e) => [e.id, e]));
  const exs = items
    .map((it) => byId.get(it.exerciseId))
    .filter((e): e is Exercise => !!e);
  const patterns = new Set<Pattern>(exs.map((e) => e.pattern));
  const seed = opts.seed ?? "heute";
  const hasEq = opts.has ?? (() => false);

  // Rücken schonen: rote Ampel im Check-in, Schongang-Einheit, roter Vortag
  // oder geplante Übungen mit backCaution-Flag.
  const spareBack =
    (opts.readiness?.back ?? 3) <= 1 ||
    !!opts.backSafe ||
    !!opts.lastBackRed ||
    exs.some((e) => e.backCaution);

  const b: ReadinessBand = opts.readiness ? band(readinessScore(opts.readiness)) : "mid";
  const budget = budgetSec(b);

  const out: WarmupDrill[] = [];
  const used = new Set<string>();
  const allowed = (d: WarmupDrill) =>
    !used.has(d.id) &&
    (!d.equipment || d.equipment.every((t) => hasEq(t))) &&
    !(spareBack && d.backLoad === "deep");
  const add = (d?: WarmupDrill) => {
    if (!d || used.has(d.id)) return;
    used.add(d.id);
    out.push(d);
  };

  /* ── RAISE ── */
  if (opts.bike || patterns.has("cardio")) {
    // Frisch → kürzer einrollen; müde → die vollen 3 Minuten.
    add(b === "high" ? { ...D.bike_easy, durationSec: 120 } : D.bike_easy);
  } else {
    add(pick(RAISE.filter(allowed), seed, "raise"));
  }

  /* ── MOBILISE: Wirbelsäule immer, dann Abdeckung der heutigen Muster ── */
  add(D.cat_cow);
  const strength = [...patterns].filter((p) => p !== "cardio");
  const covered = () =>
    new Set(out.filter((d) => d.phase === "mobilise").flatMap((d) => d.patterns));
  for (let round = 0; round < 6; round++) {
    const open = strength.filter((p) => !covered().has(p));
    if (!open.length) break;
    const openSet = new Set(open);
    const cands = MOBILISE.filter(allowed).filter((d) =>
      d.patterns.some((p) => openSet.has(p)),
    );
    if (!cands.length) break;
    // Erst maximaler Abdeckungsgewinn, Gleichstand rotiert per Seed.
    const scored = cands.map((d) => ({
      d,
      s: d.patterns.filter((p) => openSet.has(p)).length,
    }));
    const top = Math.max(...scored.map((x) => x.s));
    add(pick(scored.filter((x) => x.s === top).map((x) => x.d), seed, `mob${round}`));
  }

  /* ── ACTIVATE: Core immer; Glutes bei Unterkörper, Scapula bei Push/Pull ── */
  const hasAny = (ps: Pattern[]) => ps.some((p) => patterns.has(p));
  add(pick(ACT_CORE.filter(allowed), seed, "core"));
  if (hasAny(LOWERP)) add(pick(ACT_GLUTE.filter(allowed), seed, "glute"));
  if (hasAny(PUSHPULL)) {
    const relevant = ACT_SCAP.filter(allowed).filter((d) =>
      d.patterns.some((p) => patterns.has(p)),
    );
    add(pick(relevant.length ? relevant : ACT_SCAP.filter(allowed), seed, "scap"));
  }
  if (patterns.has("calf") && allowed(D.pogo_calf)) add(D.pogo_calf);
  // Rücken-Ampel: eine zweite rückenfreundliche Aktivierung dazu.
  if (spareBack) {
    add(
      pick(
        [...ACT_CORE, D.glute_bridge].filter((d) => allowed(d) && d.backLoad === "safe"),
        seed,
        "backcare",
      ),
    );
  }

  /* ── Budget: müde füllt auf, frisch trimmt — nie Raise oder den Core-Slot ── */
  const essential = new Set(out.slice(0, 1).map((d) => d.id));
  const coreDrill = out.find((d) => ACT_CORE.some((c) => c.id === d.id));
  if (coreDrill) essential.add(coreDrill.id);

  const fillPool = [...MOBILISE, ...ACT_CORE, ...ACT_GLUTE, ...ACT_SCAP]
    .filter(allowed)
    .filter((d) => d.patterns.length === 0 || d.patterns.some((p) => patterns.has(p)))
    .sort((a, x) => x.priority - a.priority);
  for (const d of fillPool) {
    if (totalSec(out) + SWITCH_SEC + d.durationSec > budget) break;
    add(d);
  }

  while (out.length > 4 && totalSec(out) > budget) {
    const removable = out.filter((d) => !essential.has(d.id));
    if (!removable.length) break;
    const min = Math.min(...removable.map((d) => d.priority));
    const victim = removable.find((d) => d.priority === min)!;
    out.splice(out.indexOf(victim), 1);
    used.delete(victim.id);
  }

  // RAMP-Reihenfolge herstellen (Raise → Mobilise → Activate), stabil je Phase.
  const rank = { raise: 0, mobilise: 1, activate: 2 } as const;
  return out
    .map((d, i) => ({ d, i }))
    .sort((a, x) => rank[a.d.phase] - rank[x.d.phase] || a.i - x.i)
    .map((x) => x.d);
}

export function warmupTotalMin(drills: WarmupDrill[]): number {
  return Math.max(1, Math.round(drills.reduce((s, d) => s + d.durationSec, 0) / 60));
}
