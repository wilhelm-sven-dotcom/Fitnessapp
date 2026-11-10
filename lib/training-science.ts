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
 * Kompakter Prinzipien-Block für ATLAS (Plan und Chat). Hält die Vorschläge an
 * der aktuellen Studienlage fest. Er steht im festen, gecachten Teil des
 * System-Prompts und gilt für jeden Nutzer: nichts Persönliches (Geräte,
 * Verletzungen, Sportarten) gehört hier hinein — das kommt je Anfrage mit dem
 * Profil und den Trainingsdaten.
 */
export const TRAINING_PRINCIPLES = `Trainingsprinzipien, nach denen die App plant (Stand der Studienlage):
- Volumen: ${VOLUME_LANDMARKS.target} bis ${VOLUME_LANDMARKS.mav} harte Sätze pro Muskel und Woche sind der produktive Bereich. Ab etwa ${VOLUME_LANDMARKS.mev} Sätzen wächst etwas, darunter reicht es kaum, über ${VOLUME_LANDMARKS.mrv} bringt selten mehr und kostet Erholung (Pelland 2024). Unterversorgte Muskeln haben Vorrang.
- Nähe zum Muskelversagen: Arbeitssätze enden 0 bis 3 Wiederholungen vor dem Versagen (RIR 0 bis 3), der Großteil bei RIR 1 bis 2. Näher dran hilft etwas, der Zugewinn flacht ab etwa RIR 2 ab (Robinson 2024).
- Progressive Überlastung als doppelte Progression: erst die Wiederholungen in der Spanne hochfahren, dann das Gewicht.
- Frequenz: jeden Muskel etwa zweimal pro Woche treffen. Mit drei Ganzkörper-Einheiten ist das erfüllt.
- Pausen: Grundübungen 2 bis 3 Minuten, eingelenkige Übungen und Rumpf kürzer (60 bis 90 Sekunden).
- Gedehnte Position: Übungen, die den Muskel unter Last in der Dehnung fordern, sind nach neuerer Evidenz im Vorteil.
- Ausdauer und Kraft: hartes Ausdauertraining (Rad, Lauf, Intervalle) bremst die Beinkraft, vor allem in den 24 Stunden davor. Nach einer harten Ausdauer-Einheit die Beine leichter nehmen oder den Oberkörper vorziehen.
- Empfindlicher Rücken: nicht dauerhaft meiden, sondern kontrolliert und steigend belasten, mit neutraler Wirbelsäule und moderatem Einstieg; schwere Hüftbeugen und belastete Beugung bewusst dosieren (JOSPT 2024).
- Erfahrung: Volumen an den Stand anpassen. Anfänger bleiben in der unteren Spanne und üben Technik, Erfahrene vertragen und brauchen mehr. Bei Stillstand mehr Volumen testen; die Reaktion ist individuell.
- Autoregulation: Last und Sätze nach Tagesform und RIR steuern statt nach starren Prozenten (Netzwerk-Metaanalyse 2025).`;
