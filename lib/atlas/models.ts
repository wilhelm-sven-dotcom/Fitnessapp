/**
 * Zentrale Modell-Wahl für alle ATLAS-Endpunkte. Ein Ort statt fünf
 * Hartkodierungen; per Env überschreibbar (z. B. fürs Ausprobieren neuer
 * Modelle ohne Deploy-Änderung am Code).
 */

/** Planung, Chat, Debrief, Rapport — Qualität zählt. */
export const ATLAS_MODEL = process.env.ATLAS_MODEL || "claude-opus-5";

/** Live-Reaktion auf einzelne Sätze — Latenz zählt. */
export const ATLAS_FAST_MODEL = process.env.ATLAS_FAST_MODEL || "claude-sonnet-5";
