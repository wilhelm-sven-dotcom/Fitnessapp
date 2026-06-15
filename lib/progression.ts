import type {
  Exercise,
  LastPerf,
  Prescription,
  PrescReason,
  ResolvedSlot,
  SetEntry,
  Template,
} from "@/lib/types";

/** Round a weight suggestion to the nearest 2.5 kg step. */
export const round25 = (x: number) => Math.round(x / 2.5) * 2.5;

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

export function resolveSession(
  tpl: Template,
  sessIdx: number,
  choices: Record<string, string>,
  has: (k: string) => boolean,
  allLib: Exercise[],
): ResolvedSlot[] {
  return tpl.slots
    .map((pat, slotIdx): ResolvedSlot | null => {
      const pool = poolFor(pat, has, allLib);
      if (!pool.length) return null;
      const slotKey = tpl.key + ":" + slotIdx;
      const chosen = choices[slotKey]
        ? pool.find((e) => e.id === choices[slotKey])
        : undefined;
      const ex = chosen || pool[(sessIdx + slotIdx) % pool.length];
      return { ex, slotKey, pool };
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

/** Automatic progression toward hypertrophy — RIR-driven, with a rep-based fallback. */
export function presc(
  ex: Exercise,
  lp: LastPerf | null,
  opts: { lighter?: boolean } = {},
): Prescription {
  const weighted = !!ex.weighted;
  const timed = ex.unit === "Sek";

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
    if (weighted)
      return {
        w: lastW ? String(lastW) : "",
        r: String(ex.repLow),
        suggestedWeight: lastW || undefined,
        reason: "lighter",
        line: `Ruhig einsteigen: ${ex.sets} × ${ex.repLow} @ ${lastW || "?"} kg`,
      };
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
      return {
        w: "",
        r: String(adj.repTarget),
        reason: adj.reason,
        line:
          `Heute: ${ex.sets} × ${adj.repTarget} s halten` +
          (adj.reason === "up" ? " (länger!)" : ""),
      };
    }
    if (weighted) {
      const w = adj.weight ?? lastW;
      const note =
        adj.reason === "up" ? " — hoch!" : adj.reason === "down" ? " — etwas leichter" : "";
      return {
        w: String(w),
        r: String(adj.repTarget),
        suggestedWeight: adj.weight ?? undefined,
        reason: adj.reason,
        line: `Heute: ${ex.sets} × ${adj.repTarget} @ ${w} kg${note}`,
      };
    }
    return {
      w: "",
      r: String(adj.repTarget),
      reason: adj.reason,
      line:
        `Heute: ${ex.sets} × ${adj.repTarget} Wdh` +
        (adj.reason === "up" ? " (mehr!)" : ""),
    };
  }

  // --- Fallback: no RIR/intensity in history → rep-based heuristic ---
  const enough = work.length >= ex.sets;
  const top =
    enough && work.slice(0, ex.sets).every((s) => Number(s.reps) >= ex.repHigh);
  if (timed) {
    const target = top ? maxReps + 5 : Math.max(ex.repLow, maxReps);
    return {
      w: "",
      r: String(target),
      reason: top ? "up" : "hold",
      line: `Heute: ${ex.sets} × ${target} s halten` + (top ? " (länger!)" : ""),
    };
  }
  if (weighted) {
    if (top) {
      const nw = round25(lastW + 2.5);
      return {
        w: String(nw),
        r: String(ex.repLow),
        suggestedWeight: nw,
        reason: "up",
        line: `Heute: ${ex.sets} × ${ex.repLow} @ ${nw} kg — hoch!`,
      };
    }
    const tr = Math.min(ex.repHigh, maxReps + 1);
    return {
      w: lastW ? String(lastW) : "",
      r: String(tr),
      suggestedWeight: lastW || undefined,
      reason: "rep",
      line: `Heute: ${ex.sets} × ${tr} @ ${lastW || "?"} kg`,
    };
  }
  const tr = top ? maxReps + 1 : Math.min(ex.repHigh, maxReps + 1);
  return {
    w: "",
    r: String(tr),
    reason: top ? "up" : "rep",
    line: `Heute: ${ex.sets} × ${tr} Wdh` + (top ? " (mehr!)" : ""),
  };
}
