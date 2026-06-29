import { isFilled, sessionVolume, workSets } from "@/lib/stats";
import type { CardioSession, LoggedSession } from "@/lib/types";

/**
 * Belastungs-Index — a forward-looking load monitor. Built on the acute:chronic
 * workload ratio (ACWR): this week's load vs. the trailing 4-week average. A
 * ratio well above the chronic baseline means a sharp spike (injury/overreach
 * risk); around 1 is "trained for this". Strength load = session tonnage scaled
 * by effort (RIR), cardio adds its energy (kJ); recent low readiness nudges it
 * up. This is an evidence-flavoured heuristic, not a medical metric — and it
 * stays neutral until there's a real chronic baseline to compare against.
 */

export type FatigueBand = "frisch" | "normal" | "erhöht" | "hoch";

export interface FatigueState {
  ratio: number; // acute : chronic-weekly
  acute: number; // last 7 days load
  chronic: number; // trailing weekly average
  band: FatigueBand;
  title: string;
  message: string;
  enough: boolean; // enough history for the ratio to mean anything
}

const DAY = 86_400_000;

function avgSessionRir(s: LoggedSession): number | null {
  const rirs: number[] = [];
  for (const ex of s.exercises || [])
    for (const st of workSets(ex.sets || [])) if (st.rir != null && isFilled(st)) rirs.push(st.rir);
  return rirs.length ? rirs.reduce((a, b) => a + b, 0) / rirs.length : null;
}

/** Effort multiplier — sets taken closer to failure (low RIR) cost more. */
function effortMult(rir: number | null): number {
  if (rir == null) return 1;
  if (rir <= 0.5) return 1.15;
  if (rir <= 1.5) return 1.05;
  if (rir <= 2.5) return 0.95;
  return 0.85;
}

function strengthLoad(s: LoggedSession): number {
  const base = sessionVolume(s) / 1000; // tonnes
  return base * effortMult(avgSessionRir(s)) * (s.isDeload ? 0.6 : 1);
}

function cardioLoad(c: CardioSession): number {
  const kj = c.kj ?? (c.durationSec / 60) * 8; // ~8 kJ/min fallback
  const intens = c.intensity === "hard" ? 1.2 : c.intensity === "easy" ? 0.85 : 1;
  return (kj / 1000) * 1.5 * intens;
}

const COPY: Record<FatigueBand, { title: string; message: string }> = {
  frisch: { title: "Belastung niedrig", message: "Viel Erholung im Tank — du kannst zulegen." },
  normal: { title: "Belastung normal", message: "Im grünen Bereich. Weiter so." },
  erhöht: { title: "Belastung erhöht", message: "Die akute Last zieht an — auf Schlaf, Technik und Satzzahl achten." },
  hoch: { title: "Belastung hoch", message: "Deutlich über deinem Schnitt — plan einen leichteren Tag oder Deload." },
};

export function fatigueState(
  log: LoggedSession[],
  cardio: CardioSession[] = [],
  ref: Date = new Date(),
): FatigueState {
  const now = ref.getTime();
  let acute = 0;
  let chronic = 0;
  const add = (dateStr: string, load: number) => {
    const age = (now - new Date(dateStr).getTime()) / DAY;
    if (age < 0) return;
    if (age <= 7) acute += load;
    if (age <= 28) chronic += load;
  };
  for (const s of log) add(s.date, strengthLoad(s));
  for (const c of cardio) add(c.date, cardioLoad(c));
  const chronicWeekly = chronic / 4;

  const oldest = [...log, ...cardio].reduce(
    (min, x) => Math.min(min, new Date(x.date).getTime()),
    now,
  );
  const spanDays = (now - oldest) / DAY;
  const enough = spanDays >= 14 && chronicWeekly > 0;

  const ratio = chronicWeekly > 0 ? acute / chronicWeekly : 0;
  const recent = log
    .filter((s) => s.readiness)
    .slice(-3)
    .map((s) => s.readiness!.score);
  const readyAvg = recent.length ? recent.reduce((a, b) => a + b, 0) / recent.length : null;

  const order: FatigueBand[] = ["frisch", "normal", "erhöht", "hoch"];
  let band: FatigueBand;
  if (!enough) band = "normal";
  else if (ratio < 0.8) band = "frisch";
  else if (ratio < 1.3) band = "normal";
  else if (ratio < 1.6) band = "erhöht";
  else band = "hoch";
  // Persistently low readiness shifts the picture one step toward more fatigue.
  if (enough && readyAvg != null && readyAvg < 0.45 && band !== "hoch") {
    band = order[order.indexOf(band) + 1];
  }

  const message = !enough
    ? "Noch zu wenig Verlauf für eine echte Belastungs-Kurve — sie baut sich auf."
    : COPY[band].message;
  return { ratio: enough ? ratio : 1, acute, chronic: chronicWeekly, band, title: COPY[band].title, message, enough };
}
