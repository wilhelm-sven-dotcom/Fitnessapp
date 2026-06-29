import type {
  Exercise,
  InjuryArea,
  LastPerf,
  Prescription,
  PrescReason,
  ResolvedSlot,
  SetEntry,
  Template,
  WorkoutDay,
} from "@/lib/types";
import { pickPreferred } from "@/lib/affinity";

/** Round a weight suggestion to the nearest 2.5 kg step. */
export const round25 = (x: number) => Math.round(x / 2.5) * 2.5;

/** Round to the user's smallest available weight increment (default 2.5 kg). */
export const roundStep = (x: number, step = 2.5) => {
  const s = step && step > 0 ? step : 2.5;
  return Math.round(x / s) * s;
};

/**
 * Two warm-up sets at 40 % and 65 % of the working weight, 5 reps each.
 * Flagged `warmup` so they never count toward progression, volume or PRs.
 * Empty for bodyweight / unknown working weight.
 */
export function warmupSets(workingWeight: number, step = 2.5): SetEntry[] {
  if (!workingWeight || workingWeight <= 0) return [];
  return [
    { weight: String(roundStep(workingWeight * 0.4, step)), reps: "5", warmup: true },
    { weight: String(roundStep(workingWeight * 0.65, step)), reps: "5", warmup: true },
  ];
}

export function reqOk(ex: Exercise, has: (k: string) => boolean): boolean {
  return (ex.req || ["none"]).every((tok) => {
    if (tok === "none") return true;
    if (tok === "weight") return has("db") || has("kb") || has("bar");
    if (tok === "dumbbell") return has("db");
    if (tok === "kettlebell") return has("kb");
    return has(tok);
  });
}

export function poolFor(
  pattern: string,
  has: (k: string) => boolean,
  allLib: Exercise[],
): Exercise[] {
  return allLib.filter((e) => e.pattern === pattern && reqOk(e, has));
}

/** Heavy hinges to avoid when the lower back is irritated. */
const HEAVY_HINGE = new Set(["rdl_db", "hip_thrust"]);

/**
 * Whether an exercise meaningfully loads an injured area (pattern-based, no
 * per-exercise data needed). Used for persistent, profile-driven injury sparing.
 */
export function stressesInjury(ex: Exercise, injury: InjuryArea): boolean {
  switch (injury) {
    case "rücken":
      return !!ex.backCaution || HEAVY_HINGE.has(ex.id);
    case "knie":
      return ex.pattern === "squat" || ex.pattern === "lunge";
    case "schulter":
      return ex.pattern === "vpush" || ex.pattern === "lateral";
    case "ellbogen":
      return ex.pattern === "arm";
    case "handgelenk":
      return ex.pattern === "hpush" || ex.pattern === "vpush";
    default:
      return false;
  }
}

export function resolveSession(
  tpl: Template,
  sessIdx: number,
  choices: Record<string, string>,
  has: (k: string) => boolean,
  allLib: Exercise[],
  opts: { backSafe?: boolean; injuries?: InjuryArea[]; affinity?: Map<string, number> } = {},
): ResolvedSlot[] {
  const backSafe = opts.backSafe ?? false;
  const injuries = opts.injuries ?? [];
  const affinity = opts.affinity;
  return tpl.slots
    .map((pat, slotIdx): ResolvedSlot | null => {
      const pool = poolFor(pat, has, allLib);
      if (!pool.length) return null;
      const slotKey = tpl.key + ":" + slotIdx;
      const explicit = choices[slotKey]
        ? pool.find((e) => e.id === choices[slotKey])
        : undefined;
      let ex =
        explicit ||
        (affinity
          ? pickPreferred(pool, affinity, sessIdx + slotIdx)
          : pool[(sessIdx + slotIdx) % pool.length]);

      // Back-safe adaptation (after a red back signal) — only when the user
      // has not explicitly chosen this slot, so manual swaps always win.
      if (backSafe && !explicit) {
        if (pat === "core") {
          const stabs = pool.filter((e) => e.backStabilizer);
          if (stabs.length) ex = stabs[(sessIdx + slotIdx) % stabs.length];
        } else if (pat === "hinge" || pat === "squat") {
          if (ex.backCaution || HEAVY_HINGE.has(ex.id)) {
            const gentle = pool.filter(
              (e) => !e.backCaution && !HEAVY_HINGE.has(e.id),
            );
            if (gentle.length) ex = gentle[(sessIdx + slotIdx) % gentle.length];
          }
        }
      }

      // Persistent profile-injury sparing: prefer a same-pattern option that
      // doesn't load an injured area (again, manual choices always win).
      if (injuries.length && !explicit) {
        const stressed = (e: Exercise) => injuries.some((inj) => stressesInjury(e, inj));
        if (stressed(ex)) {
          const safe = pool.filter((e) => !stressed(e));
          if (safe.length) ex = safe[(sessIdx + slotIdx) % safe.length];
        }
      }
      return { ex, slotKey, pool };
    })
    .filter((s): s is ResolvedSlot => s !== null);
}

