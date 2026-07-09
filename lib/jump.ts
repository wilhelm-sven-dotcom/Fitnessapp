/**
 * Der Zünd-Check: Countermovement-Jump per DeviceMotion. Das iPhone wird an
 * die Brust gehalten, ein Strecksprung — im Beschleunigungssignal ist die
 * Flugphase ein Fenster nahe 0 g (freier Fall). Aus der Flugzeit folgt die
 * Sprunghöhe: h = g·t²/8.
 *
 * Reale Signale sind ruppig: Zittern und Grip-Wackeln erzeugen Ausreißer
 * MITTEN in der Flugphase, die ein naives Schwellen-Fenster zerhacken.
 * Deshalb: 3-Sample-Glättung, großzügigere Schwelle, kurze Lücken werden
 * überbrückt — und ein harter Beschleunigungs-Spike (Landung) beendet das
 * Fenster immer sofort.
 */

export interface JumpSample {
  /** Zeitstempel in ms (performance.now()). */
  t: number;
  /** Betrag der Beschleunigung inkl. Gravitation, m/s². */
  a: number;
}

export interface JumpResult {
  heightCm: number;
  flightMs: number;
}

/** Diagnose fürs Fehlschlag-Feedback (was hat der Sensor gesehen?). */
export interface JumpStats {
  samples: number;
  minA: number;
  maxA: number;
  /** Längstes gefundenes Flug-Fenster in ms (auch wenn unplausibel). */
  bestWindowMs: number;
}

export interface JumpAnalysis {
  result: JumpResult | null;
  stats: JumpStats;
}

export interface JumpEntry {
  date: string; // ISO
  heightCm: number;
}

/** Unter dieser (geglätteten) Schwelle gilt das Signal als Flugphase. */
const FREEFALL_MS2 = 6;
/** Ein Spike darüber ist sicher Landung/Absprung — beendet das Fenster hart. */
const IMPACT_MS2 = 16;
/** So lange darf das Signal INNERHALB eines Flug-Fensters über der Schwelle
 *  zittern, ohne dass das Fenster abbricht. */
const MAX_GAP_MS = 110;
const MIN_FLIGHT_MS = 150; // < 2,8 cm — kein echter Sprung
const MAX_FLIGHT_MS = 800; // > 78 cm — Messartefakt
const G = 9.81;

/** Gleitendes 3er-Mittel gegen Sensor-Rauschen. */
function smooth(samples: JumpSample[]): JumpSample[] {
  return samples.map((s, i) => {
    const a0 = samples[i - 1]?.a ?? s.a;
    const a1 = samples[i + 1]?.a ?? s.a;
    return { t: s.t, a: (a0 + s.a + a1) / 3 };
  });
}

/** Flugphase finden (glatt + lückentolerant) und in Sprunghöhe übersetzen. */
export function analyzeJump(raw: JumpSample[]): JumpAnalysis {
  const stats: JumpStats = {
    samples: raw.length,
    minA: raw.length ? Math.round(Math.min(...raw.map((s) => s.a)) * 10) / 10 : 0,
    maxA: raw.length ? Math.round(Math.max(...raw.map((s) => s.a)) * 10) / 10 : 0,
    bestWindowMs: 0,
  };
  if (raw.length < 10) return { result: null, stats };
  const samples = smooth(raw);

  let bestDur = 0;
  let start = -1; // Index des Fensterbeginns
  let gapSince = -1; // Zeitpunkt, seit dem das Signal über der Schwelle liegt

  const closeWindow = (endT: number) => {
    if (start < 0) return;
    const dur = endT - samples[start].t;
    if (dur > bestDur) bestDur = dur;
    start = -1;
    gapSince = -1;
  };

  for (let i = 0; i < samples.length; i++) {
    const { t, a } = samples[i];
    if (a < FREEFALL_MS2) {
      if (start < 0) start = i;
      gapSince = -1;
      if (i === samples.length - 1) closeWindow(t);
      continue;
    }
    if (start < 0) continue;
    // Über der Schwelle innerhalb eines Fensters: harter Spike beendet
    // sofort (Landung), kurzes Zittern wird überbrückt.
    if (a >= IMPACT_MS2) {
      closeWindow(t);
      continue;
    }
    if (gapSince < 0) gapSince = t;
    if (t - gapSince > MAX_GAP_MS) closeWindow(gapSince);
  }

  stats.bestWindowMs = Math.round(bestDur);
  if (bestDur < MIN_FLIGHT_MS || bestDur > MAX_FLIGHT_MS) return { result: null, stats };
  const tSec = bestDur / 1000;
  const heightCm = Math.round(((G * tSec * tSec) / 8) * 1000) / 10;
  if (heightCm < 3 || heightCm > 80) return { result: null, stats };
  return { result: { heightCm, flightMs: Math.round(bestDur) }, stats };
}

/** Kompatibler Kurzweg: nur das Ergebnis. */
export function detectJump(samples: JumpSample[]): JumpResult | null {
  return analyzeJump(samples).result;
}

/** Mittel der letzten 7 Tage (mindestens 2 Messungen, sonst null). */
export function jumpBaseline(jumps: JumpEntry[], ref: Date = new Date()): number | null {
  const cutoff = ref.getTime() - 7 * 86400000;
  const recent = jumps.filter((j) => {
    const t = new Date(j.date).getTime();
    return Number.isFinite(t) && t >= cutoff && j.heightCm > 0;
  });
  if (recent.length < 2) return null;
  return recent.reduce((s, j) => s + j.heightCm, 0) / recent.length;
}

export type JumpBand = "low" | "mid" | "high";

/** Ampel gegen den eigenen Schnitt: ≥ +3 % stark, ≤ −5 % geschont, sonst normal. */
export function jumpBand(heightCm: number, baseline: number | null): JumpBand | null {
  if (!baseline || baseline <= 0) return null;
  const d = heightCm / baseline - 1;
  return d <= -0.05 ? "low" : d >= 0.03 ? "high" : "mid";
}
