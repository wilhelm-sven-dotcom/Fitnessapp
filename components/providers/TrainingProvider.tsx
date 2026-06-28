"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { DEFAULT_EQUIP, LIB, TEMPLATE } from "@/lib/exercises";
import { coachCards, type CoachCard } from "@/lib/advisor";
import { presc, resolveSession, warmupSets } from "@/lib/progression";
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
import type {
  AppSettings,
  BodyMetric,
  EquipKey,
  Readiness,
  Exercise,
  LastPerf,
  LoggedSession,
  Pattern,
  ResolvedSlot,
  SetEntry,
  Template,
  TrafficLight,
  Unit,
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
  settings?: AppSettings;
}

const DEFAULT_SETTINGS: AppSettings = {
  timeBudgetMin: 25,
  autoregOn: true,
  voiceCues: false,
  superset: false,
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
  weekCount: number;
  daysAgo: number | null;
  lastLabel: string;
  lastBackRed: boolean;
  seeDoctor: boolean;
  lastPerf: (id: string) => LastPerf | null;
  sessionOf: (key: string, backSafe?: boolean) => ResolvedSlot[];
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
  saveSession: () => Promise<void>;
  deleteSession: (realIdx: number) => Promise<void>;
  resetAll: () => Promise<void>;
  setBackTraffic: (v: TrafficLight | null) => void;
  setNote: (v: string) => void;
  setBudget: (min: number) => void;
  setVoiceCues: (on: boolean) => void;
  setSuperset: (on: boolean) => void;
  setReadiness: (r: Readiness) => void;
  acceptDeload: () => void;
  dismissCard: (card: CoachCard) => void;
  addBodyMetric: (m: BodyMetric) => Promise<void>;
  deleteBodyMetric: (idx: number) => Promise<void>;
  exportData: () => ExportEnvelope;
  importData: (raw: unknown) => Promise<boolean>;
  cloud: CloudApi;
}

export interface CloudApi {
  configured: boolean;
  email: string | null;
  busy: boolean;
  signIn: (email: string) => Promise<{ ok: boolean; error?: string }>;
  signOut: () => Promise<void>;
  syncNow: () => Promise<void>;
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
    const [l, e, c, cu, b, s] = await Promise.all([
      storage.getJSON<LoggedSession[]>(KEYS.log, []),
      storage.getJSON<EquipKey[]>(KEYS.equip, DEFAULT_EQUIP),
      storage.getJSON<Record<string, string>>(KEYS.choices, {}),
      storage.getJSON<Exercise[]>(KEYS.custom, []),
      storage.getJSON<BodyMetric[]>(KEYS.body, []),
      storage.getJSON<AppSettings>(KEYS.settings, DEFAULT_SETTINGS),
    ]);
    if (Array.isArray(l)) setLog(l);
    if (Array.isArray(e)) setEquip(e);
    if (c && typeof c === "object") setChoices(c);
    if (Array.isArray(cu)) setCustom(cu);
    if (Array.isArray(b)) setBody(b);
    if (s && typeof s === "object") setSettings({ ...DEFAULT_SETTINGS, ...s });
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

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

  const sessionOf = (key: string, backSafe = false): ResolvedSlot[] => {
    const tpl = TEMPLATE.find((t) => t.key === key);
    if (!tpl) return [];
    const idx = TEMPLATE.findIndex((t) => t.key === key);
    return resolveSession(tpl, idx, choices, has, allLib, backSafe);
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
      applyReadiness(
        fitToBudget(sessionOf(recTpl.key, lastBackRed), settings.timeBudgetMin, {
          protectCore: lastBackRed,
          superset: settings.superset,
        }).list,
        readinessScale,
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [recTpl, choices, equip, custom, lastBackRed, settings.timeBudgetMin, settings.superset, readinessScale],
  );
  const estimatedMin = useMemo(
    () => estimateSessionMin(recList, { superset: settings.superset }),
    [recList, settings.superset],
  );

  // The session actually being trained — budget-trimmed, back-safe, readiness-scaled.
  // Both the workout screen and saveSession read this so shown == saved.
  const activeList = useMemo(
    () =>
      activeKey
        ? applyReadiness(
            fitToBudget(sessionOf(activeKey, lastBackRed), settings.timeBudgetMin, {
              protectCore: lastBackRed,
              superset: settings.superset,
            }).list,
            readinessScale,
          )
        : [],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activeKey, choices, equip, custom, lastBackRed, settings.timeBudgetMin, settings.superset, readinessScale],
  );

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
      coachCards({ log, allLib, settings, seeDoctor, muscleVolumes }).filter(
        (c) => !dismissed.includes(c.kind + (c.exId ?? "")),
      ),
    [log, allLib, settings, seeDoctor, muscleVolumes, dismissed],
  );

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
    });
    const working: SetEntry[] = Array.from({ length: ex.sets }, () => ({
      weight: p.w,
      reps: "",
    }));
    const warm =
      ex.weighted && p.w && Number(p.w) > 0 ? warmupSets(Number(p.w)) : [];
    return [...warm, ...working];
  };

  const startSession = (key: string, readiness?: Readiness) => {
    const r = readiness ?? todayReadiness;
    const scale = withDeload(
      settings.autoregOn && r ? scaleFor(band(r.score)) : NEUTRAL_SCALE,
      deloadActive,
    );
    if (readiness) setTodayReadiness(readiness);
    const list = applyReadiness(
      fitToBudget(sessionOf(key, lastBackRed), settings.timeBudgetMin, {
        protectCore: lastBackRed,
        superset: settings.superset,
      }).list,
      scale,
    );
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
  const setBudget = (min: number) =>
    void saveSettings({ ...settings, timeBudgetMin: min });
  const setVoiceCues = (on: boolean) =>
    void saveSettings({ ...settings, voiceCues: on });
  const setSuperset = (on: boolean) =>
    void saveSettings({ ...settings, superset: on });
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

  const saveSession = async () => {
    const tpl = TEMPLATE.find((t) => t.key === activeKey);
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
    const nextSettings =
      d.settings && typeof d.settings === "object"
        ? { ...DEFAULT_SETTINGS, ...(d.settings as AppSettings) }
        : settings;
    setLog(nextLog);
    setEquip(nextEquip);
    setChoices(nextChoices);
    setCustom(nextCustom);
    setBody(nextBody);
    setSettings(nextSettings);
    await Promise.all([
      storage.setJSON(KEYS.log, nextLog),
      storage.setJSON(KEYS.equip, nextEquip),
      storage.setJSON(KEYS.choices, nextChoices),
      storage.setJSON(KEYS.custom, nextCustom),
      storage.setJSON(KEYS.body, nextBody),
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
    weekCount,
    daysAgo,
    lastLabel,
    lastBackRed,
    seeDoctor,
    lastPerf,
    sessionOf,
    startSession,
    setEntry,
    swapExercise,
    toggleEquip,
    addCustom,
    removeCustom,
    saveSession,
    deleteSession,
    resetAll,
    setBackTraffic: (v) => setBackTrafficState(v),
    setNote: (v) => setNoteState(v),
    setBudget,
    setVoiceCues,
    setSuperset,
    setReadiness: (r) => setTodayReadiness(r),
    acceptDeload,
    dismissCard,
    addBodyMetric,
    deleteBodyMetric,
    exportData,
    importData,
    cloud,
  };

  return (
    <TrainingContext.Provider value={value}>{children}</TrainingContext.Provider>
  );
}
