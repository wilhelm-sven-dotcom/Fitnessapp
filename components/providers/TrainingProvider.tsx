"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { CARDIO_DAY, DEFAULT_EQUIP, EQUIP_LIST, EXAM_DAY, LIB, RESET_DAY, TEMPLATE } from "@/lib/exercises";
import { coachCards, type CoachCard } from "@/lib/advisor";
import { fatigueState, type FatigueState } from "@/lib/fatigue";
import { phaseState, type PhaseState } from "@/lib/periodization";
import {
  generateMissionTargets,
  reviewMission,
  sessionDebrief,
  trainerState,
  weekKeyOf,
  type StoredMission,
  type TrainerInput,
  type TrainerState,
} from "@/lib/trainer";
import { cardioAdvice, type CardioAdvice } from "@/lib/cardio-advice";
import {
  resolveDailySession,
  todayKey,
  type DailySession,
} from "@/lib/session-model";
import type { ActiveSessionState } from "@/lib/active-session";
import type { JumpEntry } from "@/lib/jump";
import { resolveDay, resolveResetSession, resolveSession } from "@/lib/progression";
import { effectiveProfile } from "@/lib/athlete";
import { exerciseAffinity } from "@/lib/affinity";
import {
  NEUTRAL_SCALE,
  band,
  scaleFor,
  type ReadinessScale,
} from "@/lib/readiness";
import { estimateSessionMin, fitToBudget } from "@/lib/session-time";
import { setCueVolume as setBeepCueVolume } from "@/lib/beep";
import { RING, type RingMetric } from "@/lib/ring-colors";
import {
  coverageCount,
  rollingWeeklyBaseline,
  weeklyMuscleVolume,
  weeklyVolume,
  type MuscleVolume,
} from "@/lib/volume";
import { trainingLevel } from "@/lib/achievements";
import { mergeCloudLocal } from "@/lib/merge";
import { prTimeline } from "@/lib/records";
import {
  sanitizeBody,
  sanitizeCardio,
  sanitizeCustom,
  sanitizeDays,
  sanitizeGyms,
  sanitizeSessions,
  sanitizeStringMap,
  sanitizeVideoMap,
} from "@/lib/sanitize";
import { weeklySetStats, type WeeklySetStats } from "@/lib/set-plan";
import { sessionVolume } from "@/lib/stats";
import { KEYS, storage, cloudPull, cloudPushAll } from "@/lib/storage";
import { youtubeEmbedUrl } from "@/lib/youtube";
import { getSupabase, isCloudConfigured } from "@/lib/supabase";
import { deletePhoto } from "@/lib/photo-store";
import {
  accentInk,
  applyTheme,
  DEFAULT_ACCENT,
  onAccent,
  resolveTheme,
  type ThemePref,
} from "@/lib/theme";
import { mergeCardio } from "@/lib/cardio";
import type { SpotifyAuth } from "@/lib/spotify";
import type {
  AppSettings,
  AthleteProfile,
  BodyMetric,
  CardioSession,
  EquipKey,
  Readiness,
  Exercise,
  GymProfile,
  IconConfig,
  LastPerf,
  LoggedSession,
  Muscle,
  Pattern,
  ResolvedSlot,
  SessionExercise,
  SetEntry,
  Template,
  Unit,
  WorkoutDay,
} from "@/lib/types";

/** Editor-Eingabe für eine eigene Übung — wird im Provider gehärtet. */
export interface CustomExerciseInput {
  name: string;
  pattern: Pattern;
  unit: Unit;
  weighted: boolean;
  req: string[];
  muscle?: Muscle;
  muscleSecondary?: Muscle;
  sets?: number;
  repLow?: number;
  repHigh?: number;
  cue?: string;
  steps?: string[];
  back?: string;
  easier?: string;
  backCaution?: boolean;
}

/** What a just-saved session achieved — feeds the "Sieger-Moment" takeover. */
export interface SessionSummary {
  sets: number;
  tonnage: number; // kg moved this session
  prs: number; // records set today
  levelBefore: number;
  levelAfter: number;
  xpPctFrom: number; // 0..1 progress toward next level, before/after
  xpPctTo: number;
  weekSets: number;
  weekTarget: number;
  /** ATLAS-Debrief (3 Zeilen) — auch an der LoggedSession persistiert. */
  debrief: string[];
}

export interface ExportEnvelope {
  schemaVersion: number;
  exportedAt: string;
  log: LoggedSession[];
  equip: EquipKey[];
  choices: Record<string, string>;
  custom: Exercise[];
  body: BodyMetric[];
  cardio: CardioSession[];
  days: WorkoutDay[];
  gyms: GymProfile[];
  exerciseVideos: Record<string, string>;
  exerciseNotes: Record<string, string>;
  settings?: AppSettings;
}

const DEFAULT_SETTINGS: AppSettings = {
  timeBudgetMin: 25,
  autoregOn: true,
  voiceCues: false,
  superset: false,
  theme: "dark",
  accentColor: DEFAULT_ACCENT,
};

/** A deload overrides readiness with a clearly lighter week. */
function withDeload(base: ReadinessScale, deloadActive: boolean): ReadinessScale {
  return deloadActive
    ? { setDelta: -1, loadMult: Math.min(base.loadMult, 0.6), cap: true }
    : base;
}

/** Import-Fenster: nur die letzten 2 Wochen an Strava-Einheiten behalten.
 *  Manuell Eingetragenes bleibt IMMER (das hat der Nutzer selbst erfasst). */
const IMPORT_WINDOW_MS = 14 * 86_400_000;
function pruneOldImports(list: CardioSession[]): CardioSession[] {
  const cutoff = Date.now() - IMPORT_WINDOW_MS;
  return list.filter(
    (c) => c.source === "manual" || new Date(c.date).getTime() >= cutoff,
  );
}

/** Apply readiness set-count delta to weighted slots (clamped 2..sets+1). */
function applyReadiness(list: ResolvedSlot[], scale: ReadinessScale): ResolvedSlot[] {
  if (scale.setDelta === 0) return list;
  return list.map((s) => {
    if (!s.ex.weighted) return s;
    const sets = Math.max(2, Math.min(s.ex.sets + 1, s.ex.sets + scale.setDelta));
    return sets === s.ex.sets ? s : { ...s, ex: { ...s.ex, sets } };
  });
}

