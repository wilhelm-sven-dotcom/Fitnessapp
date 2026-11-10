import type {
  Exercise,
  InjuryArea,
  LastPerf,
  Prescription,
  PrescReason,
  SetEntry,
} from "@/lib/types";
import { istGeraeteUebung, MASCHINEN_KEYS } from "@/lib/exercises";
import { fmtGewicht } from "@/lib/format";

const stufe = (step?: number) => (step && step > 0 ? step : 2.5);

/** Round to the user's smallest available weight increment (default 2.5 kg). */
export const roundStep = (x: number, step = 2.5) => {
  const s = stufe(step);
  return Math.round(x / s) * s;
};

/**
 * Die nächste ladbare Stufe ÜBER bzw. UNTER einem Gewicht, auf dem Raster der
 * eingestellten Gewichtsstufe. Vorher stieg und fiel das Gewicht immer um
 * 2,5 kg und wurde dann aufs Raster gerundet — bei einer 5-kg-Stufe (Stapel
 * am Gerät) rundete „etwas leichter“ so auf dasselbe Gewicht zurück.
 */
export function stufeHoch(w: number, step = 2.5): number {
  const s = stufe(step);
  return (Math.floor(w / s + 1e-9) + 1) * s;
}

export function stufeRunter(w: number, step = 2.5): number {
  const s = stufe(step);
  return Math.max(s, (Math.ceil(w / s - 1e-9) - 1) * s);
}

/**
 * Einstieg nach einer Trainingslücke (Tage seit der letzten Einheit):
 * bis 13 Tage normal weiter, ab 14 Tagen „ruhig“ (gleiches Gewicht, unterste
 * Wiederholungszahl), ab 28 Tagen „leichter“ (10 % weniger, unterste
 * Wiederholungszahl). Kraft hält sich zwei bis drei Wochen; die alte Grenze
 * von 6 Tagen bremste schon nach einer normalen Wochenpause.
 */
export type PauseStufe = "ruhig" | "leichter";
export const PAUSE_RUHIG_AB_TAGEN = 14;
export const PAUSE_LEICHTER_AB_TAGEN = 28;
const PAUSE_LEICHTER_FAKTOR = 0.9;

export function pauseStufe(daysAgo: number | null | undefined): PauseStufe | undefined {
  if (daysAgo == null || !Number.isFinite(daysAgo)) return undefined;
  if (daysAgo >= PAUSE_LEICHTER_AB_TAGEN) return "leichter";
  if (daysAgo >= PAUSE_RUHIG_AB_TAGEN) return "ruhig";
  return undefined;
}

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

/** Alt-Token → EquipKey (Bestandsdaten und eigene Übungen bleiben gültig). */
const REQ_ALIAS: Record<string, string> = { dumbbell: "db", kettlebell: "kb" };

/** Pseudo-Key in `has()`: der Ort plant nur an Geräten (Maschinen + Kabelzug).
 *  So greift die Regel überall, wo `reqOk` filtert — Basisplan, ATLAS-Anfrage,
 *  Tauschen, Zähler —, ohne dass jede Stelle den Ort kennen muss. */
export const NUR_GERAETE = "nur-geraete";

export function reqOk(ex: Exercise, has: (k: string) => boolean): boolean {
  if (has(NUR_GERAETE) && ex.pattern !== "cardio" && !istGeraeteUebung(ex)) return false;
  return (ex.req || ["none"]).every((tok) => {
    if (tok === "none") return true;
    if (tok === "weight") return has("db") || has("kb") || has("bar");
    // Alt: eine eigene Übung „an einer Maschine“ — irgendein Gerät genügt.
    if (tok === "machine") return MASCHINEN_KEYS.some((k) => has(k));
    return has(REQ_ALIAS[tok] ?? tok);
  });
}

