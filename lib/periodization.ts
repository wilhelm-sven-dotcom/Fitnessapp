import type { FatigueBand } from "@/lib/fatigue";
import type { AppSettings } from "@/lib/types";

/**
 * Lightweight periodization: where you are in a ~6-week training block and when
 * a deload is due. Blocks accumulate volume (Aufbau), intensify (Kraft), then
 * unload (Entlastung). A deload is recommended on the 6-week cadence or earlier
 * when the fatigue index spikes — never right after one. Suggestion-only; the
 * athlete confirms (sets lastDeloadDate).
 */

export type Phase = "aufbau" | "intensiv" | "entlastung";

export interface PhaseState {
  phase: Phase;
  weeksSinceDeload: number; // Infinity if never deloaded
  cycleWeek: number; // 1..cycleLength
  cycleLength: number;
  due: boolean; // deload recommended now
  title: string;
  focus: string;
}

const DAY = 86_400_000;
const CYCLE = 6;

export function weeksSinceDeload(settings: AppSettings, ref: Date = new Date()): number {
  if (!settings.lastDeloadDate) return Infinity;
  return (ref.getTime() - new Date(settings.lastDeloadDate).getTime()) / (7 * DAY);
}

const COPY: Record<Phase, { title: string; focus: string }> = {
  aufbau: {
    title: "Aufbau-Phase",
    focus: "Volumen sammeln, RIR 1–2, Last & Wiederholungen sauber steigern.",
  },
  intensiv: {
    title: "Kraft-Phase",
    focus: "Schwerer werden: RIR 0–1, etwas weniger Wiederholungen, voller Fokus.",
  },
  entlastung: {
    title: "Entlastungswoche",
    focus: "~60 % Last, ein Satz weniger — Erholung für den nächsten Sprung.",
  },
};

/**
 * @param historyWeeks weeks of training history — used when never deloaded, so a
 *   beginner isn't told to deload after two sessions.
 */
export function phaseState(
  settings: AppSettings,
  fatigueBand?: FatigueBand,
  historyWeeks = 0,
  ref: Date = new Date(),
): PhaseState {
  const sinceDeload = weeksSinceDeload(settings, ref);
  const eff = isFinite(sinceDeload) ? sinceDeload : historyWeeks;
  const recentlyDeloaded = sinceDeload < 2;
  const due = !recentlyDeloaded && (eff >= CYCLE || (fatigueBand === "hoch" && eff >= 3));
  const cycleWeek = Math.max(1, Math.min(Math.floor(eff) + 1, CYCLE));
  let phase: Phase;
  if (due) phase = "entlastung";
  else if (cycleWeek <= 3) phase = "aufbau";
  else phase = "intensiv";
  return {
    phase,
    weeksSinceDeload: sinceDeload,
    cycleWeek,
    cycleLength: CYCLE,
    due,
    ...COPY[phase],
  };
}
