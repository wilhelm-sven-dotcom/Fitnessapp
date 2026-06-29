"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { CARDIO_DAY, DEFAULT_EQUIP, LIB, TEMPLATE } from "@/lib/exercises";
import { coachCards, type CoachCard } from "@/lib/advisor";
import { cardioAdvice, type CardioAdvice } from "@/lib/cardio-advice";
import { presc, resolveDay, resolveSession, warmupSets } from "@/lib/progression";
import { effectiveProfile } from "@/lib/athlete";
import { exerciseAffinity } from "@/lib/affinity";
import {
  NEUTRAL_SCALE,
  band,
  scaleFor,
  type ReadinessScale,
} from "@/lib/readiness";
import { estimateSessionMin, fitToBudget } from "@/lib/session-time";
import { RING, type RingMetric } from "@/lib/ring-colors";
import {
  coverageCount,
  rollingWeeklyBaseline,
  weeklyMuscleVolume,
  weeklyVolume,
  type MuscleVolume,
} from "@/lib/volume";
import { KEYS, storage, cloudPull, cloudPushAll } from "@/lib/storage";
import { getSupabase, isCloudConfigured } from "@/lib/supabase";
import { deletePhoto } from "@/lib/photo-store";
import {
  applySkin,
  applyTheme,
  DEFAULT_ACCENT,
  DEFAULT_SKIN,
  onAccent,
  type SkinId,
  type ThemePref,
} from "@/lib/theme";
import { mergeCardio } from "@/lib/cardio";
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
  Pattern,
  ResolvedSlot,
  SetEntry,
  Template,
  TrafficLight,
  Unit,
  WorkoutDay,
} from "@/lib/types";

export interface AddCustomData {
  name: string;
  pattern: Pattern;
  unit: Unit;
  weighted: boolean;
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
  settings?: AppSettings;
}

const DEFAULT_SETTINGS: AppSettings = {
  timeBudgetMin: 25,
  autoregOn: true,
  voiceCues: false,
  superset: false,
  theme: "dark",
  skin: DEFAULT_SKIN,
  accentColor: DEFAULT_ACCENT,
};

