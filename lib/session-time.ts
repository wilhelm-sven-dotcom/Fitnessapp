import { aufwaermPlan } from "@/lib/aufwaermsaetze";
import type { Exercise, Pattern, ResolvedSlot, SetEntry } from "@/lib/types";

/** Per-set timing model (seconds). Die Pausen sind zugleich die echten
 *  Pausenlängen im Training (`restSecFor`) — ONE source of truth (they
 *  diverged 75 vs 90 before, skewing estimates). */
export const TIME = {
  /** Satzpause bei eingelenkigen Übungen, Rumpf, Halteübungen. */
  restSec: 90,
  /** Satzpause bei Grundübungen (Nutzer-Entscheid Nov 2026: 2:30 statt 1:30). */
  restGrundSec: 150,
  repSetSec: 30,
  timedSetSec: 40,
  warmupSetSec: 20,
  warmupRestSec: 30,
  transitionSec: 25,
} as const;

const COMPOUND: Pattern[] = [
  "squat",
  "lunge",
  "hinge",
  "hpush",
  "vpush",
  "hpull",
  "vpull",
];
const isCompound = (p: Pattern) => COMPOUND.includes(p);

/**
 * Eingelenkige Übungen in den großen Mustern — sie gehören NICHT zu den
 * Grundübungen: Beinstrecker steht im Muster „Kniebeuge“, Butterfly im Muster
 * „Drücken“, bewegt aber nur ein Gelenk und braucht keine lange Pause.
 */
const EINGELENKIG: ReadonlySet<string> = new Set([
  "leg_extension",
  "leg_curl",
  "back_ext",
  "glutebridge",
  "pull_through",
  "cable_fly",
  "db_fly",
  "pec_deck",
  "pullover_db",
  "straight_arm_pulldown",
  "scap_pullup",
  "shrug_db",
]);

/** Grundübung = mehrgelenkig in einem großen Muster (Beine, Drücken, Ziehen):
 *  Presse, Kniebeuge, Kreuzheben, Bankdrücken, Schulterdrücken, Rudern,
 *  Latzug, Klimmzug … Halteübungen (Sekunden) zählen nicht dazu. */
export function istGrunduebung(ex: Pick<Exercise, "id" | "pattern" | "unit">): boolean {
  return ex.unit !== "Sek" && isCompound(ex.pattern) && !EINGELENKIG.has(ex.id);
}

/** Länge der Satzpause nach einem Satz dieser Übung, in Sekunden. */
export function restSecFor(ex: Pick<Exercise, "id" | "pattern" | "unit">): number {
  return istGrunduebung(ex) ? TIME.restGrundSec : TIME.restSec;
}
// Trim priority: accessories first, compounds late, core last.
const TRIM_ORDER: Pattern[] = [
  "calf",
  "arm",
  "lateral",
  "vpush",
  "vpull",
  "hpull",
  "hpush",
  "hinge",
  "lunge",
  "squat",
  "core",
];
const MIN_SLOTS = 3;

/** Minuten für EINE Übung. `aufwaermen`: bekommt sie die zwei Aufwärmsätze?
 *  (Vorgabe: ja, wenn sie Gewicht trägt — die Einheit weiß es genauer, siehe
 *  `estimateSessionMin`.) */
export function estimateSlotMin(ex: Exercise, aufwaermen: boolean = !!ex?.weighted): number {
  // Defensive: a malformed/missing slot exercise contributes no time (never throw).
  if (!ex?.pattern) return 0;
  // Cardio blocks carry their planned duration (minutes) directly.
  if (ex.pattern === "cardio") return ex.repHigh;
  const workSec = ex.unit === "Sek" ? TIME.timedSetSec : TIME.repSetSec;
  const warm = ex.weighted && aufwaermen ? 2 : 0;
  const sec =
    ex.sets * (workSec + restSecFor(ex)) +
    warm * (TIME.warmupSetSec + TIME.warmupRestSec) +
    TIME.transitionSec;
  return sec / 60;
}

/** Minuten für die ganze Einheit — mit derselben Aufwärmsatz-Regel wie die
 *  Vorbelegung (nur die erste gewichtete Übung je Muskel). */
export function estimateSessionMin(list: ResolvedSlot[]): number {
  const warm = aufwaermPlan(list.map((s) => s.ex));
  return Math.round(list.reduce((s, { ex }, i) => s + estimateSlotMin(ex, warm[i]), 0));
}

/**
 * Remaining minutes in a RUNNING session: open working sets × (work + rest),
 * plus planned minutes of untouched cardio blocks. Feeds the runner header.
 */
export function estimateRemainingMin(
  pairs: { ex: Exercise; sets: SetEntry[] }[],
): number {
  let sec = 0;
  for (const { ex, sets } of pairs) {
    if (!ex?.pattern) continue;
    if (ex.pattern === "cardio") {
      const done = sets.some((s) => s.reps !== "" && s.reps != null);
      if (!done) sec += ex.repHigh * 60;
      continue;
    }
    const workSec = ex.unit === "Sek" ? TIME.timedSetSec : TIME.repSetSec;
    const open = sets.filter(
      (s) => !s.warmup && (s.reps === "" || s.reps == null),
    ).length;
    sec += open * (workSec + restSecFor(ex));
  }
  return Math.max(0, Math.round(sec / 60));
}

export interface FitResult {
  list: ResolvedSlot[];
  estMin: number;
  adjusted: "trim" | "pad" | "extend" | "none";
}

/** Ab hier gilt ein Budget als „lange Einheit": höheres Satz-Polster und
 *  notfalls zusätzliche Übungen aus den Slot-Pools. */
