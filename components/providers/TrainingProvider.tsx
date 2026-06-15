"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { DEFAULT_EQUIP, LIB, TEMPLATE } from "@/lib/exercises";
import { presc, resolveSession, warmupSets } from "@/lib/progression";
import { KEYS, storage } from "@/lib/storage";
import type {
  BodyMetric,
  EquipKey,
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
  weekCount: number;
  daysAgo: number | null;
  lastLabel: string;
  lastBackRed: boolean;
  seeDoctor: boolean;
  lastPerf: (id: string) => LastPerf | null;
  sessionOf: (key: string, backSafe?: boolean) => ResolvedSlot[];
  startSession: (key: string) => void;
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
  addBodyMetric: (m: BodyMetric) => Promise<void>;
  deleteBodyMetric: (idx: number) => Promise<void>;
  exportData: () => ExportEnvelope;
  importData: (raw: unknown) => Promise<boolean>;
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
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [entries, setEntries] = useState<Record<string, SetEntry[]>>({});
  const [backTraffic, setBackTrafficState] = useState<TrafficLight | null>(null);
  const [note, setNoteState] = useState("");

  useEffect(() => {
    let on = true;
    (async () => {
      const [l, e, c, cu, b] = await Promise.all([
        storage.getJSON<LoggedSession[]>(KEYS.log, []),
        storage.getJSON<EquipKey[]>(KEYS.equip, DEFAULT_EQUIP),
        storage.getJSON<Record<string, string>>(KEYS.choices, {}),
        storage.getJSON<Exercise[]>(KEYS.custom, []),
        storage.getJSON<BodyMetric[]>(KEYS.body, []),
      ]);
      if (!on) return;
      if (Array.isArray(l)) setLog(l);
      if (Array.isArray(e)) setEquip(e);
      if (c && typeof c === "object") setChoices(c);
      if (Array.isArray(cu)) setCustom(cu);
      if (Array.isArray(b)) setBody(b);
      setLoading(false);
    })();
    return () => {
      on = false;
    };
  }, []);

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
  const recTpl = TEMPLATE[nextIndex];
  const recList = useMemo(
    () => sessionOf(recTpl.key, lastBackRed),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [recTpl, choices, equip, custom, lastBackRed],
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

  const initEntryFor = (ex: Exercise): SetEntry[] => {
    const p = presc(ex, lastPerf(ex.id));
    const working: SetEntry[] = Array.from({ length: ex.sets }, () => ({
      weight: p.w,
      reps: "",
    }));
    const warm =
      ex.weighted && p.w && Number(p.w) > 0 ? warmupSets(Number(p.w)) : [];
    return [...warm, ...working];
  };

  const startSession = (key: string) => {
    const list = sessionOf(key, lastBackRed);
    const init: Record<string, SetEntry[]> = {};
    list.forEach(({ ex }) => {
      init[ex.id] = initEntryFor(ex);
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
    const list = sessionOf(tpl.key, lastBackRed);
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
    };
    if (backTraffic) newSession.backTraffic = backTraffic;
    if (note.trim()) newSession.note = note.trim();
    const newLog = [...log, newSession];
    setSaving(true);
    await storage.setJSON(KEYS.log, newLog);
    setLog(newLog);
    setSaving(false);
    setActiveKey(null);
    setEntries({});
    setBackTrafficState(null);
    setNoteState("");
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
    const next = body.filter((_, i) => i !== idx);
    setBody(next);
    if (next.length) await storage.setJSON(KEYS.body, next);
    else await storage.remove(KEYS.body);
  };

  const exportData = (): ExportEnvelope => ({
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    log,
    equip,
    choices,
    custom,
    body,
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
    setLog(nextLog);
    setEquip(nextEquip);
    setChoices(nextChoices);
    setCustom(nextCustom);
    setBody(nextBody);
    await Promise.all([
      storage.setJSON(KEYS.log, nextLog),
      storage.setJSON(KEYS.equip, nextEquip),
      storage.setJSON(KEYS.choices, nextChoices),
      storage.setJSON(KEYS.custom, nextCustom),
      storage.setJSON(KEYS.body, nextBody),
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
    addBodyMetric,
    deleteBodyMetric,
    exportData,
    importData,
  };

  return (
    <TrainingContext.Provider value={value}>{children}</TrainingContext.Provider>
  );
}
