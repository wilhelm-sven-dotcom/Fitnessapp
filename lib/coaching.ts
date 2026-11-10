import { pauseStufe } from "@/lib/progression";

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
  // Dieselben Stufen wie die Vorschläge im Training (`pauseStufe`).
  const pause = pauseStufe(opts.daysAgo);
  if (pause === "leichter") {
    chips.push({ tone: "info", text: "Lange pausiert. Wir starten heute 10 % leichter." });
  } else if (pause === "ruhig") {
    chips.push({ tone: "info", text: "Länger pausiert. Wir steigen heute ruhig ein." });
  }
  if (opts.weekCount >= 3) {
    chips.push({ tone: "emerald", text: "Starke Woche. Ein Ruhetag tut den Muskeln gut." });
  }
  return chips;
}
