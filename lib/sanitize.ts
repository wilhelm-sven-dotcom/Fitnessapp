/**
 * Store sanitizers — the single hardening layer between raw persisted/synced
 * data and React state. Every function is pure and NEVER throws: it drops or
 * repairs structurally-broken elements and returns a well-typed value, so a
 * malformed cloud copy (or an old local schema) can never reach render and
 * blank the whole app via the root error boundary.
 *
 * Applied in `loadAll` (cold boot AND post-sync) and in `importData`, so all
 * three data entry points share one truth.
 */
import type {
  BodyMetric,
  CardioSession,
  Exercise,
  GymProfile,
  LoggedSession,
  SessionExercise,
  SetEntry,
} from "@/lib/types";

const isObj = (x: unknown): x is Record<string, unknown> =>
  !!x && typeof x === "object" && !Array.isArray(x);
const arr = (x: unknown): unknown[] => (Array.isArray(x) ? x : []);

/** One logged working/warm-up set — coerce to a safe shape. */
function sanitizeSet(x: unknown): SetEntry | null {
  if (!isObj(x)) return null;
  return x as unknown as SetEntry;
}

function sanitizeExercise(x: unknown): SessionExercise | null {
  if (!isObj(x) || typeof x.id !== "string") return null;
  return {
    ...(x as unknown as SessionExercise),
    id: x.id,
    name: typeof x.name === "string" ? x.name : x.id,
    unit: (x.unit as SessionExercise["unit"]) ?? "kg",
    sets: arr(x.sets).map(sanitizeSet).filter((s): s is SetEntry => s !== null),
  };
}

/**
 * The backbone: dates drive weeks/streaks/records, so a session without a
 * string date is unusable and dropped. `exercises`/`sets` are always arrays
 * afterwards, so every consumer (records, volume, trainer) is safe.
 */
export function sanitizeSessions(x: unknown): LoggedSession[] {
  return arr(x)
    .filter((s): s is Record<string, unknown> => isObj(s) && typeof s.date === "string")
    .map((s) => ({
      ...(s as unknown as LoggedSession),
      exercises: arr(s.exercises)
        .map(sanitizeExercise)
        .filter((e): e is SessionExercise => e !== null),
    }));
}

export function sanitizeCardio(x: unknown): CardioSession[] {
  return arr(x)
    .filter(
      (s): s is Record<string, unknown> =>
        isObj(s) && typeof s.id === "string" && typeof s.date === "string",
    )
    .map((s) => {
      // Dauer immer als endliche Zahl ≥ 0: alles, was damit rechnet (Minuten,
      // Tempo, Belastung), bekäme sonst NaN.
      const d = Number(s.durationSec);
      return {
        ...(s as unknown as CardioSession),
        durationSec: Number.isFinite(d) && d > 0 ? d : 0,
      };
    });
}

export function sanitizeBody(x: unknown): BodyMetric[] {
  return arr(x).filter((b): b is BodyMetric => isObj(b) && typeof b.date === "string");
}

export function sanitizeGyms(x: unknown): GymProfile[] {
  return arr(x)
    .filter((g): g is Record<string, unknown> => isObj(g) && typeof g.id === "string")
    .map((g) => ({ ...(g as unknown as GymProfile), equip: arr(g.equip) as GymProfile["equip"] }));
}

/** key→string map (Notizen je Übung). Non-string values are dropped. */
export function sanitizeStringMap(x: unknown): Record<string, string> {
  if (!isObj(x)) return {};
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(x)) if (typeof v === "string") out[k] = v;
  return out;
}

/**
 * Exercise-id → video-URL map. VIDEOS ARE PRESERVED: every entry whose value is
 * a string (a real URL) survives 1:1. Only non-string values are dropped — they
 * can't be a playable video and are the exact crash source (`raw.trim` on a
 * non-string). An array/non-object container can't be mapped back to exercise
 * ids, so it degrades to an empty map (the valid URLs still live in the cloud
 * and local backup) — nothing valid is ever deleted.
 */
export function sanitizeVideoMap(x: unknown): Record<string, string> {
  return sanitizeStringMap(x);
}

/**
 * Repair the persisted app data IN PLACE in localStorage — the last-resort
 * recovery the root error boundary can run even when the app tree (and thus the
 * provider's loadAll sanitize) never mounts. Sanitizes every known store and
 * writes the cleaned value back, so ANY build — old or new — reads renderable
 * data on the next load. Pure DOM localStorage access (no Supabase-heavy storage
 * layer import), every step guarded → never throws. Valid data incl. video URLs
 * is preserved 1:1; only structurally-broken entries are dropped. Ein Wert,
 * der sich gar nicht lesen lässt, wird beiseitegelegt statt gelöscht.
 *
 * Key strings MUST match KEYS in lib/storage.ts.
 */