/**
 * Resolve a user-built day into ResolvedSlot[]. A per-exercise scheme override
 * becomes a cloned Exercise (so presc / estimateSessionMin read it automatically);
 * items whose exercise no longer exists are skipped. `pool` is the same-pattern,
 * equipment-filtered swap pool for in-workout swaps.
 */
export function resolveDay(
  day: WorkoutDay,
  allLib: Exercise[],
  has: (k: string) => boolean,
): ResolvedSlot[] {
  const byId = new Map(allLib.map((e) => [e.id, e]));
  return day.items
    .map((it, i): ResolvedSlot | null => {
      const base = byId.get(it.exerciseId);
      if (!base) return null;
      const ex: Exercise = {
        ...base,
        sets: it.sets ?? base.sets,
        repLow: it.repLow ?? base.repLow,
        repHigh: it.repHigh ?? base.repHigh,
      };
      return {
        ex,
        slotKey: "day:" + day.id + ":" + i,
        pool: poolFor(base.pattern, has, allLib),
      };
    })
    .filter((s): s is ResolvedSlot => s !== null);
}

interface RirResult {
  weight: number | null;
  repTarget: number;
  reason: PrescReason;
}

/**
 * RIR-based autoregulation over the working sets of the last performance.
 * Returns null when there is no RIR/intensity signal (old data) so `presc`
 * can fall back to the rep-based heuristic.
 *
 * Weighted: all sets RIR 0–1 → +2.5 kg; any RIR ≥ 3 → one step lighter;
 * otherwise (a set at RIR 2) → hold weight, +1 rep.
 * Timed: felt intensity 1–5 replaces RIR (≤2 → +5 s hold).
 */
export function rirAdjust(ex: Exercise, sets: SetEntry[]): RirResult | null {
  const work = sets.filter((s) => !s.warmup);
  const timed = ex.unit === "Sek";
  const maxReps = Math.max(0, ...work.map((s) => Number(s.reps) || 0));
  const lastW = Math.max(0, ...work.map((s) => Number(s.weight) || 0));

  if (timed) {
    const ints = work
      .map((s) => s.intensity)
      .filter((x): x is number => x != null);
    if (!ints.length) return null;
    const avg = ints.reduce((a, b) => a + b, 0) / ints.length;
    if (avg <= 2) return { weight: null, repTarget: maxReps + 5, reason: "up" };
    return {
      weight: null,
      repTarget: Math.max(ex.repLow, maxReps),
      reason: avg >= 4 ? "down" : "hold",
    };
  }

  const rirs = work.map((s) => s.rir).filter((x): x is number => x != null);
  if (!rirs.length) return null;
  const maxRir = Math.max(...rirs);

  if (ex.weighted) {
    if (maxRir >= 3)
      return {
        weight: round25(Math.max(0, lastW - 2.5)),
        repTarget: ex.repLow,
        reason: "down",
      };
    if (maxRir <= 1)
      return { weight: round25(lastW + 2.5), repTarget: ex.repLow, reason: "up" };
    return {
      weight: lastW,
      repTarget: Math.min(ex.repHigh, maxReps + 1),
      reason: "rep",
    };
  }

  // Bodyweight reps: can only progress reps.
  if (maxRir <= 1)
    return {
      weight: null,
      repTarget: Math.min(ex.repHigh, maxReps + 1),
      reason: "up",
    };
  return { weight: null, repTarget: Math.max(ex.repLow, maxReps), reason: "hold" };
}

/**
 * Automatic progression toward hypertrophy — RIR-driven, rep-based fallback.
 * `opts.loadMult` scales the suggested weight (daily readiness / deload),
 * `opts.cap` clamps the rep target to the low end (don't chase reps on a low day).
 */
