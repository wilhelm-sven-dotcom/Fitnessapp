import type {
  Exercise,
  LastPerf,
  Prescription,
  ResolvedSlot,
  Template,
} from "@/lib/types";

/** Round a weight suggestion to the nearest 2.5 kg step. */
export const round25 = (x: number) => Math.round(x / 2.5) * 2.5;

/** Legacy fixed step — used by the ported `presc`; superseded by RIR logic. */
export const STEP_KG = 2;

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

/** Automatic progression toward hypertrophy (ported baseline; RIR logic added later). */
export function presc(ex: Exercise, lp: LastPerf | null): Prescription {
  const weighted = !!ex.weighted;
  const timed = ex.unit === "Sek";
  if (!lp) {
    return {
      w: "",
      r: "",
      line:
        `Heute: ${ex.sets} × ${ex.repLow}–${ex.repHigh}${timed ? " s" : ""}` +
        (weighted ? " · Startgewicht wählen" : ""),
    };
  }
  const sets = lp.sets || [];
  const enough = sets.length >= ex.sets;
  const top =
    enough && sets.slice(0, ex.sets).every((s) => Number(s.reps) >= ex.repHigh);
  const maxReps = Math.max(0, ...sets.map((s) => Number(s.reps) || 0));
  const lastW = Math.max(0, ...sets.map((s) => Number(s.weight) || 0));
  if (timed) {
    const target = top ? maxReps + 5 : Math.max(ex.repLow, maxReps);
    return {
      w: "",
      r: String(target),
      line: `Heute: ${ex.sets} × ${target} s halten` + (top ? " (länger!)" : ""),
    };
  }
  if (weighted) {
    if (top) {
      const nw = lastW + STEP_KG;
      return {
        w: String(nw),
        r: String(ex.repLow),
        line: `Heute: ${ex.sets} × ${ex.repLow} @ ${nw} kg — hoch!`,
      };
    }
    const tr = Math.min(ex.repHigh, maxReps + 1);
    return {
      w: lastW ? String(lastW) : "",
      r: String(tr),
      line: `Heute: ${ex.sets} × ${tr} @ ${lastW || "?"} kg`,
    };
  }
  const tr = top ? maxReps + 1 : Math.min(ex.repHigh, maxReps + 1);
  return {
    w: "",
    r: String(tr),
    line: `Heute: ${ex.sets} × ${tr} Wdh` + (top ? " (mehr!)" : ""),
  };
}