const LONG_BUDGET_MIN = 45;
// Bevorzugte Muster für Zusatz-Übungen (sinnvolle Zweitübungen zuerst);
// dahinter greifen die übrigen Muster des Tages in Template-Reihenfolge.
const EXTEND_ORDER: Pattern[] = ["vpush", "hpull", "lunge", "arm", "lateral", "core"];

/**
 * Trim or pad a resolved session to fit a time budget (minutes).
 * First reduces accessory/compound sets (min 2), then drops the
 * lowest-priority slot (keeping ≥ MIN_SLOTS); never drops the core slot
 * when `protectCore` (back-safe sessions keep their stabilizer).
 */
export function fitToBudget(
  list: ResolvedSlot[],
  budgetMin: number,
  opts: {
    protectCore?: boolean;
    choices?: Record<string, string>;
    /** Nur kürzen, nie Sätze oder Übungen ergänzen — für Einheiten, deren
     *  Umfang jemand bewusst gesetzt hat (ATLAS-Plan). */
    nurKuerzen?: boolean;
  } = {},
): FitResult {
  const slots: ResolvedSlot[] = list.map((s) => ({ ...s, ex: { ...s.ex } }));
  const est0 = () => estimateSessionMin(slots);
  let est = est0();
  let adjusted: FitResult["adjusted"] = "none";

  let guard = 0;
  while (est > budgetMin + 2 && guard++ < 80) {
    // 1) shave a set off the lowest-priority slot with > 2 sets
    const slot = TRIM_ORDER.filter((p) => !(opts.protectCore && p === "core"))
      .map((p) => slots.find((s) => s.ex.pattern === p && s.ex.sets > 2))
      .find(Boolean);
    if (slot) {
      slot.ex.sets -= 1;
    } else {
      // 2) drop the lowest-priority non-core slot, keeping a minimum
      if (slots.length <= MIN_SLOTS) break;
      const pat = TRIM_ORDER.find(
        (p) =>
          !(opts.protectCore && p === "core") &&
          slots.some((s) => s.ex.pattern === p),
      );
      const idx = pat ? slots.findIndex((s) => s.ex.pattern === pat) : -1;
      if (idx < 0) break;
      slots.splice(idx, 1);
    }
    adjusted = "trim";
    est = est0();
  }

  // Polstern: mehr Sätze auf Compounds (lange Einheiten dürfen höher stapeln
  // und nehmen auch Iso-Slots mit), solange Luft im Budget ist.
  const longSession = budgetMin >= LONG_BUDGET_MIN;
  const compoundCap = longSession ? 5 : 4;
  guard = 0;
  while (!opts.nurKuerzen && est < budgetMin - 4 && guard++ < 40) {
    const slot =
      slots.find((s) => isCompound(s.ex.pattern) && s.ex.sets < compoundCap) ??
      (longSession
        ? slots.find(
            (s) =>
              (s.ex.pattern === "arm" || s.ex.pattern === "lateral") && s.ex.sets < 4,
          )
        : undefined);
    if (!slot) break;
    slot.ex.sets += 1;
    adjusted = adjusted === "trim" ? "trim" : "pad";
    est = est0();
  }

  // Verlängern: reicht das Satz-Polster nicht (45+ min), kommen ZUSÄTZLICHE
  // Übungen aus den vorhandenen Slot-Pools dazu — je Runde eine, dedupe über
  // die ganze Session, EXTEND_ORDER zuerst, dann die übrigen Tages-Muster.
  if (longSession && !opts.nurKuerzen) {
    const patternOrder = [
      ...EXTEND_ORDER,
      ...slots.map((s) => s.ex.pattern).filter((p) => !EXTEND_ORDER.includes(p)),
    ];
    let extraNo = 0;
    guard = 0;
    while (est < budgetMin - 6 && guard++ < 12) {
      const used = new Set(slots.map((s) => s.ex.id));
      let added = false;
      for (const pat of patternOrder) {
        const donor = slots.find((s) => s.ex.pattern === pat && s.pool.length > 1);
        if (!donor) continue;
        const slotKey = `${donor.slotKey.split(":")[0]}:x${extraNo + 1}`;
        // Ein manueller Tausch dieses Zusatz-Slots gewinnt (sofern verfügbar und
        // noch nicht in der Session), sonst der erste unbenutzte Pool-Eintrag.
        const chosenId = opts.choices?.[slotKey];
        const chosen =
          chosenId && !used.has(chosenId)
            ? donor.pool.find((e) => e.id === chosenId)
            : undefined;
        const cand = chosen ?? donor.pool.find((e) => !used.has(e.id));
        if (!cand) continue;
        extraNo += 1;
        slots.push({
          ex: { ...cand },
          slotKey,
          pool: donor.pool,
        });
        adjusted = "extend";
        est = est0();
        added = true;
        break;
      }
      if (!added) break;
    }
  }

  return { list: slots, estMin: est, adjusted };
}

/** Tatsächliche Dauer einer Einheit in ganzen Minuten (Start → Ende), auf
 *  1–360 begrenzt; null bei unplausiblen Zeitstempeln (Uhr verstellt,
 *  kaputter Start). Die Fortsetzung nach Reload zählt bewusst mit — die
 *  Einheit lief so lange. */
export function sessionMinutes(startISO: string, endISO: string): number | null {
  const ms = new Date(endISO).getTime() - new Date(startISO).getTime();
  if (!Number.isFinite(ms) || ms < 0) return null;
  return Math.min(360, Math.max(1, Math.round(ms / 60_000)));
}
