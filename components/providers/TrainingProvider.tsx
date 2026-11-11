"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { DEFAULT_EQUIP, EQUIP_LIST, LIB } from "@/lib/exercises";
import { coachCards, type CoachCard } from "@/lib/advisor";
import { fatigueState } from "@/lib/fatigue";
import { deloadAktiv, phaseState, type PhaseState } from "@/lib/periodization";
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
import { istLiegengeblieben, withDeload, type ActiveSessionState } from "@/lib/active-session";
import { TAG_MS, WOCHE_MS, weekStartMon } from "@/lib/zeit";
import {
  ergaenze,
  nachDatum,
  nurTexte,
  ohneZugaenge,
  pruefeChat,
  pruefeSpruenge,
  vereinige,
  type ChatZeile,
  type ImportModus,
} from "@/lib/datensicherung";
import type { JumpEntry } from "@/lib/jump";
import {
  NEUTRAL_SCALE,
  band,
  scaleFor,
  type ReadinessScale,
} from "@/lib/readiness";
import { hatArbeitssatz, lastPerfOf } from "@/lib/last-perf";
import { estimateSessionMin, sessionMinutes } from "@/lib/session-time";
import { setCueVolume as setBeepCueVolume } from "@/lib/beep";
import { muscleOf, weeklyMuscleVolume, type MuscleVolume } from "@/lib/volume";
import { trainingLevel } from "@/lib/achievements";
import { mergeCloudLocal } from "@/lib/merge";
import { ensureOrte, gewichtsstufe, hasFuer } from "@/lib/orte";
import { prTimeline } from "@/lib/records";
import {
  sanitizeBody,
  sanitizeCardio,
  sanitizeCustom,
  sanitizeGyms,
  sanitizeSessions,
  sanitizeStringMap,
  sanitizeVideoMap,
} from "@/lib/sanitize";
import { weeklySetStats } from "@/lib/set-plan";
import { sessionVolume } from "@/lib/stats";
import {
  KEYS,
  SPEICHER_VOLL,
  storage,
  cloudKonto,
  cloudLeeren,
  cloudLeerenOffen,
  cloudOffen,
  cloudOffenErledigt,
  cloudPull,
  cloudPushAll,
  merkeCloudLeeren,
  setzeCloudKonto,
} from "@/lib/storage";
import { toast } from "@/lib/toast";
import { youtubeEmbedUrl } from "@/lib/youtube";
import { isCloudConfigured, loadSupabase } from "@/lib/supabase";
import { leseAnmeldeEingabe } from "@/lib/anmeldung";
import { deletePhoto, leereCloudFotos, leereFotos } from "@/lib/photo-store";
import { applyTheme, type ThemePref } from "@/lib/theme";
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
  LastPerf,
  RelatedPerf,
  LoggedSession,
  Muscle,
  Pattern,
  ResolvedSlot,
  SessionExercise,
  SetEntry,
  Template,
  Unit,
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
  /** Dauer in Minuten (fehlt, wenn der Start unplausibel war). */
  durationMin?: number;
}

export interface ExportEnvelope {
  schemaVersion: number;
  exportedAt: string;
  log: LoggedSession[];
  equip: EquipKey[];
  custom: Exercise[];
  body: BodyMetric[];
  cardio: CardioSession[];
  gyms: GymProfile[];
  exerciseVideos: Record<string, string>;
  exerciseNotes: Record<string, string>;
  /** Eigene YouTube-Links je Aufwärm-Drill (additiv — alte Backups bleiben gültig). */
  warmupVideos?: Record<string, string>;
  /** Ohne die Zugänge zu Strava und Spotify (lib/datensicherung.ts). */
  settings?: AppSettings;
  /** Ab Fassung 4: was vorher im Export fehlte. */
  disabledExercises?: string[];
  hiddenCardio?: string[];
  jumps?: JumpEntry[];
  mission?: StoredMission | null;
  chat?: ChatZeile[];
}

const DEFAULT_SETTINGS: AppSettings = {
  timeBudgetMin: 25,
  autoregOn: true,
  voiceCues: false,
  theme: "light",
};

/** Import-Fenster: die letzten 4 Wochen an Strava-Einheiten behalten —
 *  so lange schaut die Belastungs-Kurve zurück (lib/fatigue.ts). Mit 2 Wochen
 *  zählte Ausdauer voll in die letzten 7 Tage, aber nur halb in den
 *  4-Wochen-Schnitt: die Kurve zeigte dauerhaft zu viel Belastung.
 *  Manuell Eingetragenes bleibt IMMER (das hat der Nutzer selbst erfasst). */
const IMPORT_WINDOW_MS = 28 * TAG_MS;
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

type StravaTokens = NonNullable<AppSettings["strava"]>;
/** So alt darf der letzte Strava-Abgleich sein, bevor die App selbst nachsieht. */
const STRAVA_ABSTAND_MS = 6 * 60 * 60 * 1000;
/** Server-Roundtrip für alle Strava-Aktionen — zustandsfrei, lebt außerhalb
 *  der Komponente, damit die API-Objekte sauber memoisierbar sind. */
async function stravaPost(payload: Record<string, unknown>) {
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
}

/** Eingaben des Editors härten und in eine vollwertige Übung gießen —
 *  eigene Übungen sind erstklassig (Muskel, Equipment, Content) und fließen
 *  über `allLib` automatisch in Pools, Volumen und den ATLAS-Katalog. */
function buildCustom(id: string, data: CustomExerciseInput): Exercise {
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
}