/**
 * Ein unlesbarer Wert wird nicht gelöscht, sondern unter `…-defekt`
 * beiseitegelegt. Für Verlauf und Körperwerte springt die Sicherung ein
 * (`…-sicherung`, siehe lib/storage.ts — die Endungen müssen übereinstimmen).
 */
function legeBeiseite(ls: Storage, key: string, raw: string): void {
  try {
    ls.setItem(`${key}-defekt`, raw);
  } catch {
    /* kein Platz — dann bleibt nur das Entfernen */
  }
  ls.removeItem(key);
  if (key !== "wilhelm-training-log" && key !== "wilhelm-training-body") return;
  try {
    const kopie = ls.getItem(`${key}-sicherung`);
    if (kopie != null && Array.isArray(JSON.parse(kopie))) ls.setItem(key, kopie);
  } catch {
    /* Sicherung selbst unlesbar */
  }
}

export function repairPersistedData(): void {
  let ls: Storage;
  try {
    if (typeof window === "undefined" || !window.localStorage) return;
    ls = window.localStorage;
  } catch {
    return;
  }
  const jobs: [string, (v: unknown) => unknown][] = [
    ["wilhelm-training-log", sanitizeSessions],
    ["wilhelm-training-cardio", sanitizeCardio],
    ["wilhelm-training-body", sanitizeBody],
    ["wilhelm-training-gyms", sanitizeGyms],
    ["wilhelm-training-custom", sanitizeCustom],
    ["wilhelm-training-exercise-videos", sanitizeVideoMap],
    ["wilhelm-training-warmup-videos", sanitizeVideoMap],
    ["wilhelm-training-exercise-notes", sanitizeStringMap],
  ];
  for (const [key, fn] of jobs) {
    try {
      const raw = ls.getItem(key);
      if (raw == null) continue;
      let parsed: unknown;
      try {
        parsed = JSON.parse(raw);
      } catch {
        legeBeiseite(ls, key, raw);
        continue;
      }
      const next = JSON.stringify(fn(parsed));
      if (next !== raw) ls.setItem(key, next);
    } catch {
      /* never throw */
    }
  }
  // settings/mission: keep only a plain object (mission also needs a targets
  // object). A malformed value here can throw in the provider/rollover effect.
  for (const key of ["wilhelm-training-settings", "wilhelm-training-mission"]) {
    try {
      const raw = ls.getItem(key);
      if (raw == null) continue;
      let parsed: unknown;
      try {
        parsed = JSON.parse(raw);
      } catch {
        legeBeiseite(ls, key, raw);
        continue;
      }
      const okObj = !!parsed && typeof parsed === "object" && !Array.isArray(parsed);
      if (!okObj) {
        ls.removeItem(key);
        continue;
      }
      if (key.endsWith("mission")) {
        const t = (parsed as Record<string, unknown>).targets;
        if (!t || typeof t !== "object" || Array.isArray(t)) ls.removeItem(key);
      }
    } catch {
      /* never throw */
    }
  }
}

/** Custom exercises — backfill fields older builds omitted (guide relied on them). */
export function sanitizeCustom(x: unknown): Exercise[] {
  return arr(x)
    .filter((e): e is Record<string, unknown> => isObj(e) && typeof e.id === "string")
    .map((e) => ({
      ...(e as unknown as Exercise),
      tag: typeof e.tag === "string" ? e.tag : "",
      req: Array.isArray(e.req) ? (e.req as Exercise["req"]) : ["none"],
      cue: typeof e.cue === "string" ? e.cue : "",
      steps: Array.isArray(e.steps) ? (e.steps as string[]) : [],
      back: typeof e.back === "string" ? e.back : "",
      easier: typeof e.easier === "string" ? e.easier : "",
      unit: (e.unit as Exercise["unit"]) ?? "kg",
      sets: typeof e.sets === "number" ? e.sets : 3,
      repLow: typeof e.repLow === "number" ? e.repLow : 8,
      repHigh: typeof e.repHigh === "number" ? e.repHigh : 12,
      pattern: (e.pattern as Exercise["pattern"]) ?? "core",
      weighted: typeof e.weighted === "boolean" ? e.weighted : false,
      custom: true,
    }));
}
