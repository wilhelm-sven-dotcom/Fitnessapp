/**
 * Kurze Signaltöne über die Web Audio API — für Countdown-Ticks und
 * Ende-Signale im geführten Aufwärmen. iOS gibt Audio erst nach einer
 * User-Geste frei: `primeAudio()` in einem Tap-Handler aufrufen (erzeugt
 * den AudioContext und weckt ihn); danach spielen `beep()`/`beepEnd()`
 * auch aus Timern heraus. Ohne Support oder vor dem Priming: leiser No-op.
 */
let ctx: AudioContext | null = null;

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

function tone(freq: number, ms: number, gain: number, delaySec = 0): void {
  if (!ctx || ctx.state !== "running") return;
  // Nutzer-Lautstärke einrechnen und bei ~0.9 kappen (Clipping-Schutz).
  const peak = Math.min(0.9, gain * cueVolume);
  if (peak < 0.0002) return; // Lautstärke 0 → stumm (exp. Ramp kann nicht auf 0)
  try {
    const t0 = ctx.currentTime + delaySec;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(peak, t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + ms / 1000);
    osc.connect(g);
    g.connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + ms / 1000 + 0.02);
  } catch {
    /* Audio darf nie den Flow stören */
  }
}

/** Countdown-Tick — die letzten Sekunden einer Übung. */
export function beep(): void {
  tone(880, 90, 0.12);
}

/** Ende-Signal — Doppelton abwärts („Übung vorbei"). */
export function beepEnd(): void {
  tone(660, 140, 0.16);
  tone(440, 200, 0.16, 0.16);
}

/** Start-Signal — Doppelton aufwärts („nächste Übung läuft"). */
export function beepStart(): void {
  tone(440, 140, 0.16);
  tone(660, 200, 0.16, 0.16);
}