interface TrainingContextValue {
  log: LoggedSession[];
  equip: EquipKey[];
  choices: Record<string, string>;
  custom: Exercise[];
  exerciseVideos: Record<string, string>;
  exerciseNotes: Record<string, string>;
  body: BodyMetric[];
  loading: boolean;
  saving: boolean;
  allLib: Exercise[];
  has: (k: string) => boolean;
  recTpl: Template;
  recList: ResolvedSlot[];
  estimatedMin: number;
  settings: AppSettings;
  todayReadiness: Readiness | null;
  readinessScale: ReadinessScale;
  ringMetrics: RingMetric[];
  muscleVolumes: MuscleVolume[];
  coach: CoachCard[];
  cardioAdvice: CardioAdvice;
  fatigue: FatigueState;
  phase: PhaseState;
  weekSetStats: WeeklySetStats;
  trainer: TrainerState;
  mission: StoredMission | null;
  weekCount: number;
  daysAgo: number | null;
  lastLabel: string;
  lastBackRed: boolean;
  /** „Rücken heute schonen" — manueller Tages-Schalter (Session-scoped). */
  backSpareToday: boolean;
  setBackSpareToday: (on: boolean) => void;
  /** Rücken-Schonung heute aktiv — Ampel-rot ODER manueller Tages-Schalter. */
  backSafeActive: boolean;
  seeDoctor: boolean;
  lastPerf: (id: string) => LastPerf | null;
  toggleEquip: (k: EquipKey) => void;
  addCustom: (data: CustomExerciseInput) => void;
  updateCustom: (id: string, data: CustomExerciseInput) => void;
  removeCustom: (id: string) => void;
  setExerciseVideo: (exId: string, url: string | null) => void;
  setExerciseNote: (exId: string, note: string | null) => void;
  days: WorkoutDay[];
  addDay: (day: WorkoutDay) => void;
  updateDay: (day: WorkoutDay) => void;
  removeDay: (id: string) => void;
  gyms: GymProfile[];
  switchGym: (id: string) => void;
  addGym: (name: string, equipPreset?: EquipKey[]) => void;
  removeGym: (id: string) => void;
  /** Den Live-State des Runners als LoggedSession speichern (leer → null). */
  saveActiveSession: (state: ActiveSessionState) => Promise<SessionSummary | null>;
  /** KI-Debrief nachträglich an die zuletzt gespeicherte Einheit schreiben. */
  amendLastDebrief: (lines: string[]) => void;
  /** Laufende Einheit verwerfen: lokalen Live-State und Tages-Flags räumen. */
  discardActive: () => void;
  deleteSession: (realIdx: number) => Promise<void>;
  resetAll: () => Promise<void>;
  setBudget: (min: number) => void;
  setVoiceCues: (on: boolean) => void;
  setCueVolume: (v: number) => void;
  setTheme: (t: ThemePref) => void;
  setIcon: (icon: IconConfig | undefined) => void;
  setAccentOverride: (hex: string | undefined) => void;
  setAccent: (id: string) => void;
  setWeightStep: (step: number) => void;
  setBikeWarmup: (on: boolean) => void;
  setCoachMotivation: (on: boolean) => void;
  setKeepAwake: (on: boolean) => void;
  setAiPlanning: (on: boolean) => void;
  setCoachLive: (on: boolean) => void;
  /** Die heutige, frisch komponierte Einheit (ATLAS / Fallback / manuell). */
  todaySession: DailySession | null;
  /** Persistiert mit (KEYS.today). `null` löscht die heutige Einheit. */
  setTodaySession: (s: DailySession | null) => void;
  jumps: JumpEntry[];
  addJump: (heightCm: number) => void;
  setUserName: (name: string) => void;
  setAthleteProfile: (patch: Partial<AthleteProfile>) => void;
  completeOnboarding: (name?: string, profile?: Partial<AthleteProfile>) => void;
  setReadiness: (r: Readiness) => void;
  acceptDeload: () => void;
  acceptExam: () => void;
  dismissCard: (card: CoachCard) => void;
  addBodyMetric: (m: BodyMetric) => Promise<void>;
  deleteBodyMetric: (idx: number) => Promise<void>;
  exportData: () => ExportEnvelope;
  importData: (raw: unknown) => Promise<boolean>;
  cardio: CardioSession[];
  addManualCardio: (entry: Omit<CardioSession, "id" | "source">) => Promise<void>;
  removeCardio: (id: string) => Promise<void>;
  strava: StravaApi;
  spotify: SpotifyApi;
  cloud: CloudApi;
}

export interface CloudApi {
  configured: boolean;
  email: string | null;
  busy: boolean;
  signIn: (email: string) => Promise<{ ok: boolean; error?: string }>;
  verifyCode: (email: string, token: string) => Promise<{ ok: boolean; error?: string }>;
  signInWithPassword: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  setPassword: (password: string) => Promise<{ ok: boolean; error?: string }>;
  signOut: () => Promise<void>;
  syncNow: () => Promise<void>;
}

export interface StravaApi {
  connected: boolean;
  athlete: string | null;
  busy: boolean;
  /** Exchange the OAuth authorization code, store tokens, pull activities. */
  connect: (code: string) => Promise<{ ok: boolean; error?: string }>;
  syncNow: () => Promise<{ ok: boolean; error?: string }>;
  disconnect: () => void;
}

export interface SpotifyApi {
  /** True when NEXT_PUBLIC_SPOTIFY_CLIENT_ID is set — otherwise fully inert. */
  configured: boolean;
  auth: SpotifyAuth | undefined;
  connect: (auth: SpotifyAuth) => Promise<void>;
  disconnect: () => Promise<void>;
}

const TrainingContext = createContext<TrainingContextValue | null>(null);

export function useTraining(): TrainingContextValue {
  const ctx = useContext(TrainingContext);
  if (!ctx) throw new Error("useTraining must be used within TrainingProvider");
  return ctx;
}

