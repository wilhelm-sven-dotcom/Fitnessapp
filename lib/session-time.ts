import type { Exercise, Pattern, ResolvedSlot } from "@/lib/types";

/** Per-set timing model (seconds). */
export const TIME = {
  restSec: 75,
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
  const workSec = ex.unit === "Sek" ? TIME.timedSetSec : TIME.repSetSec;
  const warm = ex.weighted ? 2 : 0;
  const sec =
    ex.sets * (workSec + TIME.restSec) +
    warm * (TIME.warmupSetSec + TIME.warmupRestSec) +
    TIME.transitionSec;
  return sec / 60;
}

export function estimateSessionMin(list: ResolvedSlot[]): number {
  return Math.round(list.reduce((s, { ex }) => s + estimateSlotMin(ex), 0));
}

export interface FitResult {
  list: ResolvedSlot[];
  estMin: number;
  adjusted: "trim" | "pad" | "none";
}

/**
 * Trim or pad a resolved session to fit a time budget (minutes).
 * First reduces accessory/compound sets (min 2), then drops the
 * lowest-priority slot (keeping ≥ MIN_SLOTS); never drops the core slot
 * when `protectCore` (back-safe sessions keep their stabilizer).
 */
export function fitToBudget(
  list: ResolvedSlot[],
  budgetMin: number,
  opts: { protectCore?: boolean } = {},
): FitResult {
  const slots: ResolvedSlot[] = list.map((s) => ({ ...s, ex: { ...s.ex } }));
  let est = estimateSessionMin(slots);
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
    est = estimateSessionMin(slots);
  }

  guard = 0;
  while (est < budgetMin - 4 && guard++ < 20) {
    const slot = slots.find((s) => isCompound(s.ex.pattern) && s.ex.sets < 4);
    if (!slot) break;
    slot.ex.sets += 1;
    adjusted = adjusted === "trim" ? "trim" : "pad";
    est = estimateSessionMin(slots);
  }

  return { list: slots, estMin: est, adjusted };
}
