/**
 * Kurze Signaltöne über die Web Audio API — für Countdown-Ticks und
 * Ende-Signale im geführten Aufwärmen. iOS gibt Audio erst nach einer
 * User-Geste frei: `primeAudio()` in einem Tap-Handler aufrufen (erzeugt
 * den AudioContext und weckt ihn); danach spielen `beep()`/`beepEnd()`
 * auch aus Timern heraus. Ohne Support oder vor dem Priming: leiser No-op.
 */
let ctx: AudioContext | null = null;

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
  try {
    const t0 = ctx.currentTime + delaySec;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain, t0 + 0.01);
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
