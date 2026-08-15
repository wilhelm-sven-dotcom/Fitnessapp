/**
 * Kurze Signaltöne über die Web Audio API — Countdown-Ticks und Ende-Signale
 * im geführten Aufwärmen und in der Satzpause. iOS gibt Audio erst nach einer
 * User-Geste frei: `primeAudio()` in einem Tap-Handler aufrufen (erzeugt
 * den AudioContext und weckt ihn); danach spielen `beep()`/`beepEnd()`
 * auch aus Timern heraus. Ohne Support oder vor dem Priming: leiser No-op.
 *
 * Klang-Rezept (gegen Musik-Maskierung, z. B. Spotify daneben):
 * Triangle-Oszillator + Lowpass (3·f, Q 0.8) — die ungeradzahligen Obertöne
 * schneiden durch den Mix, der Filter hält den „Sportsystem-Klick" statt
 * Alarm-Geschrei. Grundton 1568 Hz (G6) liegt im Empfindlichkeitsmaximum des
 * Ohrs und über dem Energieschwerpunkt typischer Musik; der Tick ist ein
 * Doppel-Puls (zeitliche Musterung überlebt Maskierung besser als ein
 * längerer Einzelton). Ein DynamicsCompressor als Master-Bus fängt Spitzen,
 * wenn sich Töne auf Stufe „Max" überlagern.
 */
let ctx: AudioContext | null = null;
let master: DynamicsCompressorNode | null = null;

// Globaler Lautstärke-Multiplikator für alle Signaltöne (0 = stumm … 3 = laut).
// 1 = die ursprünglich fest verdrahtete Lautstärke. Wird aus den App-Settings
// (`cueVolume`) gespeist, damit der Countdown auch neben lauter Musik hörbar ist.
let cueVolume = 1;

/** Signalton-Lautstärke setzen (0–3; 1 = Standard). Ungültige Werte → 1. */
export function setCueVolume(v: number): void {
  cueVolume = Number.isFinite(v) ? Math.min(3, Math.max(0, v)) : 1;
}

/** Aktueller Signalton-Multiplikator — auch von `lib/voice.ts` gelesen. */
export function getCueVolume(): number {
  return cueVolume;
}

type AudioContextCtor = typeof AudioContext;

export function primeAudio(): void {
  if (typeof window === "undefined") return;
  const Ctor: AudioContextCtor | undefined =
    window.AudioContext ??
    (window as Window & { webkitAudioContext?: AudioContextCtor }).webkitAudioContext;
  if (!Ctor) return;
  if (!ctx) {
    try {
      ctx = new Ctor();
    } catch {
      return;
    }
  }
  if (ctx.state === "suspended") void ctx.resume().catch(() => {});
}

/** Master-Bus (lazy): Kompressor als Limiter vor dem Ausgang. */
function bus(): AudioNode | null {
  if (!ctx) return null;
  if (!master) {
    try {
      master = ctx.createDynamicsCompressor();
      master.threshold.value = -12;
      master.ratio.value = 8;
      master.attack.value = 0.002;
      master.release.value = 0.08;
      master.connect(ctx.destination);
    } catch {
      return ctx.destination;
    }
  }
  return master;
}

function tone(freq: number, ms: number, gain: number, delaySec = 0): void {
  if (!ctx || ctx.state !== "running") return;
  const out = bus();
  if (!out) return;
  // Nutzer-Lautstärke einrechnen und bei ~0.9 kappen (Clipping-Schutz).
  const peak = Math.min(0.9, gain * cueVolume);
  if (peak < 0.0002) return; // Lautstärke 0 → stumm (exp. Ramp kann nicht auf 0)
  try {
    const t0 = ctx.currentTime + delaySec;
    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const g = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.value = freq;
    filter.type = "lowpass";
    filter.frequency.value = Math.min(freq * 3, 8000);
    filter.Q.value = 0.8;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(peak, t0 + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + ms / 1000);
    osc.connect(filter);
    filter.connect(g);
    g.connect(out);
    osc.start(t0);
    osc.stop(t0 + ms / 1000 + 0.02);
  } catch {
    /* Audio darf nie den Flow stören */
  }
}

/** Countdown-Tick — Doppel-Puls (Stoppuhr, kein Wecker). */
export function beep(): void {
  tone(1568, 40, 0.22);
  tone(1568, 40, 0.22, 0.11);
}

/** Ende-Signal — Doppelton abwärts („Übung/Pause vorbei"). */
export function beepEnd(): void {
  tone(1568, 140, 0.3);
  tone(1046, 200, 0.3, 0.16);
}

/** Start-Signal — Doppelton aufwärts („nächste Übung läuft"). */
export function beepStart(): void {
  tone(1046, 140, 0.3);
  tone(1568, 200, 0.3, 0.16);
}