export function presc(
  ex: Exercise,
  lp: LastPerf | null,
  opts: { lighter?: boolean; loadMult?: number; cap?: boolean; step?: number } = {},
): Prescription {
  // Cardio blocks (Peloton/Bike) are guidance, not load — the actual ride is
  // recorded by Strava. Return the planned-minute range + the how-to cue.
  if (ex.pattern === "cardio")
    return {
      w: "",
      r: "",
      reason: "hold",
      line: `${ex.repLow}–${ex.repHigh} Min · ${ex.cue}`,
    };

  const weighted = !!ex.weighted;
  const timed = ex.unit === "Sek";
  const lm = opts.loadMult ?? 1;
  const scaleW = (w: number) => roundStep(w * lm, opts.step);
  const repOf = (r: number) => (opts.cap ? ex.repLow : r);

  if (!lp) {
    return {
      w: "",
      r: "",
      reason: "start",
      line:
        `Heute: ${ex.sets} × ${ex.repLow}–${ex.repHigh}${timed ? " s" : ""}` +
        (weighted ? " · Startgewicht wählen" : ""),
    };
  }

  const work = (lp.sets || []).filter((s) => !s.warmup);
  const maxReps = Math.max(0, ...work.map((s) => Number(s.reps) || 0));
  const lastW = Math.max(0, ...work.map((s) => Number(s.weight) || 0));

  // Eased entry after a long break — don't push, just get moving.
  if (opts.lighter) {
    if (timed)
      return {
        w: "",
        r: String(Math.max(ex.repLow, maxReps)),
        reason: "lighter",
        line: `Ruhig einsteigen: ${ex.sets} × ${Math.max(ex.repLow, maxReps)} s`,
      };
    if (weighted) {
      const w = scaleW(lastW);
      return {
        w: lastW ? String(w) : "",
        r: String(ex.repLow),
        suggestedWeight: lastW ? w : undefined,
        reason: "lighter",
        line: `Ruhig einsteigen: ${ex.sets} × ${ex.repLow} @ ${lastW ? w : "?"} kg`,
      };
    }
    return {
      w: "",
      r: String(Math.max(ex.repLow, maxReps)),
      reason: "lighter",
      line: `Ruhig einsteigen: ${ex.sets} × ${Math.max(ex.repLow, maxReps)} Wdh`,
    };
  }

  const adj = rirAdjust(ex, work);
  if (adj) {
    if (timed) {
      const t = opts.cap ? ex.repLow : adj.repTarget;
      return {
        w: "",
        r: String(t),
        reason: adj.reason,
        line:
          `Heute: ${ex.sets} × ${t} s halten` +
          (adj.reason === "up" && !opts.cap ? " (länger!)" : ""),
      };
    }
    if (weighted) {
      const w = scaleW(adj.weight ?? lastW);
      const r = repOf(adj.repTarget);
      const note = opts.cap
        ? ""
        : adj.reason === "up"
          ? " — hoch!"
          : adj.reason === "down"
            ? " — etwas leichter"
            : "";
      return {
        w: String(w),
        r: String(r),
        suggestedWeight: w,
        reason: adj.reason,
        line: `Heute: ${ex.sets} × ${r} @ ${w} kg${note}`,
      };
    }
    const r = repOf(adj.repTarget);
    return {
      w: "",
      r: String(r),
      reason: adj.reason,
      line:
        `Heute: ${ex.sets} × ${r} Wdh` +
        (adj.reason === "up" && !opts.cap ? " (mehr!)" : ""),
    };
  }

  // --- Fallback: no RIR/intensity in history → rep-based heuristic ---
  const enough = work.length >= ex.sets;
  const top =
    enough && work.slice(0, ex.sets).every((s) => Number(s.reps) >= ex.repHigh);
  if (timed) {
    const target = opts.cap
      ? ex.repLow
      : top
        ? maxReps + 5
        : Math.max(ex.repLow, maxReps);
    return {
      w: "",
      r: String(target),
      reason: top ? "up" : "hold",
      line:
        `Heute: ${ex.sets} × ${target} s halten` +
        (top && !opts.cap ? " (länger!)" : ""),
    };
  }
  if (weighted) {
    if (top) {
      const w = scaleW(lastW + 2.5);
      const r = repOf(ex.repLow);
      return {
        w: String(w),
        r: String(r),
        suggestedWeight: w,
        reason: "up",
        line: `Heute: ${ex.sets} × ${r} @ ${w} kg${opts.cap ? "" : " — hoch!"}`,
      };
    }
    const tr = repOf(Math.min(ex.repHigh, maxReps + 1));
    const w = scaleW(lastW);
    return {
      w: lastW ? String(w) : "",
      r: String(tr),
      suggestedWeight: lastW ? w : undefined,
      reason: "rep",
      line: `Heute: ${ex.sets} × ${tr} @ ${lastW ? w : "?"} kg`,
    };
  }
  const tr = opts.cap
    ? ex.repLow
    : top
      ? maxReps + 1
      : Math.min(ex.repHigh, maxReps + 1);
  return {
    w: "",
    r: String(tr),
    reason: top ? "up" : "rep",
    line: `Heute: ${ex.sets} × ${tr} Wdh` + (top && !opts.cap ? " (mehr!)" : ""),
  };
}
