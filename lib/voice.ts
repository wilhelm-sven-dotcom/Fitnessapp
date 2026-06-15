/**
 * Hands-free Gym-Modus: thin wrappers around the Web Speech API plus a pure,
 * unit-testable parser for spoken German set entries. All browser access is
 * guarded so the app runs unchanged where speech is unsupported (the callers
 * hide their mic / cue UI via `isVoiceInputSupported` / `isSpeechSupported`).
 */

// --- Text-to-speech ---------------------------------------------------------

export function isSpeechSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

/** Speak a short German phrase. `interrupt` cancels anything still queued. */
export function speak(text: string, opts: { interrupt?: boolean } = {}): void {
  if (!isSpeechSupported()) return;
  try {
    const synth = window.speechSynthesis;
    if (opts.interrupt) synth.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "de-DE";
    u.rate = 1;
    synth.speak(u);
  } catch {
    /* speech unavailable — silent no-op */
  }
}

// --- Speech recognition (minimal typing — Web Speech is not in lib.dom) ------

interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((ev: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onend: (() => void) | null;
  onerror: ((ev: { error: string }) => void) | null;
}
type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

function recognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function isVoiceInputSupported(): boolean {
  return recognitionCtor() !== null;
}

export interface Recognizer {
  start(): void;
  stop(): void;
}

/** One-shot German recognizer. Returns null when unsupported. */
export function createRecognizer(handlers: {
  onResult: (transcript: string) => void;
  onEnd?: () => void;
  onError?: (error: string) => void;
}): Recognizer | null {
  const Ctor = recognitionCtor();
  if (!Ctor) return null;
  const rec = new Ctor();
  rec.lang = "de-DE";
  rec.continuous = false;
  rec.interimResults = false;
  rec.maxAlternatives = 1;
  rec.onresult = (ev) => {
    const transcript = ev.results[0]?.[0]?.transcript ?? "";
    if (transcript) handlers.onResult(transcript);
  };
  rec.onend = () => handlers.onEnd?.();
  rec.onerror = (ev) => handlers.onError?.(ev.error);
  return {
    start: () => {
      try {
        rec.start();
      } catch {
        /* already running */
      }
    },
    stop: () => {
      try {
        rec.stop();
      } catch {
        /* ignore */
      }
    },
  };
}

// --- Pure parser: spoken German → a logged set ------------------------------

export interface ParsedSet {
  weight?: number;
  reps?: number;
  rir?: number;
}

const ONES: Record<string, number> = {
  null: 0, ein: 1, eins: 1, eine: 1, zwei: 2, drei: 3, vier: 4,
  fünf: 5, fuenf: 5, sechs: 6, sieben: 7, acht: 8, neun: 9, zehn: 10,
  elf: 11, zwölf: 12, zwoelf: 12, dreizehn: 13, vierzehn: 14,
  fünfzehn: 15, fuenfzehn: 15, sechzehn: 16, siebzehn: 17,
  achtzehn: 18, neunzehn: 19,
};
const TENS: Record<string, number> = {
  zwanzig: 20, dreißig: 30, dreissig: 30, vierzig: 40,
  fünfzig: 50, fuenfzig: 50, sechzig: 60, siebzig: 70,
  achtzig: 80, neunzig: 90,
};

/** German number word or digit string → number, or null if unrecognized. */
export function germanWordToNumber(word: string): number | null {
  if (word in ONES) return ONES[word];
  if (word in TENS) return TENS[word];
  if (word === "hundert" || word === "einhundert") return 100;
  if (/^\d+([.,]\d+)?$/.test(word)) return parseFloat(word.replace(",", "."));
  // Compound "<ones>und<tens>" → e.g. fünfundzwanzig = 25.
  const parts = word.split("und");
  if (parts.length === 2 && ONES[parts[0]] != null && TENS[parts[1]] != null) {
    return ONES[parts[0]] + TENS[parts[1]];
  }
  return null;
}

const WEIGHT_KW = new Set(["kilo", "kilos", "kilogramm", "kg"]);
const REPS_KW = new Set([
  "wiederholung", "wiederholungen", "wdh", "reps", "rep", "mal", "stück", "stueck",
]);
const RIR_KW = new Set(["rir"]);

/**
 * Parse a spoken set like „zwanzig kilo zehn wiederholungen rir eins" or
 * „17,5 kg 8 mal" into `{ weight, reps, rir }`. Keyword-driven, so order is
 * flexible; a single trailing number with no keyword is read as reps.
 */
export function parseSetSpeech(transcript: string): ParsedSet {
  const tokens = transcript
    .toLowerCase()
    .replace(/(\d)([a-zäöüß])/g, "$1 $2") // split "20kg" → "20 kg"
    .replace(/[^a-zäöüß0-9.,\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);

  const out: ParsedSet = {};
  let pending: number | null = null;
  let rirArmed = false;

  for (let i = 0; i < tokens.length; i++) {
    const tok = tokens[i];

    // Spoken decimal: "<n> komma <m>" → n + m/10^digits.
    if ((tok === "komma" || tok === "punkt") && pending != null && i + 1 < tokens.length) {
      const frac = germanWordToNumber(tokens[i + 1]);
      if (frac != null) {
        pending = pending + frac / Math.pow(10, String(frac).length);
        i++;
        continue;
      }
    }
    if (RIR_KW.has(tok)) {
      if (pending != null) {
        out.rir = pending;
        pending = null;
      } else {
        rirArmed = true;
      }
      continue;
    }
    if (WEIGHT_KW.has(tok)) {
      if (pending != null) {
        out.weight = pending;
        pending = null;
      }
      continue;
    }
    if (REPS_KW.has(tok)) {
      if (pending != null) {
        out.reps = pending;
        pending = null;
      }
      continue;
    }
    const num = germanWordToNumber(tok);
    if (num != null) {
      if (rirArmed) {
        out.rir = num;
        rirArmed = false;
      } else {
        pending = num;
      }
    }
  }

  if (pending != null) {
    if (out.reps == null) out.reps = pending;
    else if (out.weight == null) out.weight = pending;
  }
  return out;
}