/** A deload overrides readiness with a clearly lighter week. */
function withDeload(base: ReadinessScale, deloadActive: boolean): ReadinessScale {
  return deloadActive
    ? { setDelta: -1, loadMult: Math.min(base.loadMult, 0.6), cap: true }
    : base;
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
  body: BodyMetric[];
  loading: boolean;
  saving: boolean;
  activeKey: string | null;
  entries: Record<string, SetEntry[]>;
  backTraffic: TrafficLight | null;
  note: string;
  allLib: Exercise[];
  has: (k: string) => boolean;
  nextIndex: number;
  recTpl: Template;
  recList: ResolvedSlot[];
  activeList: ResolvedSlot[];
  estimatedMin: number;
  settings: AppSettings;
  todayReadiness: Readiness | null;
  readinessScale: ReadinessScale;
  ringMetrics: RingMetric[];
  muscleVolumes: MuscleVolume[];
  coach: CoachCard[];
  cardioAdvice: CardioAdvice;
  weekCount: number;
  daysAgo: number | null;
  lastLabel: string;
  lastBackRed: boolean;
  seeDoctor: boolean;
  lastPerf: (id: string) => LastPerf | null;
  sessionOf: (key: string, backSafe?: boolean) => ResolvedSlot[];
  sessionTemplate: (key: string) => Template | null;
  startSession: (key: string, readiness?: Readiness) => void;
  setEntry: (
    exId: string,
    i: number,
    field: keyof SetEntry,
    val: string | number | boolean | undefined,
  ) => void;
  swapExercise: (slotKey: string, newId: string) => void;
  toggleEquip: (k: EquipKey) => void;
  addCustom: (data: AddCustomData) => void;
  removeCustom: (id: string) => void;
  days: WorkoutDay[];
  addDay: (day: WorkoutDay) => void;
  updateDay: (day: WorkoutDay) => void;
  removeDay: (id: string) => void;
  gyms: GymProfile[];
  switchGym: (id: string) => void;
  addGym: (name: string) => void;
  removeGym: (id: string) => void;
  saveSession: () => Promise<void>;
  deleteSession: (realIdx: number) => Promise<void>;
  resetAll: () => Promise<void>;
  setBackTraffic: (v: TrafficLight | null) => void;
  setNote: (v: string) => void;
  setBudget: (min: number) => void;
  setVoiceCues: (on: boolean) => void;
  setSuperset: (on: boolean) => void;
  setTheme: (t: ThemePref) => void;
  setSkin: (skin: SkinId) => void;
  setIcon: (icon: IconConfig | undefined) => void;
  setAccentOverride: (hex: string | undefined) => void;
  setAccent: (id: string) => void;
  setWeightStep: (step: number) => void;
  setBikeWarmup: (on: boolean) => void;
  setCardioFinisher: (on: boolean) => void;
  setUserName: (name: string) => void;
  setAthleteProfile: (patch: Partial<AthleteProfile>) => void;
  completeOnboarding: (name?: string, profile?: Partial<AthleteProfile>) => void;
  setReadiness: (r: Readiness) => void;
  acceptDeload: () => void;
  dismissCard: (card: CoachCard) => void;
  addBodyMetric: (m: BodyMetric) => Promise<void>;
  deleteBodyMetric: (idx: number) => Promise<void>;
  exportData: () => ExportEnvelope;
  importData: (raw: unknown) => Promise<boolean>;
  cardio: CardioSession[];
  strava: StravaApi;
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
  const [days, setDays] = useState<WorkoutDay[]>([]);
  const [gyms, setGyms] = useState<GymProfile[]>([]);
  const [stravaBusy, setStravaBusy] = useState(false);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [entries, setEntries] = useState<Record<string, SetEntry[]>>({});
  const [backTraffic, setBackTrafficState] = useState<TrafficLight | null>(null);
  const [note, setNoteState] = useState("");
  const [todayReadiness, setTodayReadiness] = useState<Readiness | null>(null);
  const [dismissed, setDismissed] = useState<string[]>([]);

  // Read every key from the local cache into state. Reused after a cloud pull.
  const loadAll = useCallback(async () => {
    const [l, e, c, cu, b, s, ca, da, gy] = await Promise.all([
      storage.getJSON<LoggedSession[]>(KEYS.log, []),
      storage.getJSON<EquipKey[]>(KEYS.equip, DEFAULT_EQUIP),
      storage.getJSON<Record<string, string>>(KEYS.choices, {}),
      storage.getJSON<Exercise[]>(KEYS.custom, []),
      storage.getJSON<BodyMetric[]>(KEYS.body, []),
      storage.getJSON<AppSettings>(KEYS.settings, DEFAULT_SETTINGS),
      storage.getJSON<CardioSession[]>(KEYS.cardio, []),
      storage.getJSON<WorkoutDay[]>(KEYS.days, []),
      storage.getJSON<GymProfile[]>(KEYS.gyms, []),
    ]);
    if (Array.isArray(l)) setLog(l);
    if (Array.isArray(e)) setEquip(e);
    if (c && typeof c === "object") setChoices(c);
    if (Array.isArray(cu)) setCustom(cu);
    if (Array.isArray(b)) setBody(b);
    if (s && typeof s === "object") setSettings({ ...DEFAULT_SETTINGS, ...s });
    if (Array.isArray(ca)) setCardio(ca);
    if (Array.isArray(da)) setDays(da);
    if (Array.isArray(gy)) setGyms(gy);
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  // Apply theme + skin to <html>; follow system changes when theme is "system".
  // Skip while loading so the default (tactile) never overrides the pre-paint
  // data-skin before the saved settings arrive — otherwise the splash and a
  // first-paint flash would show the wrong skin.
  useEffect(() => {
    if (loading) return;
    // Optional accent override wins over the skin's --accent (inline > CSS).
    const applyAccent = () => {
      const root = document.documentElement;
      if (settings.accentOverride) {
        root.style.setProperty("--accent", settings.accentOverride);
        root.style.setProperty("--on-accent", onAccent(settings.accentOverride));
      } else {
        root.style.removeProperty("--accent");
        root.style.removeProperty("--on-accent");
      }
    };
    applyTheme(settings.theme);
    applySkin(settings.skin);
    applyAccent();
    if (settings.theme !== "system" || typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-color-scheme: light)");
    const onChange = () => {
      applyTheme(settings.theme);
      applySkin(settings.skin);
      applyAccent();
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [loading, settings.theme, settings.skin, settings.accentOverride]);

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
      await Promise.all(
        Object.entries(map)
          .filter(([k]) => known.has(k))
          .map(([k, v]) => storage.setRaw(k, v)),
      );
      await loadAll();
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
      if (ex && ex.sets && ex.sets.some((s) => s.reps !== "" && s.reps != null))
        return { sets: ex.sets, date: log[i].date };
    }
    return null;
  };

  const lastBackRed =
    log.length > 0 && log[log.length - 1].backTraffic === "red";
  const seeDoctor =
    log.length >= 2 &&
    log[log.length - 1].backTraffic === "red" &&
    log[log.length - 2].backTraffic === "red";

  const athleteInjuries = effectiveProfile(settings, body).injuries;
  const affinity = exerciseAffinity(choices, log);
  const hasBike = (equip as string[]).includes("bike");
  const sessionOf = (key: string, backSafe = false): ResolvedSlot[] => {
    const day = days.find((d) => d.id === key);
    if (day) return resolveDay(day, allLib, has);
    if (key === CARDIO_DAY.key)
      return resolveSession(CARDIO_DAY, log.length, choices, has, allLib, {
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

  /** Append an optional Peloton finisher to A/B/C sessions (opt-in, needs a bike). */
  const withFinisher = (list: ResolvedSlot[], key: string): ResolvedSlot[] => {
    if (!settings.cardioFinisher || !hasBike) return list;
    if (key === CARDIO_DAY.key || days.some((d) => d.id === key)) return list;
    if (list.some((s) => s.ex.pattern === "cardio")) return list;
    const fin = allLib.find((e) => e.id === "bike_finisher");
    return fin ? [...list, { ex: fin, slotKey: "finisher", pool: [] }] : list;
  };

  // Real template, or a synthesized one for a custom day (slots = its patterns),
  // so workout / warmup / saveSession treat days exactly like A/B/C.
  const sessionTemplate = (key: string): Template | null => {
    const day = days.find((d) => d.id === key);
    if (day) {
      const byId = new Map(allLib.map((e) => [e.id, e]));
      const slots = day.items
        .map((it) => byId.get(it.exerciseId)?.pattern)
        .filter((p): p is Pattern => !!p);
      return { key: day.id, name: day.name, focus: day.focus, slots };
    }
    if (key === CARDIO_DAY.key) return CARDIO_DAY;
    return TEMPLATE.find((t) => t.key === key) ?? null;
  };

  const nextIndex = useMemo(() => {
    if (!log.length) return 0;
    const idx = TEMPLATE.findIndex((t) => t.key === log[log.length - 1].dayKey);
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
      withFinisher(
        applyReadiness(
          fitToBudget(sessionOf(recTpl.key, lastBackRed), settings.timeBudgetMin, {
            protectCore: lastBackRed,
            superset: settings.superset,
          }).list,
          readinessScale,
        ),
        recTpl.key,
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [recTpl, choices, equip, custom, lastBackRed, settings.timeBudgetMin, settings.superset, settings.cardioFinisher, readinessScale],
  );
  const estimatedMin = useMemo(
    () => estimateSessionMin(recList, { superset: settings.superset }),
    [recList, settings.superset],
  );

  // The session actually being trained — budget-trimmed, back-safe, readiness-scaled.
  // Both the workout screen and saveSession read this so shown == saved.
  const activeList = useMemo(() => {
    if (!activeKey) return [];
    const noTrim = days.some((d) => d.id === activeKey) || activeKey === CARDIO_DAY.key;
    const base = sessionOf(activeKey, lastBackRed);
    // Custom/cardio days are trained exactly as built (no budget auto-trim); A/B/C trim.
    const fitted = noTrim
      ? base
      : fitToBudget(base, settings.timeBudgetMin, {
          protectCore: lastBackRed,
          superset: settings.superset,
        }).list;
    return withFinisher(applyReadiness(fitted, readinessScale), activeKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeKey, choices, equip, custom, days, lastBackRed, settings.timeBudgetMin, settings.superset, settings.cardioFinisher, readinessScale]);

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

  const coach = useMemo(
    () =>
      coachCards({ log, allLib, settings, seeDoctor, muscleVolumes, cardio, body }).filter(
        (c) => !dismissed.includes(c.kind + (c.exId ?? "")),
      ),
    [log, allLib, settings, seeDoctor, muscleVolumes, cardio, body, dismissed],
  );

  const cardioTip = useMemo(() => cardioAdvice(cardio), [cardio]);

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

  const initEntryFor = (
    ex: Exercise,
    scale: ReadinessScale = readinessScale,
  ): SetEntry[] => {
    const p = presc(ex, lastPerf(ex.id), {
      lighter: daysAgo != null && daysAgo > 5,
      loadMult: scale.loadMult,
      cap: scale.cap,
      step: settings.weightStep,
    });
    const working: SetEntry[] = Array.from({ length: ex.sets }, () => ({
      weight: p.w,
      reps: "",
    }));
    const warm =
      ex.weighted && p.w && Number(p.w) > 0
        ? warmupSets(Number(p.w), settings.weightStep)
        : [];
    return [...warm, ...working];
  };

  const startSession = (key: string, readiness?: Readiness) => {
    const r = readiness ?? todayReadiness;
    const scale = withDeload(
      settings.autoregOn && r ? scaleFor(band(r.score)) : NEUTRAL_SCALE,
      deloadActive,
    );
    if (readiness) setTodayReadiness(readiness);
    const isDay = days.some((d) => d.id === key);
    const base = sessionOf(key, lastBackRed);
    const fitted = isDay
      ? base
      : fitToBudget(base, settings.timeBudgetMin, {
          protectCore: lastBackRed,
          superset: settings.superset,
        }).list;
    const list = applyReadiness(fitted, scale);
    const init: Record<string, SetEntry[]> = {};
    list.forEach(({ ex }) => {
      init[ex.id] = initEntryFor(ex, scale);
    });
    setEntries(init);
    setActiveKey(key);
    setBackTrafficState(null);
    setNoteState("");
  };

  const setEntry: TrainingContextValue["setEntry"] = (exId, i, field, val) => {
    setEntries((prev) => {
      const c = { ...prev };
      const arr = (c[exId] || []).map((s) => ({ ...s }));
      arr[i] = { ...arr[i], [field]: val };
      c[exId] = arr;
      return c;
    });
  };

  const saveChoices = async (next: Record<string, string>) => {
    setChoices(next);
    await storage.setJSON(KEYS.choices, next);
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
  const addGym = (name: string) => {
    const g: GymProfile = {
      id: "gym_" + Date.now(),
      name: name.trim() || "Neues Gym",
      equip: [...equip],
    };
    void saveGyms([...gyms, g]);
    void saveSettings({ ...settings, activeGymId: g.id });
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
  const setCardioFinisher = (on: boolean) =>
    void saveSettings({ ...settings, cardioFinisher: on });

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
  const setVoiceCues = (on: boolean) =>
    void saveSettings({ ...settings, voiceCues: on });
  const setSuperset = (on: boolean) =>
    void saveSettings({ ...settings, superset: on });
  const setTheme = (t: ThemePref) =>
    void saveSettings({ ...settings, theme: t });
  const setSkin = (skin: SkinId) =>
    void saveSettings({ ...settings, skin });
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
        if (s.ok && s.rides) await saveCardio(mergeCardio(cardio, s.rides));
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
        if (j.rides) await saveCardio(mergeCardio(cardio, j.rides));
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

  const acceptDeload = () =>
    void saveSettings({ ...settings, lastDeloadDate: new Date().toISOString() });
  const dismissCard = (card: CoachCard) =>
    setDismissed((d) => [...d, card.kind + (card.exId ?? "")]);

  const swapExercise = (slotKey: string, newId: string) => {
    const next = { ...choices, [slotKey]: newId };
    void saveChoices(next);
    const ex = allLib.find((e) => e.id === newId);
    if (ex)
      setEntries((prev) =>
        prev[newId] ? prev : { ...prev, [newId]: initEntryFor(ex) },
      );
  };

  const toggleEquip = (k: EquipKey) => {
    const next = equip.includes(k) ? equip.filter((x) => x !== k) : [...equip, k];
    void saveEquip(next);
    const aid = settings.activeGymId;
    if (aid) void saveGyms(gyms.map((g) => (g.id === aid ? { ...g, equip: next } : g)));
  };

  const addCustom = (data: AddCustomData) => {
    const id = "custom_" + Date.now();
    const ex: Exercise = {
      id,
      name: data.name,
      pattern: data.pattern,
      tag: "Eigene",
      req: ["none"],
      weighted: !!data.weighted,
      sets: 3,
      repLow: data.unit === "Sek" ? 20 : 8,
      repHigh: data.unit === "Sek" ? 45 : 12,
      unit: data.unit,
      cue: "Eigene Übung.",
      steps: [],
      back: "",
      easier: "",
      custom: true,
    };
    void saveCustom([...custom, ex]);
  };
  const removeCustom = (id: string) =>
    void saveCustom(custom.filter((e) => e.id !== id));

  const saveDays = async (next: WorkoutDay[]) => {
    setDays(next);
    await storage.setJSON(KEYS.days, next);
  };
  const addDay = (day: WorkoutDay) => void saveDays([...days, day]);
  const updateDay = (day: WorkoutDay) =>
    void saveDays(days.map((d) => (d.id === day.id ? day : d)));
  const removeDay = (id: string) => void saveDays(days.filter((d) => d.id !== id));

  const saveSession = async () => {
    const tpl = activeKey ? sessionTemplate(activeKey) : null;
    if (!tpl) return;
    const list = activeList;
    const exercises = list.map(({ ex }) => ({
      id: ex.id,
      name: ex.name,
      unit: ex.unit,
      sets: (entries[ex.id] || [])
        .map((s) => {
          const out: SetEntry = { weight: s.weight, reps: s.reps };
          if (s.rir != null) out.rir = s.rir;
          if (s.intensity != null) out.intensity = s.intensity;
          if (s.warmup) out.warmup = true;
          return out;
        })
        .filter(
          (s) =>
            (s.reps !== "" && s.reps != null) ||
            (s.weight !== "" && s.weight != null),
        ),
    }));
    const newSession: LoggedSession = {
      date: new Date().toISOString(),
      dayKey: tpl.key,
      dayName: tpl.name,
      focus: tpl.focus,
      exercises,
      estimatedMin: estimateSessionMin(activeList, { superset: settings.superset }),
    };
    if (backTraffic) newSession.backTraffic = backTraffic;
    if (note.trim()) newSession.note = note.trim();
    if (todayReadiness) newSession.readiness = todayReadiness;
    if (deloadActive) newSession.isDeload = true;
    const newLog = [...log, newSession];
    setSaving(true);
    await storage.setJSON(KEYS.log, newLog);
    setLog(newLog);
    setSaving(false);
    setActiveKey(null);
    setEntries({});
    setBackTrafficState(null);
    setNoteState("");
    setTodayReadiness(null);
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
    schemaVersion: 2,
    exportedAt: new Date().toISOString(),
    log,
    equip,
    choices,
    custom,
    body,
    cardio,
    days,
    gyms,
    settings,
  });

  const importData = async (raw: unknown): Promise<boolean> => {
    if (!raw || typeof raw !== "object") return false;
    const d = raw as Record<string, unknown>;
    if (!Array.isArray(d.log)) return false;
    const nextLog = d.log as LoggedSession[];
    const nextEquip = Array.isArray(d.equip) ? (d.equip as EquipKey[]) : equip;
    const nextChoices =
      d.choices && typeof d.choices === "object"
        ? (d.choices as Record<string, string>)
        : choices;
    const nextCustom = Array.isArray(d.custom) ? (d.custom as Exercise[]) : custom;
    const nextBody = Array.isArray(d.body) ? (d.body as BodyMetric[]) : body;
    const nextCardio = Array.isArray(d.cardio) ? (d.cardio as CardioSession[]) : cardio;
    const nextDays = Array.isArray(d.days) ? (d.days as WorkoutDay[]) : days;
    const nextGyms = Array.isArray(d.gyms) ? (d.gyms as GymProfile[]) : gyms;
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
      storage.setJSON(KEYS.settings, nextSettings),
    ]);
    return true;
  };

  const value: TrainingContextValue = {
    log,
    equip,
    choices,
    custom,
    body,
    loading,
    saving,
    activeKey,
    entries,
    backTraffic,
    note,
    allLib,
    has,
    nextIndex,
    recTpl,
    recList,
    activeList,
    estimatedMin,
    settings,
    todayReadiness,
    readinessScale,
    ringMetrics,
    muscleVolumes,
    coach,
    cardioAdvice: cardioTip,
    weekCount,
    daysAgo,
    lastLabel,
    lastBackRed,
    seeDoctor,
    lastPerf,
    sessionOf,
    sessionTemplate,
    startSession,
    setEntry,
    swapExercise,
    toggleEquip,
    addCustom,
    removeCustom,
    days,
    addDay,
    updateDay,
    removeDay,
    gyms,
    switchGym,
    addGym,
    removeGym,
    saveSession,
    deleteSession,
    resetAll,
    setBackTraffic: (v) => setBackTrafficState(v),
    setNote: (v) => setNoteState(v),
    setBudget,
    setVoiceCues,
    setSuperset,
    setTheme,
    setSkin,
    setIcon,
    setAccentOverride,
    setAccent,
    setWeightStep,
    setBikeWarmup,
    setCardioFinisher,
    setUserName,
    setAthleteProfile,
    completeOnboarding,
    setReadiness: (r) => setTodayReadiness(r),
    acceptDeload,
    dismissCard,
    addBodyMetric,
    deleteBodyMetric,
    exportData,
    importData,
    cardio,
    strava,
    cloud,
  };

  return (
    <TrainingContext.Provider value={value}>{children}</TrainingContext.Provider>
  );
}