interface TrainingContextValue {
  log: LoggedSession[];
  equip: EquipKey[];
  exerciseVideos: Record<string, string>;
  exerciseNotes: Record<string, string>;
  /** Eigene YouTube-Links je Aufwärm-Drill (Aufwärm-Player). */
  warmupVideos: Record<string, string>;
  body: BodyMetric[];
  loading: boolean;
  saving: boolean;
  allLib: Exercise[];
  has: (k: string) => boolean;
  settings: AppSettings;
  todayReadiness: Readiness | null;
  muscleVolumes: MuscleVolume[];
  coach: CoachCard[];
  cardioAdvice: CardioAdvice;
  phase: PhaseState;
  /** Läuft gerade eine Entlastungswoche (sieben Tage ab Start)? */
  deloadActive: boolean;
  trainer: TrainerState;
  mission: StoredMission | null;
  weekCount: number;
  daysAgo: number | null;
  lastBackRed: boolean;
  /** „Rücken heute schonen" — manueller Tages-Schalter (Session-scoped). */
  backSpareToday: boolean;
  setBackSpareToday: (on: boolean) => void;
  /** Rücken-Schonung heute aktiv — Ampel-rot ODER manueller Tages-Schalter. */
  backSafeActive: boolean;
  lastPerf: (id: string) => LastPerf | null;
  /** Nur für die Anzeige — siehe RelatedPerf; speist NIE die Empfehlung. */
  lastPerfRelated: (id: string) => RelatedPerf | null;
  /** Gerät an einem Ort an/aus — ohne `gymId` am aktiven Ort. */
  toggleEquip: (k: EquipKey, gymId?: string) => void;
  /** Mehrere Geräte eines Orts auf einmal an- oder abwählen (Sammelknopf). */
  setOrtGeraete: (keys: readonly EquipKey[], on: boolean, gymId?: string) => void;
  /** Ort plant nur an Geräten (Maschinen + Kabelzug). */
  setNurGeraete: (on: boolean, gymId?: string) => void;
  /** Eigenes Foto eines Geräts setzen (photo-store-Id) oder entfernen (null). */
  setGeraetFoto: (geraet: string, photoId: string | null) => void;
  addCustom: (data: CustomExerciseInput) => void;
  updateCustom: (id: string, data: CustomExerciseInput) => void;
  removeCustom: (id: string) => void;
  /** Deaktivierte Übungs-Ids — raus aus Planung/Tausch, sichtbar im Katalog. */
  disabledExercises: string[];
  toggleExerciseDisabled: (id: string) => void;
  setExerciseVideo: (exId: string, url: string | null) => void;
  setWarmupVideo: (drillId: string, url: string | null) => void;
  setExerciseNote: (exId: string, note: string | null) => void;
  /** Trainingsorte (Zuhause, Studio, …). */
  gyms: GymProfile[];
  /** Der Ort, an dem heute trainiert wird — seine Geräte sind `equip`. */
  activeGym: GymProfile | null;
  /** „Wo trainierst du heute?“ — setzt den aktiven Ort. */
  waehleOrt: (id: string) => void;
  /** Neuen Ort anlegen (wechselt NICHT den heutigen Ort) — liefert die Id. */
  addGym: (name: string, equipPreset?: EquipKey[]) => string;
  renameGym: (id: string, name: string) => void;
  removeGym: (id: string) => void;
  /** Den Live-State des Runners als LoggedSession speichern (leer → null). */
  /** Speichert die Einheit in den Verlauf. `null`: es stand kein Arbeitssatz
   *  drin. WIRFT, wenn das Gerät nicht speichern konnte (Speicher voll) —
   *  die laufende Einheit bleibt dann erhalten. */
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
  setZoetrope: (on: boolean) => void;
  setSplash: (v: NonNullable<AppSettings["splash"]>) => void;
  /** Gewichtsstufe des heutigen Orts (lib/orte.ts `gewichtsstufe`). */
  weightStep: number;
  /** Setzt die Gewichtsstufe eines Orts (Vorgabe: der heutige). */
  setWeightStep: (step: number, gymId?: string) => void;
  setBikeWarmup: (on: boolean) => void;
  setKeepAwake: (on: boolean) => void;
  setDuckSpotify: (on: boolean) => void;
  setAiPlanning: (on: boolean) => void;
  /** EIN Schalter für ATLAS im Training: Zuspruch zwischen den Sätzen UND
   *  Live-Reaktion — schreibt beide Felder in einem Settings-Write. */
  setAtlasImTraining: (on: boolean) => void;
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
  exportData: () => Promise<ExportEnvelope>;
  /** Spielt eine Export-Datei ein: „ergaenzen“ (Vorgabe) fügt Fehlendes
   *  hinzu, „ersetzen“ setzt das Gerät auf den Stand der Datei. */
  importData: (raw: unknown, modus?: ImportModus) => Promise<boolean>;
  /** Tauscht den Verlauf gegen die Sicherung (lib/storage.ts). Ein zweiter
   *  Aufruf macht den ersten rückgängig. */
  holeSicherung: () => Promise<boolean>;
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
  /** Konto direkt mit Passwort anlegen. `mailNoetig` = Supabase besteht auf
   *  einer Bestätigungsmail; ohne das Flag ist man sofort angemeldet. */
  signUp: (
    email: string,
    password: string,
  ) => Promise<{ ok: boolean; error?: string; mailNoetig?: boolean }>;
  setPassword: (password: string) => Promise<{ ok: boolean; error?: string }>;
  signOut: () => Promise<void>;
  syncNow: () => Promise<void>;
}

