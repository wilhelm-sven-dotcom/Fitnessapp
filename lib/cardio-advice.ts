import { hoursSince, lastRide, weeklyCardio } from "@/lib/cardio";
import type { CardioSession } from "@/lib/types";

/** How strongly recent cardio should temper today's leg training. */
export type CardioAdviceLevel = "none" | "ease" | "spare";

export interface CardioAdvice {
  level: CardioAdviceLevel;
  /** Suggested leg-pattern load factor — surfaced as a suggestion, never auto-applied. */
  legLoadMult: number;
  hoursSinceRide?: number;
  lastIntensity?: CardioSession["intensity"];
  weeklyCount: number;
  weeklyMin: number;
  title: string;
  body: string;
}

const NONE = (weeklyCount: number, weeklyMin: number): CardioAdvice => ({
  level: "none",
  legLoadMult: 1,
  weeklyCount,
  weeklyMin,
  title: "",
  body: "",
});

/**
 * Turn the cardio history into a concrete training recommendation, grounded in
 * the concurrent-training interference effect: hard cycling blunts lower-body
 * strength/hypertrophy, most strongly within ~24 h (cycling < running, but still
 * meaningful — 2024 meta-analyses). Pure and suggestion-only: the returned
 * `legLoadMult` is shown to the user, never silently applied.
 */
export function cardioAdvice(cardio: CardioSession[], ref: Date = new Date()): CardioAdvice {
  const wk = weeklyCardio(cardio, ref);
  const lr = lastRide(cardio);
  if (!lr) return NONE(wk.count, wk.minutes);

  const h = Math.round(hoursSince(lr.date, ref));
  const intensity = lr.intensity ?? "moderate";
  const whenText = h <= 1 ? "gerade eben" : h < 24 ? `vor ${h} h` : `vor ${Math.round(h / 24)} Tg`;
  const weekText = wk.count > 0 ? ` Diese Woche: ${wk.count} Fahrten · ${wk.minutes} Min.` : "";

  // Hard ride within a day → spare the legs noticeably.
  if (intensity === "hard" && h <= 24)
    return {
      level: "spare",
      legLoadMult: 0.9,
      hoursSinceRide: h,
      lastIntensity: intensity,
      weeklyCount: wk.count,
      weeklyMin: wk.minutes,
      title: "Beine heute schonen",
      body: `Harte Fahrt ${whenText} — die Beinkraft ist noch müde. Heute Oberkörper vorziehen oder Beine ~10 % leichter und sauber.${weekText}`,
    };

  // Hard ride yesterday, or a moderate ride today → take legs a touch lighter.
  if ((intensity === "hard" && h <= 48) || (intensity === "moderate" && h <= 24))
    return {
      level: "ease",
      legLoadMult: 0.95,
      hoursSinceRide: h,
      lastIntensity: intensity,
      weeklyCount: wk.count,
      weeklyMin: wk.minutes,
      title: "Beine leicht antasten",
      body: `${intensity === "hard" ? "Harte" : "Moderate"} Fahrt ${whenText} — Beine etwas leichter beginnen und nach Gefühl steigern.${weekText}`,
    };

  return NONE(wk.count, wk.minutes);
}
