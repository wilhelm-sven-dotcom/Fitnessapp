export type ChipTone = "amber" | "emerald" | "info";
export interface Chip {
  tone: ChipTone;
  text: string;
}

/** Cardio-interference level (mirrors lib/cardio-advice CardioAdvice.level). */
export type CardioLevel = "none" | "ease" | "spare";

/** Cues shown on the home screen. */
export function homeChips(opts: { daysAgo: number | null; weekCount: number }): Chip[] {
  const chips: Chip[] = [];
  if (opts.daysAgo != null && opts.daysAgo > 5) {
    chips.push({ tone: "info", text: "Länger pausiert — wir starten heute leichter." });
  }
  if (opts.weekCount >= 3) {
    chips.push({ tone: "emerald", text: "Starke Woche. Ein Ruhetag tut den Muskeln gut." });
  }
  return chips;
}