export interface StravaApi {
  connected: boolean;
  athlete: string | null;
  busy: boolean;
  /** Strava hat die Anmeldung zurückgewiesen: neu verbinden. */
  needsReauth: boolean;
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
  // Flache Geräteliste: nur noch Spiegel/Fallback. Die Wahrheit sind die
  // Geräte des aktiven Orts (siehe `equip` weiter unten, lib/orte.ts).
  const [equipFlat, setEquipFlat] = useState<EquipKey[]>(DEFAULT_EQUIP);
  const [custom, setCustom] = useState<Exercise[]>([]);
  const [body, setBody] = useState<BodyMetric[]>([]);
  const [cardio, setCardio] = useState<CardioSession[]>([]);
  // IDs gelöschter Import-Einheiten — der Strava-Sync überspringt sie, sonst
  // käme eine gelöschte (oder doppelte) Fahrt beim nächsten Sync zurück.
  const [hiddenCardio, setHiddenCardio] = useState<string[]>([]);
  const [disabledExercises, setDisabledExercises] = useState<string[]>([]);
  const [gyms, setGyms] = useState<GymProfile[]>([]);
  const [exerciseVideos, setExerciseVideos] = useState<Record<string, string>>({});
  const [warmupVideos, setWarmupVideos] = useState<Record<string, string>>({});
  const [exerciseNotes, setExerciseNotes] = useState<Record<string, string>>({});
  const [stravaBusy, setStravaBusy] = useState(false);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  // Der JÜNGSTE Stand der Einstellungen. Wer nach einem `await` schreibt
  // (Strava, Spotify) oder zweimal im selben Handler, darf nicht auf dem Stand
  // des letzten Renders aufbauen — sonst verschwindet die Änderung dazwischen.
  const settingsRef = useRef<AppSettings>(DEFAULT_SETTINGS);
  const cardioRef = useRef<CardioSession[]>([]);
  const hiddenCardioRef = useRef<string[]>([]);
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
    const [l, e, cu, b, s, ca, hc, gy, ev, mi, en, td, dx, wv] = await Promise.all([
      storage.getJSON<LoggedSession[]>(KEYS.log, []),
      storage.getJSON<EquipKey[]>(KEYS.equip, DEFAULT_EQUIP),
      storage.getJSON<Exercise[]>(KEYS.custom, []),
      storage.getJSON<BodyMetric[]>(KEYS.body, []),
      storage.getJSON<AppSettings>(KEYS.settings, DEFAULT_SETTINGS),
      storage.getJSON<CardioSession[]>(KEYS.cardio, []),
      storage.getJSON<string[]>(KEYS.hiddenCardio, []),
      storage.getJSON<GymProfile[]>(KEYS.gyms, []),
      storage.getJSON<Record<string, string>>(KEYS.exerciseVideos, {}),
      storage.getJSON<StoredMission | null>(KEYS.mission, null),
      storage.getJSON<Record<string, string>>(KEYS.exerciseNotes, {}),
      storage.getJSON<DailySession | null>(KEYS.today, null),
      storage.getJSON<string[]>(KEYS.disabledExercises, []),
      storage.getJSON<Record<string, string>>(KEYS.warmupVideos, {}),
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
    // Einmal-Migration München ’72: Ein gespeichertes "dark" stammt fast immer
    // vom alten Dunkel-Default, nicht von einer bewussten Wahl — der neue helle
    // Grundzustand übernimmt. Wer danach Dunkel wählt, behält es (Flag gesetzt).
    if (!settingsLoaded.themeMigratedM72) {
      settingsLoaded = {
        ...settingsLoaded,
        theme: settingsLoaded.theme === "dark" ? "light" : settingsLoaded.theme,
        themeMigratedM72: true,
      };
      void storage.setJSON(KEYS.settings, settingsLoaded);
    }
    // Orte: „Zuhause“/„Studio“ anlegen, Alt-Namen und Dubletten heilen,
    // `activeGymId` reparieren — VOR dem ersten Render, sonst komponiert die
    // Heute-Seite (Kind-Effekte laufen vor Eltern-Effekten) einmal ohne Orte.
    const orte = ensureOrte(gymsLoaded, equipLoaded, settingsLoaded);
    if (orte.changed) {
      gymsLoaded = orte.gyms;
      settingsLoaded = orte.settings;
      void storage.setJSON(KEYS.gyms, gymsLoaded);
      void storage.setJSON(KEYS.settings, settingsLoaded);
    }
    // Spiegel nachziehen: KEYS.equip folgt dem aktiven Ort.
    const aktivLoaded = gymsLoaded.find((g) => g.id === settingsLoaded.activeGymId);
    if (aktivLoaded && aktivLoaded.equip.join(",") !== equipLoaded.join(",")) {
      equipLoaded = [...aktivLoaded.equip];
      void storage.setJSON(KEYS.equip, equipLoaded);
    }
    setEquipFlat(equipLoaded);
    setCustom(sanitizeCustom(cu));
    setBody(sanitizeBody(b));
    settingsRef.current = settingsLoaded;
    setSettings(settingsLoaded);
    // Nur die letzten 2 Wochen behalten — ältere Importe beim Öffnen wegräumen
    // (und persistieren, wenn wirklich etwas wegfiel), manuelle bleiben.
    const cleanCardio = pruneOldImports(sanitizeCardio(ca));
    setCardio(cleanCardio);
    if (Array.isArray(ca) && cleanCardio.length !== ca.length)
      void storage.setJSON(KEYS.cardio, cleanCardio);
    setHiddenCardio(Array.isArray(hc) ? hc.filter((x): x is string => typeof x === "string") : []);
    setDisabledExercises(
      Array.isArray(dx) ? dx.filter((x): x is string => typeof x === "string") : [],
    );
    setGyms(gymsLoaded);
    setExerciseVideos(sanitizeVideoMap(ev));
    setWarmupVideos(sanitizeVideoMap(wv));
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
  // (Ein Theme-Lock des Fokus-Modus gewinnt innerhalb von applyTheme.)
  useEffect(() => {
    if (loading) return;
    applyTheme(settings.theme);
    if (settings.theme !== "system" || typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-color-scheme: light)");
    const onChange = () => applyTheme(settings.theme);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [loading, settings.theme]);

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

  /** Erster Abgleich mit einem Konto: zusammenführen (beide Seiten haben
   *  Daten), übernehmen (frisches Gerät) oder die leere Cloud befüllen.
   *  `false`: die Cloud war nicht zu erreichen — dann ist nichts geschehen. */
  const pullOrSeed = useCallback(async (): Promise<boolean> => {
    const map = await cloudPull();
    // Nicht erreichbar ist NICHT „leer“: sonst überschriebe ein Gerät ohne
    // Netz beim nächsten Mal die Sicherung mit seinem Stand.
    if (map === null) return false;
    if (Object.keys(map).length) {
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
    return true;
  }, [loadAll, collectLocal]);

  /**
   * Abgleich mit dem angemeldeten Konto. Dieses Gerät ist die Wahrheit, die
   * Cloud die Sicherung (Nutzer-Entscheid: ein iPhone):
   *  · Erstes Mal mit diesem Konto → zusammenführen (`pullOrSeed`).
   *  · Danach wird nie mehr still aus der Cloud zurückgeholt — sonst käme
   *    Gelöschtes wieder. Es wird nur nachgereicht, was die Cloud noch nicht
   *    hat (Änderungen ohne Netz).
   *  · Steht ein „Alle Daten löschen“ für das Konto noch aus, kommt das zuerst.
   */
  const abgleichLaeuft = useRef(false);
  const gleicheAb = useCallback(
    async (userId: string) => {
      if (abgleichLaeuft.current) return;
      abgleichLaeuft.current = true;
      try {
        if ((await cloudLeerenOffen()) === userId) {
          if ((await cloudLeeren()) !== true) return;
          void leereCloudFotos();
        }
        if ((await cloudKonto()) !== userId) {
          if (await pullOrSeed()) await setzeCloudKonto(userId);
          return;
        }
        if (await cloudOffen()) {
          // Vermerk zuerst löschen: ein Fehlschlag beim Hochladen setzt ihn neu.
          await cloudOffenErledigt();
          await cloudPushAll(await collectLocal());
        }
      } finally {
        abgleichLaeuft.current = false;
      }
    },
    [pullOrSeed, collectLocal],
  );

  // Supabase meldet SIGNED_IN nicht nur beim Anmelden, sondern auch bei jedem
  // Zurückkehren in die App; beim Start kommt INITIAL_SESSION. Der Abgleich
  // läuft je Konto einmal pro Seitenleben, danach nur noch das Nachreichen.
  const abgeglichenFuer = useRef<string | null>(null);
  const angemeldetAls = useRef<string | null>(null);
  useEffect(() => {
    if (!cloudConfigured) return;
    let active = true;
    let abmelden: (() => void) | undefined;
    void loadSupabase().then((sb) => {
      if (!sb || !active) return;
      void sb.auth.getSession().then(({ data: { session } }) => {
        if (active) setCloudEmail(session?.user.email ?? null);
      });
      const { data: sub } = sb.auth.onAuthStateChange((event, session) => {
        setCloudEmail(session?.user.email ?? null);
        angemeldetAls.current = session?.user.id ?? null;
        if (!session) abgeglichenFuer.current = null;
        if (
          (event === "SIGNED_IN" || event === "INITIAL_SESSION") &&
          session &&
          abgeglichenFuer.current !== session.user.id
        ) {
          const id = session.user.id;
          abgeglichenFuer.current = id;
          // Nicht im Rückruf selbst: Supabase hält dort noch seine Sperre.
          window.setTimeout(() => void gleicheAb(id), 0);
        }
      });
      abmelden = () => sub.subscription.unsubscribe();
    });
    // Wieder Netz oder zurück in der App: nachreichen, was liegen blieb.
    const nachreichen = () => {
      if (document.visibilityState !== "visible" || navigator.onLine === false) return;
      if (angemeldetAls.current) void gleicheAb(angemeldetAls.current);
    };
    window.addEventListener("online", nachreichen);
    document.addEventListener("visibilitychange", nachreichen);
    return () => {
      active = false;
      abmelden?.();
      window.removeEventListener("online", nachreichen);
      document.removeEventListener("visibilitychange", nachreichen);
    };
  }, [cloudConfigured, gleicheAb]);

  // Supabase antwortet englisch und technisch. Die drei Fälle, die hier real
  // vorkommen, brauchen einen Klartext MIT Ausweg — besonders das
  // Mail-Limit: der eingebaute Supabase-Mailer erlaubt nur eine Handvoll
  // Mails pro Stunde, und dagegen hilft kein zweiter Klick, sondern nur
  // Warten oder eigenes SMTP.
  const cloudFehler = (msg: string): string => {
    const m = msg.toLowerCase();
    if (m.includes("rate limit") || m.includes("too many requests"))
      return "Mail-Limit erreicht — Supabase verschickt nur wenige Anmelde-Mails pro Stunde. Leg stattdessen ein Konto mit Passwort an, das kommt ohne Mail aus.";
    if (m.includes("invalid") && (m.includes("token") || m.includes("otp")))
      return "Code stimmt nicht oder ist abgelaufen — er gilt nur wenige Minuten.";
    if (m.includes("link") && (m.includes("invalid") || m.includes("expired")))
      return "Der Link ist abgelaufen oder wurde schon benutzt. Fordere eine neue Mail an.";
    if (m.includes("invalid login credentials"))
      return "E-Mail oder Passwort stimmt nicht.";
    if (m.includes("already registered") || m.includes("already been registered"))
      return "Für diese Adresse gibt es schon ein Konto — melde dich oben mit deinem Passwort an.";
    if (m.includes("password should be") || m.includes("password is too short"))
      return "Passwort zu kurz — mindestens 6 Zeichen.";
    if (m.includes("signup") && (m.includes("disabled") || m.includes("not allowed")))
      return "Registrierung ist im Supabase-Projekt abgeschaltet: Authentication → Providers → Email → „Allow new users to sign up“ einschalten.";
    return msg;
  };

  const cloud = useMemo<CloudApi>(() => ({
    configured: cloudConfigured,
    email: cloudEmail,
    busy: cloudBusy,
    signIn: async (email) => {
      const sb = await loadSupabase();
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
        return error ? { ok: false, error: cloudFehler(error.message) } : { ok: true };
      } catch (e) {
        return { ok: false, error: e instanceof Error ? e.message : "Netzwerkfehler" };
      } finally {
        setCloudBusy(false);
      }
    },
    // Nimmt den Code ODER den kopierten Link aus der Mail (`lib/anmeldung.ts`):
    // In der App auf dem Home-Bildschirm öffnet der Link sonst nur Safari.
    verifyCode: async (email, token) => {
      const sb = await loadSupabase();
      if (!sb) return { ok: false, error: "Cloud-Sync ist nicht konfiguriert." };
      const eingabe = leseAnmeldeEingabe(token);
      if (!eingabe)
        return { ok: false, error: "Das ist weder ein Code noch ein Anmelde-Link aus der Mail." };
      if (eingabe.art === "code" && !email.trim())
        return { ok: false, error: "Bitte E-Mail und Code eingeben." };
      setCloudBusy(true);
      try {
        const { error } =
          eingabe.art === "link"
            ? await sb.auth.verifyOtp({ token_hash: eingabe.tokenHash, type: eingabe.typ })
            : await sb.auth.verifyOtp({ email: email.trim(), token: eingabe.code, type: "email" });
        return error ? { ok: false, error: cloudFehler(error.message) } : { ok: true };
      } catch (e) {
        return { ok: false, error: e instanceof Error ? e.message : "Netzwerkfehler" };
      } finally {
        setCloudBusy(false);
      }
    },
    signInWithPassword: async (email, password) => {
      const sb = await loadSupabase();
      if (!sb) return { ok: false, error: "Cloud-Sync ist nicht konfiguriert." };
      if (!email.trim() || !password)
        return { ok: false, error: "Bitte E-Mail und Passwort eingeben." };
      setCloudBusy(true);
      try {
        const { error } = await sb.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        return error ? { ok: false, error: cloudFehler(error.message) } : { ok: true };
      } catch (e) {
        return { ok: false, error: e instanceof Error ? e.message : "Netzwerkfehler" };
      } finally {
        setCloudBusy(false);
      }
    },
    // Der Weg AN der Mail vorbei. Der eingebaute Supabase-Mailer lässt nur
    // eine Handvoll Anmelde-Mails pro Stunde durch — wer sein Passwort noch
    // nicht gesetzt hat, hing damit fest. Hier entsteht das Konto direkt aus
    // E-Mail + Passwort; steht „Confirm email“ im Dashboard aus, ist man
    // sofort angemeldet, ganz ohne Mail.
    signUp: async (email, password) => {
      const sb = await loadSupabase();
      if (!sb) return { ok: false, error: "Cloud-Sync ist nicht konfiguriert." };
      if (!email.trim()) return { ok: false, error: "Bitte eine E-Mail-Adresse eingeben." };
      if (password.length < 6) return { ok: false, error: "Mindestens 6 Zeichen." };
      setCloudBusy(true);
      try {
        const { data, error } = await sb.auth.signUp({ email: email.trim(), password });
        if (error) return { ok: false, error: cloudFehler(error.message) };
        // Supabase verrät bei eingeschalteter Bestätigung NICHT, ob es die
        // Adresse schon gibt (Schutz gegen Konten-Abfragen) — es kommt ein
        // Nutzer ohne `identities` zurück. Das ist kein neues Konto.
        if (data.user && data.user.identities?.length === 0)
          return {
            ok: false,
            error: "Für diese Adresse gibt es schon ein Konto — melde dich oben mit deinem Passwort an.",
          };
        return { ok: true, mailNoetig: !data.session };
      } catch (e) {
        return { ok: false, error: e instanceof Error ? e.message : "Netzwerkfehler" };
      } finally {
        setCloudBusy(false);
      }
    },
    setPassword: async (password) => {
      const sb = await loadSupabase();
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
      const sb = await loadSupabase();
      if (!sb) return;
      await sb.auth.signOut();
      setCloudEmail(null);
    },
    syncNow: async () => {
      setCloudBusy(true);
      try {
        await cloudOffenErledigt();
        await cloudPushAll(await collectLocal());
        if ((await pullOrSeed()) && angemeldetAls.current)
          await setzeCloudKonto(angemeldetAls.current);
      } finally {
        setCloudBusy(false);
      }
    },
  }), [cloudConfigured, cloudEmail, cloudBusy, collectLocal, pullOrSeed]);

  const allLib = useMemo(() => [...LIB, ...custom], [custom]);
  // Der aktive Ort ist die Wahrheit für die Geräte (lib/orte.ts). Die flache
  // Liste greift nur im Augenblick, bevor die Orte geladen sind.
  const activeGym = useMemo(
    () => gyms.find((g) => g.id === settings.activeGymId) ?? gyms[0] ?? null,
    [gyms, settings.activeGymId],
  );
  const equip = useMemo<EquipKey[]>(
    () => (activeGym ? activeGym.equip : equipFlat),
    [activeGym, equipFlat],
  );
  // Geräte des heutigen Orts plus seine Regel „nur an Geräten“ (lib/orte.ts).
  const has = useMemo(
    () => (activeGym ? hasFuer(activeGym) : (k: string) => (equip as string[]).includes(k)),
    [activeGym, equip],
  );

  const lastBackRed =
    log.length > 0 && log[log.length - 1].backTraffic === "red";
  // Schonung greift bei roter Ampel der letzten Einheit ODER wenn der Nutzer
  // sie heute manuell einschaltet — beide Pfade nutzen dieselbe Mechanik.
  const backSafeActive = lastBackRed || backSpareToday;
  const seeDoctor =
    log.length >= 2 &&
    log[log.length - 1].backTraffic === "red" &&
    log[log.length - 2].backTraffic === "red";

  const deloadActive = deloadAktiv(settings);

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

  // Die Empfehlung IST die heutige Einheit. Vorher stand hier die A/B/C-
  // Vorlage TEMPLATE[nextIndex] — weil neue Einheiten mit dayKey „today“
  // gespeichert werden, war das immer „Ganzkörper A“, und ATLAS sagte „Plan
  // steht: Ganzkörper A“, während eine ganz andere Einheit geplant war.
  const heuteAktuell =
    todaySession && todaySession.date === todayKey() ? todaySession : null;
  const recTpl = useMemo<Template>(
    () => ({
      key: "today",
      name: heuteAktuell?.name ?? "Deine Einheit",
      focus: heuteAktuell?.focus ?? "",
      slots: [],
    }),
    [heuteAktuell?.name, heuteAktuell?.focus],
  );
  const recList = useMemo(
    () =>
      heuteAktuell
        ? applyReadiness(resolveDailySession(heuteAktuell, allLib, has), readinessScale)
        : [],
    [heuteAktuell, allLib, has, readinessScale],
  );
  const estimatedMin = useMemo(
    () => (recList.length ? estimateSessionMin(recList) : settings.timeBudgetMin),
    [recList, settings.timeBudgetMin],
  );

  const lastDate = log.length ? new Date(log[log.length - 1].date) : null;
  const daysAgo = lastDate
    ? Math.floor((Date.now() - lastDate.getTime()) / TAG_MS)
    : null;

  const weekCount = useMemo(() => {
    const mon = weekStartMon();
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
    return phaseState(settings, fatigue.band, (Date.now() - minDate) / WOCHE_MS);
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

  // Persistenz-Helfer: bewusst OHNE Closure über State (nur setState + storage),
  // dadurch stabil (useCallback []) — Effekte und das memoisierte Context-Value
  // können sie als Deps führen, ohne bei jedem Render neu zu entstehen.
  const saveExerciseVideos = useCallback(async (next: Record<string, string>) => {
    setExerciseVideos(next);
    await storage.setJSON(KEYS.exerciseVideos, next);
  }, []);
  const saveWarmupVideos = useCallback(async (next: Record<string, string>) => {
    setWarmupVideos(next);
    await storage.setJSON(KEYS.warmupVideos, next);
  }, []);
  const saveExerciseNotes = useCallback(async (next: Record<string, string>) => {
    setExerciseNotes(next);
    await storage.setJSON(KEYS.exerciseNotes, next);
  }, []);
  const saveEquip = useCallback(async (next: EquipKey[]) => {
    setEquipFlat(next);
    await storage.setJSON(KEYS.equip, next);
  }, []);
  const saveCustom = useCallback(async (next: Exercise[]) => {
    setCustom(next);
    await storage.setJSON(KEYS.custom, next);
  }, []);
  const saveSettings = useCallback(async (next: AppSettings) => {
    settingsRef.current = next;
    setSettings(next);
    await storage.setJSON(KEYS.settings, next);
  }, []);
  /** Einzelne Einstellungen ändern — der eine Weg für alle Schalter. Baut auf
   *  dem jüngsten Stand auf (`settingsRef`), nie auf dem eines alten Renders. */
  const updateSettings = useCallback(
    (patch: Partial<AppSettings> | ((s: AppSettings) => Partial<AppSettings>)) => {
      const basis = settingsRef.current;
      return saveSettings({ ...basis, ...(typeof patch === "function" ? patch(basis) : patch) });
    },
    [saveSettings],
  );
  const saveGyms = useCallback(async (next: GymProfile[]) => {
    setGyms(next);
    await storage.setJSON(KEYS.gyms, next);
  }, []);
  const saveCardio = useCallback(async (next: CardioSession[]) => {
    setCardio(next);
    await storage.setJSON(KEYS.cardio, next);
  }, []);

  // Das Gerät konnte etwas nicht speichern (Speicher voll): sagen, statt die
  // Änderung beim nächsten Öffnen still fehlen zu lassen. Höchstens einmal je
  // Minute — ein voller Speicher trifft jeden weiteren Schreibvorgang auch.
  useEffect(() => {
    let zuletzt = 0;
    const melde = () => {
      if (Date.now() - zuletzt < 60_000) return;
      zuletzt = Date.now();
      toast(
        "Der Speicher des Geräts ist voll. Änderungen werden gerade nicht gesichert: Daten exportieren und alte Einträge oder Fotos löschen.",
        { kind: "error", duration: 9000 },
      );
    };
    window.addEventListener(SPEICHER_VOLL, melde);
    return () => window.removeEventListener(SPEICHER_VOLL, melde);
  }, []);

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

  cardioRef.current = cardio;
  hiddenCardioRef.current = hiddenCardio;

  /** Fahrten von Strava holen. Liest Zugänge und Listen über die Refs — die
   *  Antwort kommt nach einem `await`, bis dahin kann sich beides geändert
   *  haben. Darum stabil und auch aus dem Selbstabgleich aufrufbar. */
  const stravaSync = useCallback(async (): Promise<{ ok: boolean; error?: string }> => {
    const t = settingsRef.current.strava;
    if (!t?.refreshToken) return { ok: false, error: "Nicht verbunden." };
    setStravaBusy(true);
    try {
      const j = await stravaPost({
        action: "sync",
        accessToken: t.accessToken,
        refreshToken: t.refreshToken,
        expiresAt: t.expiresAt,
      });
      if (!j.ok) {
        // Strava hat die Anmeldung zurückgewiesen (Zugriff entzogen, Token
        // verfallen): merken, damit die Einstellungen es zeigen.
        if (j.reauth)
          await updateSettings((s) => (s.strava ? { strava: { ...s.strava, reauth: true } } : {}));
        return { ok: false, error: j.error };
      }
      if (j.rides) {
        const versteckt = hiddenCardioRef.current;
        await saveCardio(
          pruneOldImports(
            mergeCardio(cardioRef.current, j.rides.filter((r) => !versteckt.includes(r.id))),
          ),
        );
      }
      // Erneuerte Zugänge sichern (Name bleibt), Zeitpunkt festhalten.
      await updateSettings((s) =>
        s.strava
          ? {
              strava: {
                ...s.strava,
                ...(j.tokens ?? {}),
                athleteName: s.strava.athleteName,
                syncedAt: Date.now(),
                reauth: undefined,
              },
            }
          : {},
      );
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : "Netzwerkfehler" };
    } finally {
      setStravaBusy(false);
    }
  }, [saveCardio, updateSettings]);

  // Selbstabgleich: beim Öffnen und beim Zurückkommen, wenn der letzte länger
  // als sechs Stunden her ist. Vorher kamen Fahrten nur nach „Jetzt syncen“
  // an — ATLAS plante also oft ohne die Fahrt vom Vorabend.
  const stravaVersucht = useRef(0);
  useEffect(() => {
    if (loading) return;
    const pruefe = () => {
      const t = settingsRef.current.strava;
      if (!t?.refreshToken || t.reauth) return;
      if (document.visibilityState !== "visible" || navigator.onLine === false) return;
      const jetzt = Date.now();
      if (jetzt - (t.syncedAt ?? 0) < STRAVA_ABSTAND_MS) return;
      // Fehlschläge (kein Netz) nicht bei jedem Entsperren wiederholen.
      if (jetzt - stravaVersucht.current < 15 * 60 * 1000) return;
      stravaVersucht.current = jetzt;
      void stravaSync();
    };
    pruefe();
    document.addEventListener("visibilitychange", pruefe);
    return () => document.removeEventListener("visibilitychange", pruefe);
  }, [loading, stravaSync]);

  const strava = useMemo<StravaApi>(() => ({
    connected: !!settings.strava?.refreshToken,
    athlete: settings.strava?.athleteName ?? null,
    busy: stravaBusy,
    needsReauth: !!settings.strava?.reauth,
    connect: async (code) => {
      setStravaBusy(true);
      try {
        const j = await stravaPost({ action: "exchange", code });
        if (!j.ok || !j.tokens) return { ok: false, error: j.error };
        await updateSettings({ strava: j.tokens });
      } catch (e) {
        return { ok: false, error: e instanceof Error ? e.message : "Netzwerkfehler" };
      } finally {
        setStravaBusy(false);
      }
      // Gleich abgleichen, damit die Fahrten sofort da sind.
      await stravaSync();
      return { ok: true };
    },
    syncNow: stravaSync,
    disconnect: () => void updateSettings({ strava: undefined }),
  }), [settings.strava, stravaBusy, stravaSync, updateSettings]);

  // Spotify uses OAuth PKCE (no server secret) — the token exchange/refresh and
  // now-playing polling live in the useSpotify hook; the provider only persists
  // the auth (so it syncs to the cloud like every other setting).
  const spotify = useMemo<SpotifyApi>(() => ({
    configured: !!process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID,
    auth: settings.spotify,
    connect: async (auth) => {
      await updateSettings({ spotify: auth });
    },
    disconnect: async () => {
      await updateSettings({ spotify: undefined });
    },
  }), [settings.spotify, updateSettings]);

  // DAS Context-Value — memoisiert, damit ein Provider-Render (z. B. ein
  // Settings-Toggle) nicht jede Konsumenten-Komponente neu rendert. Die
  // Aktions-Closures leben bewusst IN der Factory: sie entstehen nur, wenn
  // sich eine Dep wirklich ändert — Stale-Closures sind damit ausgeschlossen,
  // solange die Dep-Liste vollständig ist (exhaustive-deps wacht darüber).
  const value = useMemo<TrainingContextValue>(() => {
    // Ausgangswert für den nächsten Vorschlag — ohne Entlastungs- und
    // Test-Einheiten (lib/last-perf.ts).
    const lastPerf = (id: string): LastPerf | null => lastPerfOf(log, id);

    /**
     * Ersatz-Historie, wenn es die Übung selbst noch nie gab: die jüngste
     * Einheit mit gleichem Muster UND gleichem Hauptmuskel.
     *
     * Warum das nötig ist: die Komposition rotiert absichtlich („am längsten
     * nicht verwendete Übung je Muster“). Wer gestern Beinpresse gemacht hat
     * und heute Hackenschmidt bekommt, sah bisher „Erstes Mal“ — obwohl die
     * Zahlen von gestern sehr wohl etwas aussagen. Das wirkte, als vergäße
     * die App die Gewichte.
     *
     * NUR für die Anzeige. Die Gewichtsempfehlung bleibt bei `lastPerf` und
     * damit bei derselben Übung — fremde Lasten wären hier gefährlich.
     */
    const lastPerfRelated = (id: string): RelatedPerf | null => {
      const ziel = allLib.find((e) => e.id === id);
      if (!ziel) return null;
      const zielMuskel = muscleOf(ziel).primary;
      for (let i = log.length - 1; i >= 0; i--) {
        for (const se of log[i].exercises ?? []) {
          if (se.id === id || !hatArbeitssatz(se.sets)) continue;
          const kand = allLib.find((e) => e.id === se.id);
          if (!kand || kand.pattern !== ziel.pattern) continue;
          if (muscleOf(kand).primary !== zielMuskel) continue;
          return { sets: se.sets, date: log[i].date, exName: kand.name };
        }
      }
      return null;
    };

    /** Heutige Einheit setzen + persistieren (KEYS.today, synct mit). */
    const setTodaySession = (s: DailySession | null) => {
      setTodaySessionState(s);
      if (s) void storage.setJSON(KEYS.today, s);
      else void storage.remove(KEYS.today);
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
    // Dasselbe für Aufwärm-Drills (Aufwärm-Player) — identische Validierung.
    const setWarmupVideo = (drillId: string, url: string | null) => {
      const trimmed = (url ?? "").trim();
      const next = { ...warmupVideos };
      if (!trimmed || !youtubeEmbedUrl(trimmed)) delete next[drillId];
      else next[drillId] = trimmed;
      void saveWarmupVideos(next);
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

    // Orte. Der aktive Ort entscheidet über die Geräte; KEYS.equip spiegelt ihn
    // nur (Export, ältere gecachte App-Stände). Jeder Handler schreibt Settings
    // höchstens EINMAL — zwei Schreiber im selben Handler verlören den ersten.
    const waehleOrt = (id: string) => {
      const g = gyms.find((x) => x.id === id);
      if (!g || settings.activeGymId === id) return;
      void updateSettings({ activeGymId: id });
      void saveEquip([...g.equip]);
    };
    const addGym = (name: string, equipPreset?: EquipKey[]): string => {
      const g: GymProfile = {
        id: "gym_" + Date.now().toString(36),
        name: name.trim().slice(0, 40) || "Neuer Ort",
        equip: equipPreset ? [...equipPreset] : [...equip],
      };
      void saveGyms([...gyms, g]);
      return g.id;
    };
    const renameGym = (id: string, name: string) => {
      const clean = name.trim().slice(0, 40);
      if (!clean) return;
      void saveGyms(gyms.map((g) => (g.id === id ? { ...g, name: clean } : g)));
    };
    const removeGym = (id: string) => {
      if (gyms.length <= 1) return;
      const next = gyms.filter((g) => g.id !== id);
      void saveGyms(next);
      if (activeGym?.id === id) {
        void updateSettings({ activeGymId: next[0].id });
        void saveEquip([...next[0].equip]);
      }
    };
    const toggleEquip = (k: EquipKey, gymId?: string) => {
      const target = gyms.find((g) => g.id === (gymId ?? activeGym?.id));
      if (!target) {
        // Nur denkbar, solange noch keine Orte geladen sind.
        void saveEquip(equipFlat.includes(k) ? equipFlat.filter((x) => x !== k) : [...equipFlat, k]);
        return;
      }
      const next = target.equip.includes(k)
        ? target.equip.filter((x) => x !== k)
        : [...target.equip, k];
      void saveGyms(gyms.map((g) => (g.id === target.id ? { ...g, equip: next } : g)));
      if (target.id === activeGym?.id) void saveEquip(next);
    };
    const setOrtGeraete = (keys: readonly EquipKey[], on: boolean, gymId?: string) => {
      const target = gyms.find((g) => g.id === (gymId ?? activeGym?.id));
      if (!target) return;
      const next = on
        ? [...target.equip, ...keys.filter((k) => !target.equip.includes(k))]
        : target.equip.filter((k) => !keys.includes(k));
      void saveGyms(gyms.map((g) => (g.id === target.id ? { ...g, equip: next } : g)));
      if (target.id === activeGym?.id) void saveEquip(next);
    };
    const setNurGeraete = (on: boolean, gymId?: string) => {
      const target = gyms.find((g) => g.id === (gymId ?? activeGym?.id));
      if (!target) return;
      void saveGyms(
        gyms.map((g) => {
          if (g.id !== target.id) return g;
          const n: GymProfile = { ...g };
          if (on) n.nurGeraete = true;
          else delete n.nurGeraete;
          return n;
        }),
      );
    };
    const setGeraetFoto = (geraet: string, photoId: string | null) => {
      const alt = settingsRef.current.geraetFotos?.[geraet];
      if (alt && alt !== photoId) void deletePhoto(alt);
      void updateSettings((s) => {
        const fotos = { ...(s.geraetFotos ?? {}) };
        if (photoId) fotos[geraet] = photoId;
        else delete fotos[geraet];
        return { geraetFotos: fotos };
      });
    };

    const setWeightStep = (step: number, gymId?: string) => {
      const id = gymId ?? activeGym?.id;
      if (!id) return void updateSettings({ weightStep: step });
      void saveGyms(gyms.map((g) => (g.id === id ? { ...g, weightStep: step } : g)));
    };
    const setBikeWarmup = (on: boolean) =>
      void updateSettings({ bikeWarmup: on });
    const setBudget = (min: number) =>
      void updateSettings({ timeBudgetMin: min });
    const setKeepAwake = (on: boolean) =>
      void updateSettings({ keepAwake: on });
    const setDuckSpotify = (on: boolean) =>
      void updateSettings({ duckSpotify: on });
    const setAiPlanning = (on: boolean) =>
      void updateSettings({ aiPlanning: on });
    const setAtlasImTraining = (on: boolean) =>
      void updateSettings({ coachLive: on, coachMotivation: on });
    const setVoiceCues = (on: boolean) =>
      void updateSettings({ voiceCues: on });
    const setCueVolume = (v: number) =>
      void updateSettings({ cueVolume: v });
    const setTheme = (t: ThemePref) =>
      void updateSettings({ theme: t });
    const setZoetrope = (on: boolean) =>
      void updateSettings({ zoetrope: on });
    // Greift erst beim nächsten Kaltstart: das Startbild wählt das
    // Pre-Paint-Skript, lange bevor dieser Provider existiert.
    const setSplash = (v: NonNullable<AppSettings["splash"]>) =>
      void updateSettings({ splash: v });
    const setUserName = (name: string) =>
      void updateSettings({ userName: name.trim() || undefined });
    const setAthleteProfile = (patch: Partial<AthleteProfile>) =>
      void updateSettings((s) => ({ athleteProfile: { ...s.athleteProfile, ...patch } }));
    const completeOnboarding = (name?: string, profile?: Partial<AthleteProfile>) =>
      void updateSettings((s) => ({
        onboarded: true,
        userName: name?.trim() ? name.trim() : s.userName,
        athleteProfile: profile ? { ...s.athleteProfile, ...profile } : s.athleteProfile,
      }));

    /** Sprungtest: Sprunghöhe festhalten (7-Tage-Schnitt = Referenz). */
    const addJump = (heightCm: number) => {
      const next = [...jumps, { date: new Date().toISOString(), heightCm }].slice(-60);
      setJumps(next);
      void storage.setJSON(KEYS.jumps, next);
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

    const acceptExam = () =>
      void updateSettings({ lastExamDate: new Date().toISOString() });
    const acceptDeload = () =>
      void updateSettings({ lastDeloadDate: new Date().toISOString() });
    const dismissCard = (card: CoachCard) =>
      setDismissed((d) => [...d, card.kind + (card.exId ?? "")]);

    const addCustom = (data: CustomExerciseInput) => {
      void saveCustom([...custom, buildCustom("custom_" + Date.now(), data)]);
    };
    const toggleExerciseDisabled = (id: string) => {
      const next = disabledExercises.includes(id)
        ? disabledExercises.filter((x) => x !== id)
        : [...disabledExercises, id];
      setDisabledExercises(next);
      void storage.setJSON(KEYS.disabledExercises, next);
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
      // Die Einheit zählt für den Tag, an dem sie BEGANN: eine Einheit, die
      // um 23:40 startet und nach Mitternacht endet, gehört zur alten Woche.
      const jetzt = new Date().toISOString();
      const begonnen = new Date(state.startedAt).getTime();
      // Eine liegengebliebene Einheit (älter als 6 h, von der Heute-Seite aus
      // gespeichert) hat keine brauchbare Dauer: „Start bis jetzt“ wären Stunden.
      const liegengeblieben = istLiegengeblieben(state.startedAt);
      const newSession: LoggedSession = {
        date: Number.isFinite(begonnen) ? new Date(begonnen).toISOString() : jetzt,
        dayKey: "today",
        dayName: s.name,
        focus: s.focus,
        exercises,
        estimatedMin: estimateSessionMin(resolveDailySession(s, allLib, has)),
      };
      if (state.backTraffic) newSession.backTraffic = state.backTraffic;
      const durationMin = liegengeblieben ? null : sessionMinutes(state.startedAt, jetzt);
      if (durationMin != null) newSession.durationMin = durationMin;
      const noteText = (state.note ?? "").trim();
      if (noteText) newSession.note = noteText;
      if (state.readiness) newSession.readiness = state.readiness;
      if (deloadActive) newSession.isDeload = true;
      if (s.variant === "exam") newSession.isExam = true;
      if (s.variant === "reset") newSession.isBackReset = true;
      // Ort als Namens-Snapshot (wie die Übungs-Notiz): was an dem Tag galt.
      const ortName = s.ort?.name ?? activeGym?.name;
      if (ortName) newSession.ort = ortName;
      // Nach Datum einsortiert: eine nachträglich gespeicherte Einheit von
      // gestern gehört vor die von heute (der Verlauf ist überall aufsteigend).
      const newLog = nachDatum([...log, newSession]);
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
      if (durationMin != null) summary.durationMin = durationMin;
      setSaving(true);
      const gespeichert = await storage.setJSON(KEYS.log, newLog, { still: true });
      setSaving(false);
      // Nicht gespeichert (Speicher voll): NICHTS wegräumen. Früher verschwand
      // hier die laufende Einheit, obwohl sie nirgends stand.
      if (!gespeichert) throw new Error("Einheit konnte nicht gespeichert werden");
      setLog(newLog);
      // Heute-Einheit als erledigt stempeln — die Startseite zeigt dann Ruhe
      // statt eines abgearbeiteten Plans. Nur, wenn die Einheit von heute ist.
      if (s.date === todayKey()) setTodaySession({ ...s, completedAt: new Date().toISOString() });
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
      // Auch die leere Liste wird GESCHRIEBEN (nicht der Schlüssel entfernt):
      // nur so erfährt die Cloud vom Löschen. Sonst kam die letzte Einheit
      // beim nächsten Abgleich zurück.
      await storage.setJSON(KEYS.log, newLog);
    };

    /** Tauscht den Verlauf gegen die Sicherung (Stand vor der ersten Änderung
     *  des Tages). Der bisherige Verlauf wird dabei selbst zur Sicherung. */
    const holeSicherung = async (): Promise<boolean> => {
      const liste = await storage.tauscheSicherung(KEYS.log);
      if (!liste) return false;
      setLog(nachDatum(sanitizeSessions(liste)));
      return true;
    };

    /** „Alle Daten löschen“: wirklich alles — Verlauf, Körperwerte, Cardio,
     *  eigene Übungen, Orte, Einstellungen, Fotos — auf dem Gerät und in der
     *  Cloud. Danach startet die App wie neu. (Früher: nur der Verlauf, und
     *  der kam aus der Cloud zurück.) */
    const resetAll = async () => {
      const konto = await cloudKonto();
      // Mit Frist: bei „verbunden, aber nichts kommt an“ bliebe das Löschen
      // sonst hängen. Was nicht mehr ankommt, wird unten vorgemerkt.
      const cloudWeg = await Promise.race([
        cloudLeeren(),
        new Promise<false>((r) => window.setTimeout(() => r(false), 8000)),
      ]);
      if (cloudWeg === true) void leereCloudFotos();
      await leereFotos();
      await storage.leereAlles();
      // Die Cloud ließ sich nicht leeren (kein Netz): für dieses Konto
      // vormerken. Bis es nachgeholt ist, wird von dort nichts zurückgeholt.
      if (cloudWeg !== true && konto && cloudEmail) await merkeCloudLeeren(konto);
      window.location.replace("/");
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
      await storage.setJSON(KEYS.body, next); // auch leer: siehe deleteSession
    };

    const exportData = async (): Promise<ExportEnvelope> => ({
      schemaVersion: 4,
      exportedAt: new Date().toISOString(),
      log,
      equip,
      custom,
      body,
      cardio,
      gyms,
      exerciseVideos,
      exerciseNotes,
      warmupVideos,
      settings: ohneZugaenge(settings),
      disabledExercises,
      hiddenCardio,
      jumps,
      mission,
      chat: pruefeChat(await storage.getJSON<unknown>(KEYS.chat, [])),
    });

    const importData = async (
      raw: unknown,
      modus: ImportModus = "ergaenzen",
    ): Promise<boolean> => {
      if (!raw || typeof raw !== "object") return false;
      const d = raw as Record<string, unknown>;
      if (!Array.isArray(d.log)) return false;
      const dazu = modus === "ergaenzen";
      // Sanitizer statt roher Cast — dieselbe Härtung wie loadAll (eine Wahrheit).
      // Ein fehlendes Feld behält den aktuellen State (Teil-Backup löscht nichts).
      const dLog = sanitizeSessions(d.log);
      const nextLog = nachDatum(dazu ? ergaenze(log, dLog, (x) => x.date) : dLog);
      const nextEquipRaw =
        !dazu && Array.isArray(d.equip) ? (d.equip as EquipKey[]) : equip;
      const dCustom = d.custom !== undefined ? sanitizeCustom(d.custom) : null;
      const nextCustom = dCustom ? (dazu ? ergaenze(custom, dCustom, (x) => x.id) : dCustom) : custom;
      const dBody = d.body !== undefined ? sanitizeBody(d.body) : null;
      const nextBody = dBody
        ? nachDatum(dazu ? ergaenze(body, dBody, (x) => x.date) : dBody)
        : body;
      const dCardio = d.cardio !== undefined ? sanitizeCardio(d.cardio) : null;
      // mergeCardio: der zweite gewinnt bei gleicher Kennung — also das Gerät.
      const nextCardio = dCardio ? (dazu ? mergeCardio(dCardio, cardio) : dCardio) : cardio;
      const dGyms = d.gyms !== undefined ? sanitizeGyms(d.gyms) : null;
      const nextGymsRaw = dGyms ? (dazu ? ergaenze(gyms, dGyms, (x) => x.id) : dGyms) : gyms;
      const dVideos = d.exerciseVideos !== undefined ? sanitizeVideoMap(d.exerciseVideos) : null;
      const nextExerciseVideos = dVideos
        ? dazu
          ? { ...dVideos, ...exerciseVideos }
          : dVideos
        : exerciseVideos;
      const dWarm = d.warmupVideos !== undefined ? sanitizeVideoMap(d.warmupVideos) : null;
      const nextWarmupVideos = dWarm ? (dazu ? { ...dWarm, ...warmupVideos } : dWarm) : warmupVideos;
      const dNotes = d.exerciseNotes !== undefined ? sanitizeStringMap(d.exerciseNotes) : null;
      const nextExerciseNotes = dNotes
        ? dazu
          ? { ...dNotes, ...exerciseNotes }
          : dNotes
        : exerciseNotes;
      // Einstellungen: beim Ergänzen bleiben die des Geräts. Beim Ersetzen
      // kommen die der Datei — die Zugänge zu Strava und Spotify aber immer
      // vom Gerät (alte Dateien enthielten sie noch, und die sind verfallen).
      const jetzige = settingsRef.current;
      const nextSettingsRaw: AppSettings =
        !dazu && d.settings && typeof d.settings === "object" && !Array.isArray(d.settings)
          ? {
              ...DEFAULT_SETTINGS,
              ...ohneZugaenge(d.settings as AppSettings),
              strava: jetzige.strava,
              spotify: jetzige.spotify,
            }
          : jetzige;
      const dAus = d.disabledExercises !== undefined ? nurTexte(d.disabledExercises) : null;
      const nextDisabled = dAus ? (dazu ? vereinige(disabledExercises, dAus) : dAus) : disabledExercises;
      const dVersteckt = d.hiddenCardio !== undefined ? nurTexte(d.hiddenCardio) : null;
      const nextHidden = dVersteckt
        ? dazu
          ? vereinige(hiddenCardio, dVersteckt)
          : dVersteckt
        : hiddenCardio;
      const dSpruenge = d.jumps !== undefined ? pruefeSpruenge(d.jumps) : null;
      const nextJumps = dSpruenge
        ? nachDatum(dazu ? ergaenze(jumps, dSpruenge, (x) => x.date) : dSpruenge).slice(-60)
        : jumps;
      const dMission =
        d.mission && typeof d.mission === "object" && (d.mission as StoredMission).targets &&
        typeof (d.mission as StoredMission).targets === "object"
          ? (d.mission as StoredMission)
          : null;
      const nextMission = dazu ? (mission ?? dMission) : (dMission ?? mission);
      const dChat = d.chat !== undefined ? pruefeChat(d.chat) : null;
      const jetzigerChat = pruefeChat(await storage.getJSON<unknown>(KEYS.chat, []));
      const nextChat = dChat ? (dazu && jetzigerChat.length ? jetzigerChat : dChat) : jetzigerChat;
      // Dieselbe Orte-Heilung wie beim Laden: ein Backup ohne Orte oder mit
      // verwaister `activeGymId` darf keinen ortlosen Zustand hinterlassen.
      const orte = ensureOrte(nextGymsRaw, nextEquipRaw, nextSettingsRaw);
      const nextGyms = orte.gyms;
      const nextSettings = orte.settings;
      const nextEquip =
        nextGyms.find((g) => g.id === nextSettings.activeGymId)?.equip ?? nextEquipRaw;
      // Den bisherigen Stand festhalten, BEVOR etwas überschrieben wird — auch
      // wenn heute schon eine Sicherung entstand. So lässt sich ein falsch
      // eingespieltes Backup in den Einstellungen zurücknehmen.
      await storage.sichereJetzt(KEYS.log);
      await storage.sichereJetzt(KEYS.body);
      setLog(nextLog);
      setEquipFlat(nextEquip);
      setCustom(nextCustom);
      setBody(nextBody);
      setCardio(nextCardio);
      setGyms(nextGyms);
      setExerciseVideos(nextExerciseVideos);
      setWarmupVideos(nextWarmupVideos);
      setExerciseNotes(nextExerciseNotes);
      setDisabledExercises(nextDisabled);
      setHiddenCardio(nextHidden);
      setJumps(nextJumps);
      setMission(nextMission);
      const still = { still: true };
      const ergebnisse = await Promise.all([
        storage.setJSON(KEYS.log, nextLog, still),
        storage.setJSON(KEYS.equip, nextEquip, still),
        storage.setJSON(KEYS.custom, nextCustom, still),
        storage.setJSON(KEYS.body, nextBody, still),
        storage.setJSON(KEYS.cardio, nextCardio, still),
        storage.setJSON(KEYS.gyms, nextGyms, still),
        storage.setJSON(KEYS.exerciseVideos, nextExerciseVideos, still),
        storage.setJSON(KEYS.warmupVideos, nextWarmupVideos, still),
        storage.setJSON(KEYS.exerciseNotes, nextExerciseNotes, still),
        storage.setJSON(KEYS.disabledExercises, nextDisabled, still),
        storage.setJSON(KEYS.hiddenCardio, nextHidden, still),
        storage.setJSON(KEYS.jumps, nextJumps, still),
        storage.setJSON(KEYS.chat, nextChat, still),
        nextMission ? storage.setJSON(KEYS.mission, nextMission, still) : Promise.resolve(true),
        saveSettings(nextSettings).then(() => true),
      ]);
      return ergebnisse.every(Boolean);
    };

    return {
      log,
      equip,
      exerciseVideos,
      warmupVideos,
      exerciseNotes,
      body,
      loading,
      saving,
      allLib,
      has,
      settings,
      todayReadiness,
      muscleVolumes,
      coach,
      cardioAdvice: cardioTip,
      phase,
      deloadActive,
      trainer,
      mission,
      weekCount,
      daysAgo,
      lastBackRed,
      backSpareToday,
      setBackSpareToday,
      backSafeActive,
      lastPerf,
      lastPerfRelated,
      toggleEquip,
      setOrtGeraete,
      setNurGeraete,
      setGeraetFoto,
      addCustom,
      updateCustom,
      removeCustom,
      disabledExercises,
      toggleExerciseDisabled,
      setExerciseVideo,
      setWarmupVideo,
      setExerciseNote,
      gyms,
      activeGym,
      waehleOrt,
      addGym,
      renameGym,
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
      setZoetrope,
      setSplash,
      weightStep: gewichtsstufe(activeGym, settings),
      setWeightStep,
      setBikeWarmup,
      setKeepAwake,
      setDuckSpotify,
      setAiPlanning,
      setAtlasImTraining,
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
      holeSicherung,
      cardio,
      addManualCardio,
      removeCardio,
      strava,
      spotify,
      cloud,
    };
  }, [
    log,
    equip,
    custom,
    exerciseVideos,
    warmupVideos,
    exerciseNotes,
    body,
    loading,
    saving,
    allLib,
    has,
    settings,
    todayReadiness,
    muscleVolumes,
    coach,
    cardioTip,
    phase,
    trainer,
    mission,
    weekCount,
    daysAgo,
    lastBackRed,
    backSpareToday,
    backSafeActive,
    deloadActive,
    gyms,
    activeGym,
    equipFlat,
    todaySession,
    jumps,
    cardio,
    hiddenCardio,
    disabledExercises,
    saveEquip,
    saveCustom,
    saveSettings,
    updateSettings,
    cloudEmail,
    saveGyms,
    saveCardio,
    saveExerciseVideos,
    saveWarmupVideos,
    saveExerciseNotes,
    strava,
    spotify,
    cloud,
  ]);

  return (
    <TrainingContext.Provider value={value}>{children}</TrainingContext.Provider>
  );
}
