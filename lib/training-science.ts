/**
 * Evidence-based training principles, in one place, so the engine, the coach
 * and the session builder all reason from the same current sports-science
 * consensus. Numbers are deliberately conservative midpoints of the recent
 * literature — see the citations in the comments.
 */

/**
 * Weekly hard sets per muscle (volume landmarks). Pelland et al. 2024
 * (67 studies, n≈2058): more volume → more growth with diminishing returns;
 * MEV ≈ 4–8, productive range ≈ 10–20, beyond ≈ 20–22 rarely adds and costs
 * recovery. We use the practical midpoints below.
 */
export const VOLUME_LANDMARKS = {
  /** Minimum effective volume — below this a muscle barely grows. */
  mev: 6,
  /** Solid growth target. */
  target: 10,
  /** Maximum adaptive volume — top of the productive range. */
  mav: 20,
  /** Beyond this is likely junk volume / overreaching. */
  mrv: 22,
} as const;

export type VolumeBucket = "low" | "maintain" | "optimal" | "high" | "excess";

/** Classify a muscle's weekly set count against the landmarks. */
export function volumeBucket(sets: number): VolumeBucket {
  const { mev, target, mav, mrv } = VOLUME_LANDMARKS;
  if (sets < mev) return "low";
  if (sets < target) return "maintain";
  if (sets <= mav) return "optimal";
  if (sets <= mrv) return "high";
  return "excess";
}

export const VOLUME_BUCKET_LABEL: Record<VolumeBucket, string> = {
  low: "zu wenig",
  maintain: "Erhalt",
  optimal: "Wachstum",
  high: "viel",
  excess: "zu viel",
};

/**
 * Compact, German principle block injected into the coach and builder system
 * prompts. Keeps the AI's suggestions anchored to current evidence and to this
 * athlete's constraints (hypertrophy, 3× full-body, sensitive lower back, Peloton).
 */
export const TRAINING_PRINCIPLES = `Evidenzbasierte Trainingsprinzipien (aktuelle Studienlage — halte dich daran):
- Volumen: ${VOLUME_LANDMARKS.target}–${VOLUME_LANDMARKS.mav} harte Sätze pro Muskel und Woche sind der produktive Bereich. Ab ~${VOLUME_LANDMARKS.mev} Sätzen wächst etwas, unter ${VOLUME_LANDMARKS.mev} reicht es kaum, über ${VOLUME_LANDMARKS.mrv} bringt selten mehr und kostet Erholung (Pelland 2024). Priorisiere unterversorgte Muskeln.
- Nähe zum Muskelversagen: die letzten Arbeitssätze 0–3 Wdh vor dem Versagen (RIR 0–3), der Großteil bei RIR 1–2. Näher dran hilft etwas, flacht aber ab ~2 RIR ab (Robinson 2024) — nicht stur bis zum Versagen.
- Progressive Überlastung per doppelter Progression: erst Wiederholungen in der Spanne hochfahren, dann Gewicht.
- Frequenz: jeden Muskel ~2×/Woche treffen; bei 3× Ganzkörper automatisch erfüllt.
- Pausen: Grundübungen 2–3 Min, Isolation/Core kürzer (~60–90 s).
- Lengthened-Fokus: Übungen, die den Muskel unter Last in der gedehnten Position fordern, bevorzugen — neuere Evidenz spricht dafür.
- Cardio-Interferenz: hartes Radfahren (Peloton) mindert die Beinkraft-Entwicklung, v. a. < 24 h davor. Nach harter Fahrt Beine leichter nehmen oder Oberkörper vorziehen.
- Rücken (falls empfindlich): nicht dauerhaft meiden, sondern kontrolliert progressiv belasten — neutrale Wirbelsäule, moderat starten und steigern; schwere Hinges und belastete Flexion bewusst dosieren. Progressive Belastung stärkt den Rücken nachweislich (JOSPT 2024).
- Erfahrung & Individualität: Volumen an den Stand anpassen (Anfänger untere Spanne + Technik, Erfahrene vertragen/brauchen mehr); bei Stillstand mehr Volumen testen — die Reaktion ist individuell.
- Autoregulation: Last und Sätze nach Tagesform und RIR steuern statt starrer Prozente (Netz-Metaanalyse 2025).`;