export function poolFor(
  pattern: string,
  has: (k: string) => boolean,
  allLib: Exercise[],
  /** Deaktivierte Übungs-Ids — nur die PLANUNGS-Pfade filtern damit. */
  blocked?: ReadonlySet<string>,
): Exercise[] {
  return allLib.filter(
    (e) => e.pattern === pattern && reqOk(e, has) && !blocked?.has(e.id),
  );
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
 * RIR = Wiederholungen in Reserve: HOHES RIR heißt "zu leicht", RIR 0 heißt
 * "am Versagen". Ziel-Zone laut Trainingsprinzipien ist RIR 1–2.
 *
 * Mit Gewicht (doppelte Progression, eine Gewichtsstufe je Schritt):
 *  · alle Sätze mit ≥ 3 in Reserve                        → eine Stufe hoch
 *  · alle Sätze an der oberen Wiederholungsgrenze, ≥ 1
 *    in Reserve                                           → eine Stufe hoch
 *  · alle Sätze oben, aber ein Satz am Versagen (RIR 0)   → halten
 *  · sonst ein Satz am Versagen                           → eine Stufe leichter
 *  · sonst (Zone 1–2, noch nicht oben)                    → halten, +1 Wdh
 * Vorher stieg das Gewicht NUR bei ≥ 3 in Reserve: wer oben in der Spanne
 * sauber in der Ziel-Zone trainierte, blieb auf dem Gewicht stehen.
 *
 * Timed: gefühlte Intensität 1–5 statt RIR (≤2 = leicht → +5 s halten).
 */
export function rirAdjust(ex: Exercise, sets: SetEntry[], step = 2.5): RirResult | null {
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
  // Der härteste Satz bestimmt: minRir 0 = Versagen berührt, minRir ≥ 3 =
  // selbst der schwerste Satz hatte noch viel Luft.
  const minRir = Math.min(...rirs);

  if (ex.weighted) {
    // Ohne Gewichts-Historie gibt es keine sinnvolle kg-Empfehlung —
    // Rückfall auf die Wiederholungs-Heuristik in `presc` (nie "@ 0 kg").
    if (!lastW) return null;
    // „Oben“ heißt: jeder geleistete Arbeitssatz erreicht die obere Grenze —
    // mindestens zwei Sätze (ein einzelner Satz ist kein Beleg), außer der
    // Plan sieht selbst nur einen vor.
    const voll = work.filter((s) => s.reps !== "" && s.reps != null);
    const oben =
      voll.length >= Math.min(2, Math.max(1, ex.sets)) &&
      voll.every((s) => (Number(s.reps) || 0) >= ex.repHigh);
    if (minRir >= 3 || (oben && minRir >= 1))
      return { weight: stufeHoch(lastW, step), repTarget: ex.repLow, reason: "up" };
    if (minRir === 0) {
      if (oben) return { weight: lastW, repTarget: ex.repHigh, reason: "hold" };
      return { weight: stufeRunter(lastW, step), repTarget: ex.repLow, reason: "down" };
    }
    return {
      weight: lastW,
      repTarget: Math.min(ex.repHigh, maxReps + 1),
      reason: "rep",
    };
  }

  // Bodyweight reps: can only progress reps.
  if (minRir >= 3)
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
  opts: {
    /** Einstieg nach einer Trainingslücke — siehe `pauseStufe`. */
    pause?: PauseStufe;
    loadMult?: number;
    cap?: boolean;
    step?: number;
    /** Startgewichts-Schätzung für Übungen ohne Historie (lib/start-weight) —
     *  der Aufrufer rechnet, damit progression ↔ start-weight zyklusfrei bleibt. */
    startW?: number;
  } = {},
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
    // Ohne Historie, aber mit Schätzung: konservativer Vorschlag statt leerem
    // Feld — Tagesform/Deload (loadMult) greifen auch hier.
    if (weighted && !timed && opts.startW && opts.startW > 0) {
      const w = scaleW(opts.startW);
      if (w > 0) {
        const r = repOf(ex.repHigh);
        return {
          w: String(w),
          r: String(r),
          suggestedWeight: w,
          reason: "start",
          line: `Heute: ${ex.sets} × ${ex.repLow}–${ex.repHigh} · Vorschlag ${fmtGewicht(w)} kg — Startgewicht, 2–3 Wdh im Tank`,
        };
      }
    }
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

  // Eased entry after a long break — don't push, just get moving. Ab vier
  // Wochen zusätzlich 10 % leichter.
  if (opts.pause) {
    const leichter = opts.pause === "leichter";
    const vorweg = leichter ? "Nach langer Pause 10 % leichter" : "Ruhig einsteigen";
    if (timed)
      return {
        w: "",
        r: String(Math.max(ex.repLow, maxReps)),
        reason: "lighter",
        line: `${vorweg}: ${ex.sets} × ${Math.max(ex.repLow, maxReps)} s`,
      };
    if (weighted) {
      const w = scaleW(lastW * (leichter ? PAUSE_LEICHTER_FAKTOR : 1));
      return {
        w: lastW ? String(w) : "",
        r: String(ex.repLow),
        suggestedWeight: lastW ? w : undefined,
        reason: "lighter",
        line: `${vorweg}: ${ex.sets} × ${ex.repLow} @ ${lastW ? fmtGewicht(w) : "?"} kg`,
      };
    }
    return {
      w: "",
      r: String(Math.max(ex.repLow, maxReps)),
      reason: "lighter",
      line: `${vorweg}: ${ex.sets} × ${Math.max(ex.repLow, maxReps)} Wdh`,
    };
  }

  const adj = rirAdjust(ex, work, opts.step);
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
        line: `Heute: ${ex.sets} × ${r} @ ${fmtGewicht(w)} kg${note}`,
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
      const w = scaleW(stufeHoch(lastW, opts.step));
      const r = repOf(ex.repLow);
      return {
        w: String(w),
        r: String(r),
        suggestedWeight: w,
        reason: "up",
        line: `Heute: ${ex.sets} × ${r} @ ${fmtGewicht(w)} kg${opts.cap ? "" : " — hoch!"}`,
      };
    }
    const tr = repOf(Math.min(ex.repHigh, maxReps + 1));
    const w = scaleW(lastW);
    return {
      w: lastW ? String(w) : "",
      r: String(tr),
      suggestedWeight: lastW ? w : undefined,
      reason: "rep",
      line: `Heute: ${ex.sets} × ${tr} @ ${lastW ? fmtGewicht(w) : "?"} kg`,
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
