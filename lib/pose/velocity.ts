import type { RepSample } from "@/lib/pose/rep-counter";

/**
 * Velocity-Based Training per Kamera: Die Geschwindigkeit jeder Wiederholung
 * (Bewegungsumfang / konzentrische Dauer) fällt mit zunehmender Ermüdung —
 * der Velocity-Loss über den Satz ist der härteste bekannte Marker für echte
 * Grenznähe. Alles relativ zur eigenen besten Rep des Satzes, daher ohne
 * Kalibrierung robust. Pur und unit-testbar.
 */

export interface VelocityRead {
  /** Tempoverlust der letzten Reps gegenüber der besten, 0..100 %. */
  velLossPct: number;
  /** Daraus geschätztes RIR (0..4) — Vorbefüllung, von Hand übersteuerbar. */
  estRir: number;
  /** Geschwindigkeit je Rep (Grad/s), zur Anzeige. */
  perRep: number[];
}

const MIN_CONC_MS = 200; // schneller = Messartefakt
const MAX_CONC_MS = 5000; // langsamer = Pause/Absetzen
const MIN_ROM = 5; // Grad — kleiner = Zittern, keine Rep

function speeds(history: RepSample[]): number[] {
  return history
    .filter((r) => r.concMs >= MIN_CONC_MS && r.concMs <= MAX_CONC_MS && r.rom >= MIN_ROM)
    .map((r) => r.rom / (r.concMs / 1000));
}

/** Verlust-Anteil (0..1) der letzten Rep gegenüber der besten frühen Rep —
 *  fürs Live-Signal während des Satzes. Null, solange < 3 saubere Reps. */
export function liveVelocityLoss(history: RepSample[]): number | null {
  const v = speeds(history);
  if (v.length < 3) return null;
  const best = Math.max(...v.slice(0, 3));
  if (best <= 0) return null;
  return Math.max(0, 1 - v[v.length - 1] / best);
}

/** Satz-Auswertung: mittlerer Verlust der letzten beiden Reps → RIR-Schätzung.
 *  Schwellen nach der üblichen VBT-Staffel (~10 % ≈ RIR 3, ~35 % ≈ RIR 0). */
export function velocityRead(history: RepSample[]): VelocityRead | null {
  const v = speeds(history);
  if (v.length < 3) return null;
  const best = Math.max(...v.slice(0, 3));
  if (best <= 0) return null;
  const endAvg = (v[v.length - 1] + v[v.length - 2]) / 2;
  const loss = Math.max(0, 1 - endAvg / best);
  const estRir = loss >= 0.35 ? 0 : loss >= 0.25 ? 1 : loss >= 0.15 ? 2 : loss >= 0.08 ? 3 : 4;
  return {
    velLossPct: Math.round(loss * 100),
    estRir,
    perRep: v.map((x) => Math.round(x)),
  };
}