export function TrainingProvider({ children }: { children: React.ReactNode }) {
  const [log, setLog] = useState<LoggedSession[]>([]);
  const [equip, setEquip] = useState<EquipKey[]>(DEFAULT_EQUIP);
  const [choices, setChoices] = useState<Record<string, string>>({});
  const [custom, setCustom] = useState<Exercise[]>([]);
  const [body, setBody] = useState<BodyMetric[]>([]);
  const [cardio, setCardio] = useState<CardioSession[]>([]);
  // IDs gelöschter Import-Einheiten — der Strava-Sync überspringt sie, sonst
  // käme eine gelöschte (oder doppelte) Fahrt beim nächsten Sync zurück.
  const [hiddenCardio, setHiddenCardio] = useState<string[]>([]);
  const [days, setDays] = useState<WorkoutDay[]>([]);
  const [gyms, setGyms] = useState<GymProfile[]>([]);
  const [exerciseVideos, setExerciseVideos] = useState<Record<string, string>>({});
  const [exerciseNotes, setExerciseNotes] = useState<Record<string, string>>({});
  const [stravaBusy, setStravaBusy] = useState(false);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [todaySession, setTodaySessionState] = useState<DailySession | null>(null);
  const [jumps, setJumps] = useState<JumpEntry[]>([]);
  const [todayReadiness, setTodayReadiness] = useState<Readiness | null>(null);
  // „Rücken heute schonen" — manueller Tages-Schalter (Session-scoped wie
  // todayReadiness: nie persistiert, Reset bei Save/Discard).
  const [backSpareToday, setBackSpareToday] = useState(false);
  const [dismissed, setDismissed] = useState<string[]>([]);

  // Read every key from the local cache into state. Reused after a cloud pull.
  const [mission, setMission] = useState<StoredMission | null>(null);

  const loadAll = useCallback(async () => {
    const [l, e, c, cu, b, s, ca, hc, da, gy, ev, mi, en, td] = await Promise.all([
      storage.getJSON<LoggedSession[]>(KEYS.log, []),
      storage.getJSON<EquipKey[]>(KEYS.equip, DEFAULT_EQUIP),
      storage.getJSON<Record<string, string>>(KEYS.choices, {}),
      storage.getJSON<Exercise[]>(KEYS.custom, []),
      storage.getJSON<BodyMetric[]>(KEYS.body, []),
      storage.getJSON<AppSettings>(KEYS.settings, DEFAULT_SETTINGS),
      storage.getJSON<CardioSession[]>(KEYS.cardio, []),
      storage.getJSON<string[]>(KEYS.hiddenCardio, []),
      storage.getJSON<WorkoutDay[]>(KEYS.days, []),
      storage.getJSON<GymProfile[]>(KEYS.gyms, []),
      storage.getJSON<Record<string, string>>(KEYS.exerciseVideos, {}),
      storage.getJSON<StoredMission | null>(KEYS.mission, null),
      storage.getJSON<Record<string, string>>(KEYS.exerciseNotes, {}),
      storage.getJSON<DailySession | null>(KEYS.today, null),
    ]);
    // Alles durch die Sanitizer VOR setState — vergiftete Sync-/Legacy-Daten
    // dürfen den Render nie erreichen (sonst global-error auf jeder Route).
    // Videos bleiben dabei erhalten (nur Nicht-String-Werte fallen raus).
    setLog(sanitizeSessions(l));
    let equipLoaded = Array.isArray(e) ? e : DEFAULT_EQUIP;
    let gymsLoaded = sanitizeGyms(gy);
    let settingsLoaded =
      s && typeof s === "object" && !Array.isArray(s)
        ? { ...DEFAULT_SETTINGS, ...s }
        : DEFAULT_SETTINGS;
    // Einmal-Migration: Wer eine Langhantel hat, bekommt die Hantelbank
    // dazu — sonst blieben die neuen Bank-Übungen unsichtbar. Respektiert
    // spätere manuelle Abwahl (läuft genau einmal, dann benchMigrated).
    if (!settingsLoaded.benchMigrated) {
      const withBench = (arr: EquipKey[]) =>
        arr.includes("bar") && !arr.includes("bench") ? [...arr, "bench" as EquipKey] : arr;
      equipLoaded = withBench(equipLoaded);
      gymsLoaded = gymsLoaded.map((g) => ({ ...g, equip: withBench(g.equip) }));
      settingsLoaded = { ...settingsLoaded, benchMigrated: true };
      void storage.setJSON(KEYS.equip, equipLoaded);
      void storage.setJSON(KEYS.gyms, gymsLoaded);
      void storage.setJSON(KEYS.settings, settingsLoaded);
    }
    setEquip(equipLoaded);
    setChoices(sanitizeStringMap(c));
    setCustom(sanitizeCustom(cu));
    setBody(sanitizeBody(b));
    setSettings(settingsLoaded);
    // Nur die letzten 2 Wochen behalten — ältere Importe beim Öffnen wegräumen
    // (und persistieren, wenn wirklich etwas wegfiel), manuelle bleiben.
    const cleanCardio = pruneOldImports(sanitizeCardio(ca));
    setCardio(cleanCardio);
    if (Array.isArray(ca) && cleanCardio.length !== ca.length)
      void storage.setJSON(KEYS.cardio, cleanCardio);
    setHiddenCardio(Array.isArray(hc) ? hc.filter((x): x is string => typeof x === "string") : []);
    setDays(sanitizeDays(da));
    setGyms(gymsLoaded);
    setExerciseVideos(sanitizeVideoMap(ev));
    setExerciseNotes(sanitizeStringMap(en));
    // Mission nur mit einem echten targets-OBJEKT (der Rollover liest
    // mission.targets.weekKey — ein Nicht-Objekt würfe dort).
    if (mi && typeof mi === "object" && mi.targets && typeof mi.targets === "object") setMission(mi);
    // Heutige Einheit: nur übernehmen, wenn sie wirklich von HEUTE ist —
    // eine gestrige komponiert die Startseite frisch.
    if (
      td &&
      typeof td === "object" &&
      td.schemaVersion === 1 &&
      td.date === todayKey() &&
      Array.isArray(td.items)
    )
      setTodaySessionState(td);
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  // Apply theme to <html>; follow system changes when theme is "system".
  // Skip while loading so the pre-paint script's result never flashes over.
  useEffect(() => {
    if (loading) return;
    // Optional accent override wins over the design's --accent (inline > CSS).
    const applyAccent = () => {
      const root = document.documentElement;
      if (settings.accentOverride) {
        const baseIsLight = resolveTheme(settings.theme) === "light";
        root.style.setProperty("--accent", settings.accentOverride);
        root.style.setProperty("--on-accent", onAccent(settings.accentOverride));
        root.style.setProperty("--accent-ink", accentInk(settings.accentOverride, baseIsLight));
      } else {
        root.style.removeProperty("--accent");
        root.style.removeProperty("--on-accent");
        root.style.removeProperty("--accent-ink");
      }
    };
    applyTheme(settings.theme);
    applyAccent();
    if (settings.theme !== "system" || typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-color-scheme: light)");
    const onChange = () => {
      applyTheme(settings.theme);
      applyAccent();
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [loading, settings.theme, settings.accentOverride]);

  // --- Cloud-Sync: pull on login, seed an empty cloud, observe auth state. ---
  const cloudConfigured = isCloudConfigured();
  const [cloudEmail, setCloudEmail] = useState<string | null>(null);
  const [cloudBusy, setCloudBusy] = useState(false);

  const collectLocal = useCallback(async (): Promise<[string, string][]> => {
    const entries: [string, string][] = [];
    for (const k of Object.values(KEYS)) {
      const raw = await storage.getRaw(k);
      if (raw != null) entries.push([k, raw]);
    }
    return entries;
  }, []);

  const pullOrSeed = useCallback(async () => {
    const map = await cloudPull();
    if (map && Object.keys(map).length) {
      const known = new Set<string>(Object.values(KEYS));
      const localLog = await storage.getJSON<LoggedSession[]>(KEYS.log, []);
      if (localLog.length) {
        // Both sides carry data (device trained before signing in) → MERGE.
        // A blind cloud pull used to silently drop the unsynced local sessions.
        const local: Record<string, string> = {};
        for (const [k, v] of await collectLocal()) local[k] = v;
        const cloudKnown: Record<string, string> = {};
        for (const [k, v] of Object.entries(map)) if (known.has(k)) cloudKnown[k] = v;
        const merged = mergeCloudLocal(cloudKnown, local);
        await Promise.all(Object.entries(merged).map(([k, v]) => storage.setRaw(k, v)));
        await loadAll();
        await cloudPushAll(Object.entries(merged));
      } else {
        // Fresh device → adopt the cloud copy.
        await Promise.all(
          Object.entries(map)
            .filter(([k]) => known.has(k))
            .map(([k, v]) => storage.setRaw(k, v)),
        );
        await loadAll();
      }
    } else {
      // First login with an empty cloud → seed it from local data.
      await cloudPushAll(await collectLocal());
    }
  }, [loadAll, collectLocal]);

  useEffect(() => {
    if (!cloudConfigured) return;
    const sb = getSupabase();
    if (!sb) return;
    let active = true;
    void sb.auth.getSession().then(({ data: { session } }) => {
      if (active) setCloudEmail(session?.user.email ?? null);
    });
    const { data: sub } = sb.auth.onAuthStateChange((event, session) => {
      setCloudEmail(session?.user.email ?? null);
      if (event === "SIGNED_IN") void pullOrSeed();
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [cloudConfigured, pullOrSeed]);

  const cloud: CloudApi = {
    configured: cloudConfigured,
    email: cloudEmail,
    busy: cloudBusy,
    signIn: async (email) => {
      const sb = getSupabase();
      if (!sb) return { ok: false, error: "Cloud-Sync ist nicht konfiguriert." };
      if (!email.trim()) return { ok: false, error: "Bitte eine E-Mail-Adresse eingeben." };
      setCloudBusy(true);
      try {
        const { error } = await sb.auth.signInWithOtp({
          email: email.trim(),
          options: {
            emailRedirectTo:
              typeof window !== "undefined" ? window.location.origin + "/settings" : undefined,
          },
        });
        return error ? { ok: false, error: error.message } : { ok: true };
      } catch (e) {
        return { ok: false, error: e instanceof Error ? e.message : "Netzwerkfehler" };
      } finally {
        setCloudBusy(false);
      }
    },
    verifyCode: async (email, token) => {
      const sb = getSupabase();
      if (!sb) return { ok: false, error: "Cloud-Sync ist nicht konfiguriert." };
      if (!email.trim() || !token.trim())
        return { ok: false, error: "Bitte E-Mail und Code eingeben." };
      setCloudBusy(true);
      try {
        const { error } = await sb.auth.verifyOtp({
          email: email.trim(),
          token: token.trim(),
          type: "email",
        });
        return error ? { ok: false, error: error.message } : { ok: true };
      } catch (e) {
        return { ok: false, error: e instanceof Error ? e.message : "Netzwerkfehler" };
      } finally {
        setCloudBusy(false);
      }
    },
    signInWithPassword: async (email, password) => {
      const sb = getSupabase();
      if (!sb) return { ok: false, error: "Cloud-Sync ist nicht konfiguriert." };
      if (!email.trim() || !password)
        return { ok: false, error: "Bitte E-Mail und Passwort eingeben." };
      setCloudBusy(true);
      try {
        const { error } = await sb.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        return error ? { ok: false, error: error.message } : { ok: true };
      } catch (e) {
        return { ok: false, error: e instanceof Error ? e.message : "Netzwerkfehler" };
      } finally {
        setCloudBusy(false);
      }
    },
    setPassword: async (password) => {
      const sb = getSupabase();
      if (!sb) return { ok: false, error: "Cloud-Sync ist nicht konfiguriert." };
      if (password.length < 6) return { ok: false, error: "Mindestens 6 Zeichen." };
      setCloudBusy(true);
      try {
        const { error } = await sb.auth.updateUser({ password });
        return error ? { ok: false, error: error.message } : { ok: true };
      } catch (e) {
        return { ok: false, error: e instanceof Error ? e.message : "Netzwerkfehler" };
      } finally {
        setCloudBusy(false);
      }
    },
    signOut: async () => {
      const sb = getSupabase();
      if (!sb) return;
      await sb.auth.signOut();
      setCloudEmail(null);
    },
    syncNow: async () => {
      setCloudBusy(true);
      try {
        await cloudPushAll(await collectLocal());
        await pullOrSeed();
      } finally {
        setCloudBusy(false);
      }
    },
  };

  const allLib = useMemo(() => [...LIB, ...custom], [custom]);
  const has = useMemo(() => (k: string) => (equip as string[]).includes(k), [equip]);

  const lastPerf = (id: string): LastPerf | null => {
    for (let i = log.length - 1; i >= 0; i--) {
      const ex = log[i].exercises?.find((e) => e.id === id);
      // Only a filled WORKING set counts as a performance — a warmup-only entry
      // (auto-prefilled reps) would collapse the next prescription to "3 × 1".
      if (ex && ex.sets && ex.sets.some((s) => !s.warmup && s.reps !== "" && s.reps != null))
        return { sets: ex.sets, date: log[i].date };
    }
    return null;
  };

  const lastBackRed =
    log.length > 0 && log[log.length - 1].backTraffic === "red";
  // Schonung greift bei roter Ampel der letzten Einheit ODER wenn der Nutzer
  // sie heute manuell einschaltet — beide Pfade nutzen dieselbe Mechanik.
  const backSafeActive = lastBackRed || backSpareToday;
  const seeDoctor =
    log.length >= 2 &&
    log[log.length - 1].backTraffic === "red" &&
    log[log.length - 2].backTraffic === "red";

  // Memoized — both run on every provider render otherwise (affinity scans the
  // full log), and the provider re-renders on every keystroke in a workout.
  const athleteInjuries = useMemo(
    () => effectiveProfile(settings, body).injuries,
    [settings, body],
  );
  const affinity = useMemo(() => exerciseAffinity(choices, log), [choices, log]);
  const sessionOf = (key: string, backSafe = false): ResolvedSlot[] => {
    // DAS Trainingsmodell: die heutige, frisch komponierte Einheit.
    if (key === "today")
      return todaySession ? resolveDailySession(todaySession, allLib, has) : [];
    const day = days.find((d) => d.id === key);
    if (day) return resolveDay(day, allLib, has, choices);
    // Rücken-Reset: kuratiert und konstruktiv gewichtsfrei — keine
    // Muster-Rotation, kein backSafe nötig.
    if (key === RESET_DAY.key) return resolveResetSession(has, allLib, choices);
    if (key === CARDIO_DAY.key)
      return resolveSession(CARDIO_DAY, log.length, choices, has, allLib, {
        injuries: athleteInjuries,
        affinity,
      });
    if (key === EXAM_DAY.key)
      return resolveSession(EXAM_DAY, log.length, choices, has, allLib, {
        backSafe,
        injuries: athleteInjuries,
        affinity,
      });
    const tpl = TEMPLATE.find((t) => t.key === key);
    if (!tpl) return [];
    const idx = TEMPLATE.findIndex((t) => t.key === key);
    return resolveSession(tpl, idx, choices, has, allLib, {
      backSafe,
      injuries: athleteInjuries,
      affinity,
    });
  };

  const nextIndex = useMemo(() => {
    if (!log.length) return 0;
    const idx = TEMPLATE.findIndex((t) => t.key === log[log.length - 1]?.dayKey);
    return (idx + 1) % TEMPLATE.length;
  }, [log]);
  const deloadActive =
    !!settings.lastDeloadDate &&
    Date.now() - new Date(settings.lastDeloadDate).getTime() < 7 * 86400000;

  const readinessScale = useMemo(
    () =>
      withDeload(
        settings.autoregOn && todayReadiness
          ? scaleFor(band(todayReadiness.score))
          : NEUTRAL_SCALE,
        deloadActive,
      ),
    [settings.autoregOn, todayReadiness, deloadActive],
  );

  const recTpl = TEMPLATE[nextIndex];
  const recList = useMemo(
    () =>
      applyReadiness(
        fitToBudget(sessionOf(recTpl.key, backSafeActive), settings.timeBudgetMin, {
          protectCore: backSafeActive,
          choices,
        }).list,
        readinessScale,
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [recTpl, choices, equip, custom, backSafeActive, settings.timeBudgetMin, readinessScale],
  );
  const estimatedMin = useMemo(() => estimateSessionMin(recList), [recList]);

  const lastDate = log.length ? new Date(log[log.length - 1].date) : null;
  const daysAgo = lastDate
    ? Math.floor((Date.now() - lastDate.getTime()) / 86400000)
    : null;
  const lastLabel =
    daysAgo == null
      ? "noch kein Training"
      : daysAgo === 0
        ? "heute trainiert"
        : daysAgo === 1
          ? "gestern trainiert"
          : `vor ${daysAgo} Tagen trainiert`;

  const weekCount = useMemo(() => {
    const now = new Date();
    const off = (now.getDay() + 6) % 7;
    const mon = new Date(now);
    mon.setHours(0, 0, 0, 0);
    mon.setDate(now.getDate() - off);
    return log.filter((s) => new Date(s.date) >= mon).length;
  }, [log]);

  const muscleVolumes = useMemo(
    () => weeklyMuscleVolume(log, allLib),
    [log, allLib],
  );

  // ATLAS-Substrat: Ermüdung, Phase und Wochen-Sätze einmal zentral rechnen —
  // vorher taten das mehrere Karten ad hoc mit vollen Log-Scans pro Render.
  const fatigue = useMemo(() => fatigueState(log, cardio), [log, cardio]);
  const phase = useMemo(() => {
    const minDate = log.length
      ? Math.min(...log.map((s) => new Date(s.date).getTime()))
      : Date.now();
    return phaseState(settings, fatigue.band, (Date.now() - minDate) / (7 * 86_400_000));
  }, [settings, fatigue, log]);
  const weekSetStats = useMemo(() => weeklySetStats(log), [log]);

  const coach = useMemo(
    () =>
      coachCards({
        log,
        allLib,
        settings,
        seeDoctor,
        lastBackRed,
        muscleVolumes,
        cardio,
        body,
        fatigueBand: fatigue.band,
      }).filter((c) => !dismissed.includes(c.kind + (c.exId ?? ""))),
    [log, allLib, settings, seeDoctor, lastBackRed, muscleVolumes, cardio, body, dismissed, fatigue],
  );

  const cardioTip = useMemo(() => cardioAdvice(cardio), [cardio]);

  // ATLAS — die überwachende Trainer-Intelligenz. Bewusst OHNE `entries` in
  // den Deps: kein Recompute pro Tastendruck im laufenden Training. Die
  // eingefrorene Wochen-Mission (storedTargets) speist die Meter, sobald sie
  // geladen ist — sonst generiert trainerState frische Ziele.
  const trainerInput = useMemo<TrainerInput>(
    () => ({
      log,
      allLib,
      settings,
      cardio,
      muscleVolumes,
      fatigue,
      phase,
      weekSets: weekSetStats,
      seeDoctor,
      lastBackRed,
      backSpareToday,
      todayReadiness,
      cardioLevel: cardioTip.level,
      recTpl,
      recList,
      estimatedMin,
      weekCount,
      daysAgo,
      storedTargets: mission?.targets,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [log, allLib, settings, cardio, muscleVolumes, fatigue, phase, weekSetStats,
     seeDoctor, lastBackRed, backSpareToday, todayReadiness, cardioTip, recTpl, recList, estimatedMin, weekCount, daysAgo, mission],
  );
  const trainer = useMemo<TrainerState>(() => {
    try {
      return trainerState(trainerInput);
    } catch (err) {
      // Letzte Verteidigungslinie: ATLAS degradiert auf den Kaltstart-Zustand
      // (leerer Log = garantiert sicher), statt die ganze App per global-error
      // niederzureißen. Die Sanitizer in loadAll sollten das nie auslösen.
      // eslint-disable-next-line no-console
      console.error("trainerState fehlgeschlagen — ATLAS degradiert:", err);
      return trainerState({ ...trainerInput, log: [], allLib: LIB, cardio: [], storedTargets: undefined });
    }
  }, [trainerInput]);

  // Wochen-Rollover: Montag friert ATLAS neue Ziele ein; die Vorwoche wird
  // reviewt und füttert den Rapport. Guard (weekKey identisch) verhindert
  // jede Schleife; der Zwei-Geräte-Fall heilt sich über denselben Check.
  useEffect(() => {
    if (loading) return;
    // In try/catch: ein Fehler in reviewMission/generateMissionTargets darf als
    // Effekt-Wurf nicht die Root-Boundary (global-error) auslösen.
    try {
      const wk = weekKeyOf(new Date());
      if (mission?.targets?.weekKey === wk) return;
      const lastReview = mission ? reviewMission(mission.targets, log, allLib) : undefined;
      const next: StoredMission = {
        version: 1,
        targets: generateMissionTargets({ ...trainerInput, storedTargets: undefined }),
        generatedAt: new Date().toISOString(),
        lastReview,
      };
      setMission(next);
      void storage.setJSON(KEYS.mission, next);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("Mission-Rollover übersprungen:", err);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, mission, log, allLib]);

  // Apple-Fitness activity rings: Einheiten · Volumen · Muskel-Abdeckung.
  const ringMetrics = useMemo<RingMetric[]>(() => {
    const wv = weeklyVolume(log);
    const baseline = rollingWeeklyBaseline(log);
    const volTarget = baseline > 0 ? baseline : Math.max(Math.round(wv), 1);
    const cov = coverageCount(muscleVolumes);
    return [
      { id: "move", value: weekCount, target: 3, label: "Einheiten", color: RING.move },
      { id: "exercise", value: Math.round(wv), target: volTarget, label: "Volumen", color: RING.exercise },
      { id: "stand", value: cov.hit, target: cov.total, label: "Abdeckung", color: RING.stand },
    ];
  }, [log, weekCount, muscleVolumes]);

  const saveExerciseVideos = async (next: Record<string, string>) => {
    setExerciseVideos(next);
    await storage.setJSON(KEYS.exerciseVideos, next);
  };
  // Attach / replace / clear a user-picked YouTube demo clip for one exercise.
  // Stores the raw URL (the embed is derived at render); rejects anything that
  // doesn't parse as YouTube and clears the entry on empty/invalid input, so the
  // map never holds an un-embeddable URL. Persists + cloud-syncs like every store.
  const setExerciseVideo = (exId: string, url: string | null) => {
    const trimmed = (url ?? "").trim();
    const next = { ...exerciseVideos };
    if (!trimmed || !youtubeEmbedUrl(trimmed)) delete next[exId];
    else next[exId] = trimmed;
    void saveExerciseVideos(next);
  };
  const saveExerciseNotes = async (next: Record<string, string>) => {
    setExerciseNotes(next);
    await storage.setJSON(KEYS.exerciseNotes, next);
  };
  // Hilfsmittel-/Ausführungs-Notiz je Übung setzen/löschen (z. B. „Unterstützungs-
  // band"). Dauerhaft je Übungs-Id gemerkt und beim Speichern auf die Einheit
  // gestempelt; leer → Eintrag entfernen. Cap gegen Prompt-Aufblähung.
  const setExerciseNote = (exId: string, note: string | null) => {
    const trimmed = (note ?? "").trim().slice(0, 120);
    const next = { ...exerciseNotes };
    if (!trimmed) delete next[exId];
    else next[exId] = trimmed;
    void saveExerciseNotes(next);
  };
  const saveEquip = async (next: EquipKey[]) => {
    setEquip(next);
    await storage.setJSON(KEYS.equip, next);
  };
  const saveCustom = async (next: Exercise[]) => {
    setCustom(next);
    await storage.setJSON(KEYS.custom, next);
  };
  const saveSettings = async (next: AppSettings) => {
    setSettings(next);
    await storage.setJSON(KEYS.settings, next);
  };

  const saveGyms = async (next: GymProfile[]) => {
    setGyms(next);
    await storage.setJSON(KEYS.gyms, next);
  };
  const switchGym = (id: string) => {
    const g = gyms.find((x) => x.id === id);
    if (!g) return;
    void saveEquip(g.equip);
    void saveSettings({ ...settings, activeGymId: id });
  };
  const addGym = (name: string, equipPreset?: EquipKey[]) => {
    const g: GymProfile = {
      id: "gym_" + Date.now(),
      name: name.trim() || "Neues Gym",
      equip: equipPreset ? [...equipPreset] : [...equip],
    };
    void saveGyms([...gyms, g]);
    void saveSettings({ ...settings, activeGymId: g.id });
    // Preset-Profile (z. B. Studio) schalten die Geräteliste direkt um.
    if (equipPreset) void saveEquip([...equipPreset]);
  };
  const removeGym = (id: string) => {
    if (gyms.length <= 1) return;
    const next = gyms.filter((g) => g.id !== id);
    void saveGyms(next);
    if (settings.activeGymId === id) {
      void saveEquip(next[0].equip);
      void saveSettings({ ...settings, activeGymId: next[0].id });
    }
  };
  const setWeightStep = (step: number) =>
    void saveSettings({ ...settings, weightStep: step });
  const setBikeWarmup = (on: boolean) =>
    void saveSettings({ ...settings, bikeWarmup: on });
  const setCoachMotivation = (on: boolean) =>
    void saveSettings({ ...settings, coachMotivation: on });

  // Ensure one gym profile exists — migrate from the flat equipment list.
  useEffect(() => {
    if (loading || gyms.length > 0) return;
    const g: GymProfile = { id: "gym_" + Date.now(), name: "Mein Gym", equip };
    void saveGyms([g]);
    void saveSettings({ ...settings, activeGymId: g.id });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, gyms.length]);
  const setBudget = (min: number) =>
    void saveSettings({ ...settings, timeBudgetMin: min });
  const setKeepAwake = (on: boolean) =>
    void saveSettings({ ...settings, keepAwake: on });
  const setAiPlanning = (on: boolean) =>
    void saveSettings({ ...settings, aiPlanning: on });
  const setCoachLive = (on: boolean) =>
    void saveSettings({ ...settings, coachLive: on });
  /** Zünd-Check: Sprunghöhe festhalten (7-Tage-Schnitt = Referenz). */
  const addJump = (heightCm: number) => {
    const next = [...jumps, { date: new Date().toISOString(), heightCm }].slice(-60);
    setJumps(next);
    void storage.setJSON(KEYS.jumps, next);
  };

  /** Heutige Einheit setzen + persistieren (KEYS.today, synct mit). */
  const setTodaySession = (s: DailySession | null) => {
    setTodaySessionState(s);
    if (s) void storage.setJSON(KEYS.today, s);
    else void storage.remove(KEYS.today);
  };

  // Sprungtests laden (unkritisch fürs erste Rendern — darf nachladen).
  useEffect(() => {
    void storage.getJSON<JumpEntry[]>(KEYS.jumps, []).then((js) => {
      if (Array.isArray(js))
        setJumps(js.filter((j) => j && typeof j.date === "string" && j.heightCm > 0));
    });
  }, []);

  // Signalton-Lautstärke ins Audio-Modul spiegeln — beep() UND speak() lesen sie,
  // damit WarmupPlayer und JumpCheck ohne eigene Änderung profitieren.
  useEffect(() => {
    setBeepCueVolume(settings.cueVolume ?? 1);
  }, [settings.cueVolume]);

  const setVoiceCues = (on: boolean) =>
    void saveSettings({ ...settings, voiceCues: on });
  const setCueVolume = (v: number) =>
    void saveSettings({ ...settings, cueVolume: v });
  const setTheme = (t: ThemePref) =>
    void saveSettings({ ...settings, theme: t });
  const setIcon = (icon: IconConfig | undefined) =>
    void saveSettings({ ...settings, icon });
  const setAccentOverride = (hex: string | undefined) =>
    void saveSettings({ ...settings, accentOverride: hex });
  const setAccent = (id: string) =>
    void saveSettings({ ...settings, accentColor: id });
  const setUserName = (name: string) =>
    void saveSettings({ ...settings, userName: name.trim() || undefined });
  const setAthleteProfile = (patch: Partial<AthleteProfile>) =>
    void saveSettings({
      ...settings,
      athleteProfile: { ...settings.athleteProfile, ...patch },
    });
  const completeOnboarding = (name?: string, profile?: Partial<AthleteProfile>) =>
    void saveSettings({
      ...settings,
      onboarded: true,
      userName: name?.trim() ? name.trim() : settings.userName,
      athleteProfile: profile
        ? { ...settings.athleteProfile, ...profile }
        : settings.athleteProfile,
    });

  const saveCardio = async (next: CardioSession[]) => {
    setCardio(next);
    await storage.setJSON(KEYS.cardio, next);
  };
  // Manually logged endurance session (run/interval/ride/…) — the "manual"
  // source seam, deduped by id like Strava imports.
  const addManualCardio = async (entry: Omit<CardioSession, "id" | "source">) => {
    const id = `manual-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    await saveCardio(mergeCardio(cardio, [{ ...entry, id, source: "manual" }]));
  };
  const removeCardio = async (id: string) => {
    await saveCardio(cardio.filter((c) => c.id !== id));
    // Import-Einheiten (nicht-manuell) als Grabstein merken, damit der nächste
    // Sync sie nicht wieder einspielt. Manuelle IDs kommen nie zurück.
    if (!id.startsWith("manual-") && !hiddenCardio.includes(id)) {
      const next = [...hiddenCardio, id];
      setHiddenCardio(next);
      await storage.setJSON(KEYS.hiddenCardio, next);
    }
  };
  type StravaTokens = NonNullable<AppSettings["strava"]>;
  const stravaPost = async (payload: Record<string, unknown>) => {
    const res = await fetch("/api/strava", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return (await res.json()) as {
      ok: boolean;
      error?: string;
      reauth?: boolean;
      tokens?: StravaTokens;
      rides?: CardioSession[];
    };
  };
  const strava: StravaApi = {
    connected: !!settings.strava?.refreshToken,
    athlete: settings.strava?.athleteName ?? null,
    busy: stravaBusy,
    connect: async (code) => {
      setStravaBusy(true);
      try {
        const j = await stravaPost({ action: "exchange", code });
        if (!j.ok || !j.tokens) return { ok: false, error: j.error };
        const tokens = j.tokens;
        await saveSettings({ ...settings, strava: tokens });
        // Pull activities right away so the rides show up immediately.
        const s = await stravaPost({
          action: "sync",
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          expiresAt: tokens.expiresAt,
        });
        if (s.ok && s.rides)
          await saveCardio(
            pruneOldImports(mergeCardio(cardio, s.rides.filter((r) => !hiddenCardio.includes(r.id)))),
          );
        return { ok: true };
      } catch (e) {
        return { ok: false, error: e instanceof Error ? e.message : "Netzwerkfehler" };
      } finally {
        setStravaBusy(false);
      }
    },
    syncNow: async () => {
      const t = settings.strava;
      if (!t?.refreshToken) return { ok: false, error: "Nicht verbunden." };
      setStravaBusy(true);
      try {
        const j = await stravaPost({
          action: "sync",
          accessToken: t.accessToken,
          refreshToken: t.refreshToken,
          expiresAt: t.expiresAt,
        });
        if (!j.ok) return { ok: false, error: j.error };
        if (j.rides)
          await saveCardio(
            pruneOldImports(mergeCardio(cardio, j.rides.filter((r) => !hiddenCardio.includes(r.id)))),
          );
        // Persist rotated tokens (keep the athlete name we already have).
        if (j.tokens)
          await saveSettings({
            ...settings,
            strava: { ...j.tokens, athleteName: t.athleteName },
          });
        return { ok: true };
      } catch (e) {
        return { ok: false, error: e instanceof Error ? e.message : "Netzwerkfehler" };
      } finally {
        setStravaBusy(false);
      }
    },
    disconnect: () => void saveSettings({ ...settings, strava: undefined }),
  };

  // Spotify uses OAuth PKCE (no server secret) — the token exchange/refresh and
  // now-playing polling live in the useSpotify hook; the provider only persists
  // the auth (so it syncs to the cloud like every other setting).
  const spotify: SpotifyApi = {
    configured: !!process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID,
    auth: settings.spotify,
    connect: async (auth) => {
      await saveSettings({ ...settings, spotify: auth });
    },
    disconnect: async () => {
      await saveSettings({ ...settings, spotify: undefined });
    },
  };

  const acceptExam = () =>
    void saveSettings({ ...settings, lastExamDate: new Date().toISOString() });
  const acceptDeload = () =>
    void saveSettings({ ...settings, lastDeloadDate: new Date().toISOString() });
  const dismissCard = (card: CoachCard) =>
    setDismissed((d) => [...d, card.kind + (card.exId ?? "")]);

  const toggleEquip = (k: EquipKey) => {
    const next = equip.includes(k) ? equip.filter((x) => x !== k) : [...equip, k];
    void saveEquip(next);
    const aid = settings.activeGymId;
    if (aid) void saveGyms(gyms.map((g) => (g.id === aid ? { ...g, equip: next } : g)));
  };

  /** Eingaben des Editors härten und in eine vollwertige Übung gießen —
   *  eigene Übungen sind erstklassig (Muskel, Equipment, Content) und fließen
   *  über `allLib` automatisch in Pools, Volumen und den ATLAS-Katalog. */
  const buildCustom = (id: string, data: CustomExerciseInput): Exercise => {
    const unit: Unit = data.unit === "Sek" ? "Sek" : "Wdh";
    const clampInt = (v: unknown, lo: number, hi: number, dflt: number) => {
      const n = Math.round(Number(v));
      return Number.isFinite(n) ? Math.max(lo, Math.min(hi, n)) : dflt;
    };
    const repLow = clampInt(data.repLow, 1, 180, unit === "Sek" ? 20 : 8);
    const repHigh = clampInt(data.repHigh, repLow, 180, Math.max(repLow, unit === "Sek" ? 45 : 12));
    const validReq = new Set<string>([...EQUIP_LIST.map((e) => e.key), "weight"]);
    const req = (data.req ?? []).filter((t) => validReq.has(t));
    const ex: Exercise = {
      id,
      name: data.name.trim().slice(0, 60) || "Eigene Übung",
      pattern: data.pattern,
      tag: "Eigene",
      req: req.length ? req : ["none"],
      weighted: !!data.weighted,
      sets: clampInt(data.sets, 1, 6, 3),
      repLow,
      repHigh,
      unit,
      cue: (data.cue ?? "").trim().slice(0, 160) || "Eigene Übung — sauber und kontrolliert ausführen.",
      steps: (data.steps ?? [])
        .map((s) => s.trim().slice(0, 160))
        .filter(Boolean)
        .slice(0, 4),
      back: (data.back ?? "").trim().slice(0, 160),
      easier: (data.easier ?? "").trim().slice(0, 160),
      custom: true,
    };
    if (data.muscle) ex.muscle = data.muscle;
    if (data.muscleSecondary && data.muscleSecondary !== data.muscle)
      ex.muscleSecondary = data.muscleSecondary;
    if (data.backCaution) ex.backCaution = true;
    return ex;
  };
  const addCustom = (data: CustomExerciseInput) => {
    void saveCustom([...custom, buildCustom("custom_" + Date.now(), data)]);
  };
  const updateCustom = (id: string, data: CustomExerciseInput) => {
    void saveCustom(custom.map((e) => (e.id === id ? buildCustom(id, data) : e)));
  };
  const removeCustom = (id: string) => {
    void saveCustom(custom.filter((e) => e.id !== id));
    if (exerciseVideos[id]) {
      const next = { ...exerciseVideos };
      delete next[id];
      void saveExerciseVideos(next);
    }
    if (exerciseNotes[id]) {
      const next = { ...exerciseNotes };
      delete next[id];
      void saveExerciseNotes(next);
    }
  };

  const saveDays = async (next: WorkoutDay[]) => {
    setDays(next);
    await storage.setJSON(KEYS.days, next);
  };
  const addDay = (day: WorkoutDay) => void saveDays([...days, day]);
  const updateDay = (day: WorkoutDay) =>
    void saveDays(days.map((d) => (d.id === day.id ? day : d)));
  const removeDay = (id: string) => void saveDays(days.filter((d) => d.id !== id));

  /** Den Live-State des Runners als LoggedSession speichern. Items × Item-
   *  Protokoll werden zu Übungs-Snapshots; die Heute-Einheit bekommt ihren
   *  Erledigt-Stempel (in der real trainierten, ggf. umgebauten Fassung). */
  const saveActiveSession = async (
    state: ActiveSessionState,
  ): Promise<SessionSummary | null> => {
    const s = state.session;
    const byId = new Map(allLib.map((e) => [e.id, e]));
    const exercises: SessionExercise[] = [];
    for (const it of s.items) {
      const ex = byId.get(it.exerciseId);
      if (!ex) continue;
      const sets = (state.entries[it.id] || [])
        .map((x) => {
          const out: SetEntry = { weight: x.weight, reps: x.reps };
          if (x.rir != null) out.rir = x.rir;
          if (x.intensity != null) out.intensity = x.intensity;
          if (x.warmup) out.warmup = true;
          return out;
        })
        // Only truly filled sets (reps present) — weight-prefilled empty sets
        // are suggestions, not performed work.
        .filter((x) => x.reps !== "" && x.reps != null);
      // An exercise counts only with ≥1 filled WORKING set. Warmups alone are
      // auto-prefilled (reps "5") and used to slip through as ghost sessions,
      // inflating streak/XP and corrupting the next prescription.
      if (!sets.some((x) => !x.warmup)) continue;
      const mapped: SessionExercise = { id: ex.id, name: ex.name, unit: ex.unit, sets };
      // Hilfsmittel-Notiz als Snapshot mitschreiben (was an dem Tag galt).
      const exNote = exerciseNotes[ex.id];
      if (exNote) mapped.note = exNote;
      exercises.push(mapped);
    }
    if (!exercises.length) {
      // Nothing real was performed → don't log a session; still clear state.
      void storage.remove(KEYS.active);
      setTodayReadiness(null);
      setBackSpareToday(false);
      return null;
    }
    const newSession: LoggedSession = {
      date: new Date().toISOString(),
      dayKey: "today",
      dayName: s.name,
      focus: s.focus,
      exercises,
      estimatedMin: estimateSessionMin(resolveDailySession(s, allLib, has)),
    };
    if (state.backTraffic) newSession.backTraffic = state.backTraffic;
    const noteText = (state.note ?? "").trim();
    if (noteText) newSession.note = noteText;
    if (state.readiness) newSession.readiness = state.readiness;
    if (deloadActive) newSession.isDeload = true;
    if (s.variant === "exam") newSession.isExam = true;
    if (s.variant === "reset") newSession.isBackReset = true;
    const newLog = [...log, newSession];
    // Summary for the completion takeover — computed BEFORE state clears so
    // the celebration can show exactly what this session achieved.
    const lvlBefore = trainingLevel({ log, allLib, settings });
    const lvlAfter = trainingLevel({ log: newLog, allLib, settings });
    const week = weeklySetStats(newLog);
    const core = {
      sets: exercises.reduce((a, ex) => a + ex.sets.filter((x) => !x.warmup).length, 0),
      tonnage: sessionVolume(newSession),
      prs: prTimeline(newLog).filter((e) => e.date === newSession.date).length,
      levelBefore: lvlBefore.level,
      levelAfter: lvlAfter.level,
      xpPctFrom: lvlAfter.level > lvlBefore.level ? 0 : lvlBefore.pct,
      xpPctTo: lvlAfter.pct,
      weekSets: week.collected,
      weekTarget: week.target,
    };
    // ATLAS-Debrief: VOR dem Log-Write erzeugen und an die Session hängen —
    // so fließt es in Persistenz + Cloud-Sync und bleibt für immer stabil.
    const debrief = sessionDebrief({
      session: newSession,
      log: newLog,
      allLib,
      summary: core,
      readiness: state.readiness ?? null,
    });
    newSession.debrief = debrief;
    const summary: SessionSummary = { ...core, debrief };
    setSaving(true);
    await storage.setJSON(KEYS.log, newLog);
    setLog(newLog);
    setSaving(false);
    // Heute-Einheit als erledigt stempeln — die Startseite zeigt dann Ruhe
    // statt eines abgearbeiteten Plans.
    setTodaySession({ ...s, completedAt: new Date().toISOString() });
    void storage.remove(KEYS.active);
    setTodayReadiness(null);
    setBackSpareToday(false);
    return summary;
  };

  /** Das gestreamte KI-Debrief nachträglich an die eben gespeicherte Einheit
   *  schreiben — Verlauf und Cloud zeigen dann dauerhaft dieselben Zeilen wie
   *  der Sieger-Moment. */
  const amendLastDebrief = (lines: string[]) => {
    const clean = lines.map((l) => l.trim()).filter(Boolean).slice(0, 3);
    if (!clean.length) return;
    setLog((prev) => {
      if (!prev.length) return prev;
      const next = [...prev];
      next[next.length - 1] = { ...next[next.length - 1], debrief: clean };
      void storage.setJSON(KEYS.log, next);
      return next;
    });
  };

  // Leave an active session WITHOUT saving — clears the persisted live state
  // so a discarded workout isn't silently resumed or logged.
  const discardActive = () => {
    void storage.remove(KEYS.active);
    setTodayReadiness(null);
    setBackSpareToday(false);
  };

  const deleteSession = async (realIdx: number) => {
    const newLog = log.filter((_, i) => i !== realIdx);
    setLog(newLog);
    if (newLog.length) await storage.setJSON(KEYS.log, newLog);
    else await storage.remove(KEYS.log);
  };

  const resetAll = async () => {
    await storage.remove(KEYS.log);
    setLog([]);
  };

  const addBodyMetric = async (m: BodyMetric) => {
    const next = [...body, m].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    );
    setBody(next);
    await storage.setJSON(KEYS.body, next);
  };
  const deleteBodyMetric = async (idx: number) => {
    const target = body[idx];
    if (target?.photoId) void deletePhoto(target.photoId);
    const next = body.filter((_, i) => i !== idx);
    setBody(next);
    if (next.length) await storage.setJSON(KEYS.body, next);
    else await storage.remove(KEYS.body);
  };

  const exportData = (): ExportEnvelope => ({
    schemaVersion: 3,
    exportedAt: new Date().toISOString(),
    log,
    equip,
    choices,
    custom,
    body,
    cardio,
    days,
    gyms,
    exerciseVideos,
    exerciseNotes,
    settings,
  });

  const importData = async (raw: unknown): Promise<boolean> => {
    if (!raw || typeof raw !== "object") return false;
    const d = raw as Record<string, unknown>;
    if (!Array.isArray(d.log)) return false;
    // Sanitizer statt roher Cast — dieselbe Härtung wie loadAll (eine Wahrheit).
    // Ein fehlendes Feld behält den aktuellen State (Teil-Backup löscht nichts).
    const nextLog = sanitizeSessions(d.log);
    const nextEquip = Array.isArray(d.equip) ? (d.equip as EquipKey[]) : equip;
    const nextChoices = d.choices !== undefined ? sanitizeStringMap(d.choices) : choices;
    const nextCustom = d.custom !== undefined ? sanitizeCustom(d.custom) : custom;
    const nextBody = d.body !== undefined ? sanitizeBody(d.body) : body;
    const nextCardio = d.cardio !== undefined ? sanitizeCardio(d.cardio) : cardio;
    const nextDays = d.days !== undefined ? sanitizeDays(d.days) : days;
    const nextGyms = d.gyms !== undefined ? sanitizeGyms(d.gyms) : gyms;
    const nextExerciseVideos =
      d.exerciseVideos !== undefined ? sanitizeVideoMap(d.exerciseVideos) : exerciseVideos;
    const nextExerciseNotes =
      d.exerciseNotes !== undefined ? sanitizeStringMap(d.exerciseNotes) : exerciseNotes;
    const nextSettings =
      d.settings && typeof d.settings === "object"
        ? { ...DEFAULT_SETTINGS, ...(d.settings as AppSettings) }
        : settings;
    setLog(nextLog);
    setEquip(nextEquip);
    setChoices(nextChoices);
    setCustom(nextCustom);
    setBody(nextBody);
    setCardio(nextCardio);
    setDays(nextDays);
    setGyms(nextGyms);
    setExerciseVideos(nextExerciseVideos);
    setExerciseNotes(nextExerciseNotes);
    setSettings(nextSettings);
    await Promise.all([
      storage.setJSON(KEYS.log, nextLog),
      storage.setJSON(KEYS.equip, nextEquip),
      storage.setJSON(KEYS.choices, nextChoices),
      storage.setJSON(KEYS.custom, nextCustom),
      storage.setJSON(KEYS.body, nextBody),
      storage.setJSON(KEYS.cardio, nextCardio),
      storage.setJSON(KEYS.days, nextDays),
      storage.setJSON(KEYS.gyms, nextGyms),
      storage.setJSON(KEYS.exerciseVideos, nextExerciseVideos),
      storage.setJSON(KEYS.exerciseNotes, nextExerciseNotes),
      storage.setJSON(KEYS.settings, nextSettings),
    ]);
    return true;
  };

  const value: TrainingContextValue = {
    log,
    equip,
    choices,
    custom,
    exerciseVideos,
    exerciseNotes,
    body,
    loading,
    saving,
    allLib,
    has,
    recTpl,
    recList,
    estimatedMin,
    settings,
    todayReadiness,
    readinessScale,
    ringMetrics,
    muscleVolumes,
    coach,
    cardioAdvice: cardioTip,
    fatigue,
    phase,
    weekSetStats,
    trainer,
    mission,
    weekCount,
    daysAgo,
    lastLabel,
    lastBackRed,
    backSpareToday,
    setBackSpareToday,
    backSafeActive,
    seeDoctor,
    lastPerf,
    toggleEquip,
    addCustom,
    updateCustom,
    removeCustom,
    setExerciseVideo,
    setExerciseNote,
    days,
    addDay,
    updateDay,
    removeDay,
    gyms,
    switchGym,
    addGym,
    removeGym,
    saveActiveSession,
    amendLastDebrief,
    discardActive,
    deleteSession,
    resetAll,
    setBudget,
    setVoiceCues,
    setCueVolume,
    setTheme,
    setIcon,
    setAccentOverride,
    setAccent,
    setWeightStep,
    setBikeWarmup,
    setCoachMotivation,
    setKeepAwake,
    setAiPlanning,
    setCoachLive,
    todaySession,
    setTodaySession,
    jumps,
    addJump,
    setUserName,
    setAthleteProfile,
    completeOnboarding,
    setReadiness: (r) => setTodayReadiness(r),
    acceptDeload,
    acceptExam,
    dismissCard,
    addBodyMetric,
    deleteBodyMetric,
    exportData,
    importData,
    cardio,
    addManualCardio,
    removeCardio,
    strava,
    spotify,
    cloud,
  };

  return (
    <TrainingContext.Provider value={value}>{children}</TrainingContext.Provider>
  );
}
