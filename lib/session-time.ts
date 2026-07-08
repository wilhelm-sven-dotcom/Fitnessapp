import type { Exercise, Pattern, ResolvedSlot, SetEntry } from "@/lib/types";

/** Per-set timing model (seconds). restSec == the live RestTimer duration —
 *  ONE source of truth (they diverged 75 vs 90 before, skewing estimates). */
export const TIME = {
  restSec: 90,
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
// Trim priority: accessories first, compounds late, core last.
const TRIM_ORDER: Pattern[] = [
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

export function estimateSlotMin(ex: Exercise): number {
  // Defensive: a malformed/missing slot exercise contributes no time (never throw).
  if (!ex?.pattern) return 0;
  // Cardio blocks carry their planned duration (minutes) directly.
  if (ex.pattern === "cardio") return ex.repHigh;
  const workSec = ex.unit === "Sek" ? TIME.timedSetSec : TIME.repSetSec;
  const warm = ex.weighted ? 2 : 0;
  const sec =
    ex.sets * (workSec + TIME.restSec) +
    warm * (TIME.warmupSetSec + TIME.warmupRestSec) +
    TIME.transitionSec;
  return sec / 60;
}

/**
 * The two accessory slots paired in superset mode — the last two non-core
 * slots, performed im Wechsel. Null when there aren't two accessories.
 */
export function supersetPair(list: ResolvedSlot[]): [number, number] | null {
  const acc = list
    .map((s, i) => ({ pattern: s.ex?.pattern, i }))
    .filter((x) => x.pattern && x.pattern !== "core");
  if (acc.length < 2) return null;
  return [acc[acc.length - 2].i, acc[acc.length - 1].i];
}

export function estimateSessionMin(
  list: ResolvedSlot[],
  opts: { superset?: boolean } = {},
): number {
  let min = list.reduce((s, { ex }) => s + estimateSlotMin(ex), 0);
  if (opts.superset) {
    const pair = supersetPair(list);
    if (pair) {
      // Paired exercises share rest (one rest per round) — save the rest of
      // the shorter slot of the two.
      const saved = Math.min(list[pair[0]].ex.sets, list[pair[1]].ex.sets);
      min -= (saved * TIME.restSec) / 60;
    }
  }
  return Math.round(min);
}

/**
 * Remaining minutes in a RUNNING session: open working sets × (work + rest),
 * plus planned minutes of untouched cardio blocks. Feeds the workout HUD.
 */
export function estimateRemainingMin(
  list: ResolvedSlot[],
  entries: Record<string, SetEntry[]>,
): number {
  let sec = 0;
  for (const { ex } of list) {
    if (!ex?.pattern) continue;
    const sets = entries[ex.id] ?? [];
    if (ex.pattern === "cardio") {
      const done = sets.some((s) => s.reps !== "" && s.reps != null);
      if (!done) sec += ex.repHigh * 60;
      continue;
    }
    const workSec = ex.unit === "Sek" ? TIME.timedSetSec : TIME.repSetSec;
    const open = sets.filter(
      (s) => !s.warmup && (s.reps === "" || s.reps == null),
    ).length;
    sec += open * (workSec + TIME.restSec);
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
  opts: { protectCore?: boolean; superset?: boolean } = {},
): FitResult {
  const slots: ResolvedSlot[] = list.map((s) => ({ ...s, ex: { ...s.ex } }));
  const est0 = () => estimateSessionMin(slots, { superset: opts.superset });
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
  while (est < budgetMin - 4 && guard++ < 40) {
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
  if (longSession) {
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
        const cand = donor?.pool.find((e) => !used.has(e.id));
        if (!donor || !cand) continue;
        extraNo += 1;
        slots.push({
          ex: { ...cand },
          slotKey: `${donor.slotKey.split(":")[0]}:x${extraNo}`,
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
