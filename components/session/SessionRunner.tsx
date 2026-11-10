"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AtlasPanel } from "@/components/session/AtlasPanel";
import { ExerciseStage } from "@/components/session/ExerciseStage";
import { FinishFlow } from "@/components/session/FinishFlow";
import { OverviewSheet } from "@/components/session/OverviewSheet";
import { ProgressHeader } from "@/components/session/ProgressHeader";
import { DockSlotContext } from "@/components/session/DockSlot";
import { RestPanel } from "@/components/session/RestPanel";
import { SessionEditSheet } from "@/components/home/SessionEditSheet";
import { SpotifyNowPlaying } from "@/components/spotify/SpotifyNowPlaying";
import { useSpotifyDuck } from "@/components/spotify/useSpotifyDuck";
import { ExercisePicker } from "@/components/workout/ExercisePicker";
import { GuideSheet } from "@/components/workout/GuideSheet";
import { ReadinessGate } from "@/components/workout/ReadinessGate";
import { SessionComplete, type SiegerTafel } from "@/components/workout/SessionComplete";
import { WarmupPlayer } from "@/components/warmup/WarmupPlayer";
import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/Skeleton";
import {
  useTraining,
  type SessionSummary,
} from "@/components/providers/TrainingProvider";
import {
  applySetDelta,
  cascadeWeight,
  clearActiveState,
  doneWorkSets,
  itemDone,
  itemExercise,
  loadActiveState,
  nextOpenItemIndex,
  nextSetPreview,
  persistActiveState,
  prefillEntries,
  prescForItem,
  reconcileEntries,
  startScale,
  workSetNo,
  type ActiveSessionState,
  type PrefillOpts,
  type PrescCtx,
} from "@/lib/active-session";
import type { CoachReactAdjustment } from "@/lib/atlas/live-tool";
import { buildDebriefFacts, buildSessionTranscript } from "@/lib/atlas/transcript";
import { athletePersona, effectiveProfile } from "@/lib/athlete";
import { bandOfActive, regionOf, type Region } from "@/lib/phasen/band";
import { plattenNummern } from "@/lib/platte";
import { figurFor, type PhasenFigurDef } from "@/lib/phasen/figuren";
import { swapItem, type DailySession } from "@/lib/session-model";
import { estimateRemainingMin, TIME } from "@/lib/session-time";
import { roundStep } from "@/lib/progression";
import { beatsRecord, exerciseRecords, recordUnit, setMetric } from "@/lib/records";
import { beep, beepEnd, primeAudio } from "@/lib/beep";
import { swapPoolFor } from "@/lib/swap-pool";
import { toast } from "@/lib/toast";
import { success, tap } from "@/lib/haptics";
import { speak } from "@/lib/voice";
import { fmtSatz } from "@/lib/format";
import { cn } from "@/lib/utils";
import { warmupFor } from "@/lib/warmup";
import { ChevronLeft, ChevronRight, Flag } from "lucide-react";
import type { Exercise, Readiness, SetEntry, TrafficLight } from "@/lib/types";

type Boot = "loading" | "gate" | "none" | "running";

interface RestState {
  itemId: string;
  setIdx: number;
  left: number;
  total: number;
}

/** ATLAS' Live-Reaktion (KI) — ersetzt die deterministische Zeile im Panel. */
interface LiveCoachCall {
  itemId: string;
  say: string;
  adjustment?: CoachReactAdjustment;
}

/** Textfeld mit Tastatur (Satzkarte, Notiz) — solange eins den Fokus hat,
 *  bleibt das Dock unsichtbar. */
const istFeld = (t: EventTarget | null) =>
  t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement;

/** Kosten-Deckel: mehr Live-Reaktionen braucht keine Einheit. */
const COACH_CALL_CAP = 40;

/**
 * Der Fokus-Stepper: EINE Übung auf der Bühne, Check-in → Aufwärmen →
 * Übungen → Abschluss als Phasen. Jeder Commit persistiert lokal
 * (crash-sicheres Resume); die Übersicht springt, der Editor baut um.
 */
export function SessionRunner() {
  const router = useRouter();
  const {
    todaySession,
    setTodaySession,
    allLib,
    has,
    log,
    body,
    lastPerf,
    lastPerfRelated,
    daysAgo,
    settings,
    todayReadiness,
    setReadiness,
    lastBackRed,
    backSpareToday,
    setBackSpareToday,
    saveActiveSession,
    amendLastDebrief,
    discardActive,
    saving,
    exerciseNotes,
    disabledExercises,
  } = useTraining();

  const [active, setActive] = useState<ActiveSessionState | null>(null);
  const [boot, setBoot] = useState<Boot>("loading");
  const [complete, setComplete] = useState<SessionSummary | null>(null);
  // Piktogramm-Pose der Einheit — VOR dem Save berechnet (danach ist active weg).
  const [completeFigur, setCompleteFigur] = useState<PhasenFigurDef | null>(null);
  const [completeRegion, setCompleteRegion] = useState<Region | undefined>(undefined);
  // Rekord-Tafel des Sieger-Moments — ebenfalls VOR dem Save (recordMap kennt
  // nur das Archiv; nach dem Save wäre die eigene Studie schon der Rekord).
  const [completeSieger, setCompleteSieger] = useState<SiegerTafel | null>(null);
  const [rest, setRest] = useState<RestState | null>(null);
  /** Gemessene Höhe des Docks (0 = leer) — siehe Wirt unten. */
  const [dockH, setDockH] = useState(0);
  /** Ziel für „Satz eintragen“ (Portal aus der Satzkarte). */
  const [slotEl, setSlotEl] = useState<HTMLDivElement | null>(null);
  /** Ein Eingabefeld hat den Fokus → Dock ausblenden (iOS-Tastatur). */
  const [tippt, setTippt] = useState(false);
  const dockObs = useRef<ResizeObserver | null>(null);
  // Der Wirt existiert nur in der Übungs-Phase: Callback-Ref misst bei jedem
  // (Re-)Mount neu und räumt beim Abbau auf — der Inhalt darüber bekommt so
  // immer genau die Dock-Höhe als Auslauf.
  const dockRef = useCallback((el: HTMLDivElement | null) => {
    dockObs.current?.disconnect();
    dockObs.current = null;
    if (!el) {
      setDockH(0);
      return;
    }
    const melde = () => setDockH(Math.round(el.getBoundingClientRect().height));
    melde();
    const ro = new ResizeObserver(melde);
    ro.observe(el);
    dockObs.current = ro;
  }, []);
  // Kopf-Kondensation: erst wenn der Sentinel überscrollt ist, bekommt der
  // haftende Fortschrittskopf Glass + Hairline (sonst nackte Zeile im Inhalt).
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const [condensed, setCondensed] = useState(false);
  const [overviewOpen, setOverviewOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [exitOpen, setExitOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [swapOpen, setSwapOpen] = useState(false);

  // Refs für Handler, die frischen State brauchen, ohne pro Render neu zu binden.
  const activeRef = useRef<ActiveSessionState | null>(null);
  const committedRef = useRef<Set<string>>(new Set());
  const recordCelebratedRef = useRef<Set<string>>(new Set());

  // ── ATLAS live: KI-Reaktion pro Satz (deterministische Zeile sofort, die
  //    KI ersetzt sie). Debounce lässt RIR/Gewichts-Nachträge einfließen; die
  //    Generation invalidiert wartende UND laufende Anfragen. ──
  const [coachCall, setCoachCall] = useState<LiveCoachCall | null>(null);
  const coachGenRef = useRef(0);
  const coachTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const coachPendingRef = useRef<{ itemId: string; setIdx: number } | null>(null);
  const coachCountRef = useRef(0);
  const coachOffRef = useRef(false); // Route meldete configured:false

  const byId = useMemo(() => new Map(allLib.map((e) => [e.id, e])), [allLib]);
  const recordMap = useMemo(
    () => new Map(exerciseRecords(log).map((r) => [r.exId, r] as const)),
    [log],
  );

  const commit = (st: ActiveSessionState | null) => {
    activeRef.current = st;
    setActive(st);
    if (st) void persistActiveState(st);
  };
  const patch = (fn: (st: ActiveSessionState) => ActiveSessionState) => {
    const cur = activeRef.current;
    if (cur) commit(fn(cur));
  };

  const lighter = daysAgo != null && daysAgo > 5;
  const scale = useMemo(
    () => startScale(settings, active?.readiness ?? null),
    [settings, active?.readiness],
  );
  // EINE Profil-Quelle für Startgewichts-Schätzung + Coach-Persona.
  const profile = useMemo(() => effectiveProfile(settings, body), [settings, body]);
  const prefillOpts = (variant: DailySession["variant"]): PrefillOpts => ({
    allLib,
    lastPerf,
    daysAgo,
    weightStep: settings.weightStep,
    scale,
    variant,
    profile,
  });

  // Letzte Leistung der AKTUELLEN Übung einmal je (Übung, Log) rechnen —
  // vorher scannte jeder Render das ganze Log dreifach.
  const curExId = active
    ? (active.session.items[active.currentIndex]?.exerciseId ?? null)
    : null;
  const curLp = useMemo(
    () => (curExId ? lastPerf(curExId) : null),
    [lastPerf, curExId],
  );
  // Ersatz-Historie einer verwandten Übung — nur wenn es die Übung selbst
  // noch nie gab. Reine Anzeige (siehe RelatedPerf), nie Grundlage der
  // Gewichtsempfehlung.
  const curRel = useMemo(
    () => (curExId && !curLp ? lastPerfRelated(curExId) : null),
    [lastPerfRelated, curExId, curLp],
  );
  // Name der nächsten OFFENEN Übung für den Knopf der Bühne — genau dorthin
  // springt „Weiter“; null, wenn danach der Abschluss kommt.
  const nextExName = useMemo(() => {
    if (!active) return null;
    const n = nextOpenItemIndex(active, active.currentIndex, byId);
    if (n == null || n === active.currentIndex) return null;
    return byId.get(active.session.items[n].exerciseId)?.name ?? null;
  }, [active, byId]);

  // Eine Rechenvorschrift für Vorschläge: Bühne und Pausen-Vorschau.
  const prescCtx = useMemo<PrescCtx>(
    () => ({ lastPerf, profile, lighter, scale, weightStep: settings.weightStep }),
    [lastPerf, profile, lighter, scale, settings.weightStep],
  );
  // Was nach der Pause kommt — neu nur bei neuem Satz oder geändertem
  // Protokoll, nicht jede Sekunde des Countdowns.
  const restItemId = rest?.itemId;
  const restSetIdx = rest?.setIdx;
  const restNext = useMemo(
    () =>
      active && restItemId != null
        ? nextSetPreview(active, restItemId, byId, prescCtx)
        : null,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [restItemId, restSetIdx, active?.entries, active?.session, byId, prescCtx],
  );

  // Schnell-Tausch: Pool für das aktuelle Item (geteilte Politik mit dem
  // Edit-Sheet — same-pattern zuerst, deaktivierte Übungen raus).
  const stagePool = useMemo(() => {
    if (!active || active.phase !== "exercise") return [];
    const it = active.session.items[active.currentIndex];
    if (!it) return [];
    return swapPoolFor(active.session, it.id, allLib, has, disabledExercises);
  }, [active, allLib, has, disabledExercises]);

  /** Frisch starten: Tagesform-Skalierung einfrieren, Sätze vorbelegen. */
  const begin = (readiness?: Readiness, spare?: boolean) => {
    const base = todaySession;
    if (!base) {
      setBoot("none");
      return;
    }
    const r = readiness ?? todayReadiness ?? undefined;
    const sc = startScale(settings, r ?? null);
    const backSafe =
      base.variant === "reset" || lastBackRed || (spare ?? backSpareToday);
    const known = {
      ...base,
      items: base.items.filter((it) => byId.has(it.exerciseId)),
    };
    if (known.items.length === 0) {
      setBoot("none");
      return;
    }
    const session = applySetDelta(known, allLib, sc);
    const entries = prefillEntries(session, {
      allLib,
      lastPerf,
      daysAgo,
      weightStep: settings.weightStep,
      scale: sc,
      profile,
    });
    const st: ActiveSessionState = {
      session,
      entries,
      currentIndex: 0,
      phase: "warmup",
      startedAt: new Date().toISOString(),
      backSafe,
      schemaVersion: 1,
    };
    if (r) st.readiness = r;
    commit(st);
    setBoot("running");
  };
  const beginRef = useRef(begin);
  beginRef.current = begin;

  // Boot: gespeicherte Einheit (<6 h) nahtlos fortsetzen, sonst frisch starten
  // (mit Check-in, wenn Autoregulation an und heute noch keiner passiert ist).
  const bootedRef = useRef(false);
  useEffect(() => {
    if (bootedRef.current) return;
    bootedRef.current = true;
    let alive = true;
    void loadActiveState().then((saved) => {
      if (!alive) return;
      if (saved) {
        const items = saved.session.items.filter((it) => byId.has(it.exerciseId));
        if (items.length > 0) {
          const st: ActiveSessionState = {
            ...saved,
            session: { ...saved.session, items },
            currentIndex: Math.min(saved.currentIndex, items.length - 1),
          };
          // Bereits protokollierte Sätze nicht erneut als „frisch" feiern.
          for (const [itemId, sets] of Object.entries(st.entries)) {
            sets.forEach((s, i) => {
              if (s.reps !== "" && s.reps != null)
                committedRef.current.add(`${itemId}:${i}`);
            });
          }
          commit(st);
          setBoot("running");
          return;
        }
        void clearActiveState();
      }
      const t = todaySession;
      if (!t || t.completedAt || t.items.length === 0) {
        setBoot("none");
        return;
      }
      if (settings.autoregOn && !todayReadiness) {
        setBoot("gate");
        return;
      }
      beginRef.current();
    });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Ohne startbare Einheit gehört der Nutzer auf die Startseite.
  useEffect(() => {
    if (boot === "none") router.replace("/");
  }, [boot, router]);

  // Display-Wachhalten läuft jetzt app-weit in der AppShell (settings.keepAwake).

  // Spotify beim Countdown kurz leiser (Pause + Aufwärmen) — inert ohne
  // Verbindung; Restore übernimmt der Hook (Timer/Unmount).
  const { duckFor } = useSpotifyDuck(settings.duckSpotify !== false);
  const onWarmupCountdown = useCallback(
    (kind: "drill" | "switch") => duckFor(kind === "drill" ? 7000 : 5000),
    [duckFor],
  );

  // Aufwärm-Drills: deterministisch je (Einheit, Tag) — Seed aus startedAt,
  // damit Reload und Re-Render exakt dieselbe Liste sehen (Rotation ohne
  // Zufall); Tagesform/Rücken/Equipment fließen in die RAMP-Auswahl ein.
  const warmupDrills = useMemo(
    () =>
      active && active.phase === "warmup"
        ? warmupFor(active.session.items, allLib, {
            readiness: active.readiness,
            backSafe: active.backSafe,
            lastBackRed,
            bike: !!settings.bikeWarmup,
            has,
            seed: active.startedAt.slice(0, 10),
          })
        : [],
    [active, allLib, lastBackRed, settings.bikeWarmup, has],
  );

  // Beobachtet den 1-px-Sentinel über dem Kopf (Muster FigurePanel) —
  // Deps decken das (Re-)Mounten des Baums ab: der Sentinel existiert erst
  // in der Übungs-Phase (Check-in/Aufwärmen rendern andere Bäume).
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const obs = new IntersectionObserver(([entry]) =>
      setCondensed(!entry.isIntersecting),
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [boot, complete, active?.phase]);

  // Fällt ein fokussiertes Feld weg (Satz eingetragen → nächste Karte), feuert
  // nicht jeder Browser ein Blur — nach jedem Zustandswechsel nachsehen,
  // sonst bliebe das Dock unsichtbar.
  useEffect(() => {
    setTippt(istFeld(document.activeElement));
  }, [active, rest]);

  // Deep-Link / PWA-Relaunch mitten ins Training: ohne User-Geste bleibt der
  // AudioContext suspended und die Pausen-Beeps wären stumm. Der ERSTE Tap
  // irgendwo entsperrt Audio + Speech (gleiches Muster wie im WarmupPlayer).
  useEffect(() => {
    const prime = () => {
      primeAudio();
      try {
        window.speechSynthesis?.resume();
      } catch {
        /* Speech optional */
      }
      document.removeEventListener("pointerdown", prime);
      document.removeEventListener("keydown", prime);
    };
    document.addEventListener("pointerdown", prime);
    document.addEventListener("keydown", prime);
    return () => {
      document.removeEventListener("pointerdown", prime);
      document.removeEventListener("keydown", prime);
    };
  }, []);

  // Pausen-Countdown — als Dock unten, hörbar ohne Blick aufs Display: Tick
  // in den letzten 3 s, Doppelton bei 0. iOS kennt kein navigator.vibrate —
  // Audio ist dort das einzige Ende-Signal. Beeps bewusst ungated (cueVolume
  // regelt die Lautstärke), nur die Stimme hängt an voiceCues. Kein Auto-
  // Unmount: das Dock bleibt als „Pause vorbei" stehen, bis der Nutzer
  // weitermacht (+15 s startet neu, Weiter räumt weg).
  useEffect(() => {
    if (!rest) return;
    if (rest.left <= 0) {
      beepEnd();
      if (typeof navigator !== "undefined" && navigator.vibrate)
        navigator.vibrate(200);
      if (settings.voiceCues) speak("Pause vorbei. Auf geht's.", { interrupt: true });
      return;
    }
    // Musik kurz leiser, damit Endton + Ansage durchkommen (Restore automatisch).
    if (rest.left === 5) duckFor(7000);
    if (rest.left <= 3) beep();
    if (settings.voiceCues) {
      if (rest.left === 10) speak("Noch zehn Sekunden");
      else if (rest.left <= 3) speak(["", "eins", "zwei", "drei"][rest.left]);
    }
    const id = setTimeout(
      () => setRest((r) => (r ? { ...r, left: r.left - 1 } : r)),
      1000,
    );
    return () => clearTimeout(id);
  }, [rest, settings.voiceCues, duckFor]);

  /* ── Satz-Handler ── */

  const setField = (
    itemId: string,
    i: number,
    field: keyof SetEntry,
    val: string | number | boolean | undefined,
  ) => {
    patch((st) => {
      const cur = st.entries[itemId] ?? [];
      if (!cur[i]) return st;
      const next =
        field === "weight" && typeof val === "string"
          ? cascadeWeight(cur, i, val)
          : cur.map((s, j) => (j === i ? { ...s, [field]: val } : s));
      return { ...st, entries: { ...st.entries, [itemId]: next } };
    });
  };

  /* ── ATLAS live: KI-Reaktion je Satz (Cap, Debounce, Generation) ── */

  const persona = useMemo(
    () => athletePersona(profile, settings.userName),
    [profile, settings.userName],
  );

  const cancelCoachCall = () => {
    coachGenRef.current += 1;
    if (coachTimerRef.current) clearTimeout(coachTimerRef.current);
    coachTimerRef.current = null;
    coachPendingRef.current = null;
  };

  /** Eingriff härten: Gewicht nur für die Übung der Ansage, nur wenn dort noch
   *  ein Satz offen ist, gerundet und höchstens ±10 % (mind. ein Schritt) um
   *  das eben bewegte Gewicht — das Versprechen aus dem Prompt, hier erzwungen. */
  const vetAdjustment = (
    adj: CoachReactAdjustment | undefined,
    itemId: string,
    lastSet: SetEntry,
  ): CoachReactAdjustment | undefined => {
    if (!adj) return undefined;
    if (adj.kind === "rest") return adj;
    const st = activeRef.current;
    if (!st) return undefined;
    const item = st.session.items.find((it) => it.id === itemId);
    const ex = item ? byId.get(item.exerciseId) : undefined;
    if (!ex?.weighted) return undefined;
    const sets = st.entries[itemId] ?? [];
    if (!sets.some((x) => !x.warmup && (x.reps === "" || x.reps == null)))
      return undefined;
    const ref = Number(lastSet.weight);
    if (!Number.isFinite(ref) || ref <= 0) return undefined;
    const step = settings.weightStep || 2.5;
    const bound = Math.max(ref * 0.1, step);
    const clamped = Math.min(ref + bound, Math.max(ref - bound, adj.value));
    const rounded = roundStep(clamped, step);
    return rounded > 0 ? { kind: "weight", value: rounded } : undefined;
  };

  const requestCoachCall = async (itemId: string, setIdx: number) => {
    const st = activeRef.current;
    if (!st) return;
    if (settings.coachLive === false || coachOffRef.current) return;
    if (coachCountRef.current >= COACH_CALL_CAP) return;
    if (typeof navigator !== "undefined" && navigator.onLine === false) return;
    const item = st.session.items.find((it) => it.id === itemId);
    const ex = item ? byId.get(item.exerciseId) : undefined;
    const set = st.entries[itemId]?.[setIdx];
    if (!item || !ex || !set || set.warmup || ex.pattern === "cardio") return;
    if (set.reps === "" || set.reps == null) return;
    coachCountRef.current += 1;
    const transcript = buildSessionTranscript({
      state: st,
      allLib,
      itemId,
      setIdx,
      records: recordMap,
      exerciseNotes,
      budgetMin: settings.timeBudgetMin,
    });
    const gen = coachGenRef.current;
    try {
      const res = await fetch("/api/atlas/set", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript, persona }),
      });
      const data = (await res.json().catch(() => null)) as
        | { ok?: boolean; call?: { say?: string; adjustment?: CoachReactAdjustment }; configured?: boolean }
        | null;
      if (data?.configured === false) {
        coachOffRef.current = true;
        return;
      }
      // Inzwischen neuer Satz/Sprung? Dann verfällt die Antwort.
      if (gen !== coachGenRef.current) return;
      if (!data?.ok || !data.call?.say) return;
      const call: LiveCoachCall = {
        itemId,
        say: data.call.say,
        adjustment: vetAdjustment(data.call.adjustment, itemId, set),
      };
      setCoachCall(call);
      if (settings.voiceCues) speak(call.say);
    } catch {
      /* Panel bleibt bei der deterministischen Zeile */
    }
  };

  /** Nach einem Satz-Commit die KI-Reaktion planen — der Debounce lässt
   *  RIR-/Gewichts-Nachträge desselben Satzes noch einfließen. */
  const scheduleCoachCall = (itemId: string, setIdx: number) => {
    setCoachCall(null);
    cancelCoachCall();
    coachPendingRef.current = { itemId, setIdx };
    coachTimerRef.current = setTimeout(() => {
      coachTimerRef.current = null;
      coachPendingRef.current = null;
      void requestCoachCall(itemId, setIdx);
    }, 2000);
  };

  /** RIR/Intensität/Gewicht auf einen Satz mit wartender Anfrage → schieben. */
  const setFieldEffort = (
    itemId: string,
    i: number,
    field: keyof SetEntry,
    val: string | number | boolean | undefined,
  ) => {
    setField(itemId, i, field, val);
    const p = coachPendingRef.current;
    if (p && p.itemId === itemId && p.setIdx === i) scheduleCoachCall(itemId, i);
  };

  /** Eingriff übernehmen: Gewicht → nächster offener Satz der Übung (Kaskade
   *  zieht Folgesätze mit); Pause → laufender Countdown wird verlängert. */
  const applyCoach = () => {
    const call = coachCall;
    if (!call?.adjustment) return;
    const adj = call.adjustment;
    if (adj.kind === "rest") {
      setRest((r) =>
        r ? { ...r, left: r.left + adj.value, total: r.total + adj.value } : r,
      );
    } else {
      const st = activeRef.current;
      const sets = st?.entries[call.itemId] ?? [];
      const idx = sets.findIndex((x) => !x.warmup && (x.reps === "" || x.reps == null));
      if (idx >= 0) setField(call.itemId, idx, "weight", String(adj.value));
    }
    tap();
    setCoachCall(null);
  };

  // Aufräumen beim Verlassen; Bühnenwechsel macht die alte Ansage gegenstandslos.
  useEffect(() => cancelCoachCall, []);
  useEffect(() => {
    setCoachCall(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active?.currentIndex]);

  const onReps = (itemId: string, i: number, oldVal: string, val: string) => {
    setField(itemId, i, "reps", val);
    if ((oldVal !== "" && oldVal != null) || val === "" || val == null) return;
    // Erst-Commit dieses Satzes: Pause starten, Moment feiern.
    const ck = `${itemId}:${i}`;
    if (committedRef.current.has(ck)) return;
    committedRef.current.add(ck);
    const st = activeRef.current;
    const set = st?.entries[itemId]?.[i];
    const item = st?.session.items.find((it) => it.id === itemId);
    const ex = item ? byId.get(item.exerciseId) : undefined;
    if (!st || !set || !ex || set.warmup || ex.pattern === "cardio") return;
    const rec = recordMap.get(ex.id) ?? null;
    if (rec && beatsRecord(ex, set, rec) && !recordCelebratedRef.current.has(itemId)) {
      recordCelebratedRef.current.add(itemId);
      success();
      if (settings.voiceCues) speak("Neuer Rekord. Den nimmt dir keiner.");
    } else {
      tap();
    }
    // Direkt vorm Pausenstart wecken — der Countdown tönt dann auch aus Timern.
    primeAudio();
    setRest({ itemId, setIdx: i, left: TIME.restSec, total: TIME.restSec });
    scheduleCoachCall(itemId, i);
  };

  /* ── Navigation ── */

  const nextOpenIndex = (): number | null => {
    const st = activeRef.current;
    return st ? nextOpenItemIndex(st, st.currentIndex, byId) : null;
  };

  const goNext = () => {
    tap();
    const n = nextOpenIndex();
    if (n == null) {
      // Abschluss-Phase hat kein Dock — stehende Pause nicht mitnehmen.
      setRest(null);
      patch((s) => ({ ...s, phase: "finish" }));
    } else patch((s) => ({ ...s, currentIndex: n }));
  };

  const goPrev = () => {
    tap();
    patch((s) => ({ ...s, currentIndex: Math.max(0, s.currentIndex - 1) }));
  };

  /** Umbau mitten in der Einheit: Session ersetzen, Protokoll abgleichen. */
  const applyEdit = (next: DailySession) => {
    patch((st) => ({
      ...st,
      session: next,
      currentIndex: Math.max(0, Math.min(next.items.length - 1, st.currentIndex)),
      entries: reconcileEntries(st.entries, st.session, next, prefillOpts(next.variant)),
    }));
    // Heute-Karte spiegelt die real trainierte Fassung.
    setTodaySession(next);
  };

  /** Schnell-Tausch der aktuellen Übung aus der Bühne (1 Tap → Picker → fertig).
   *  reconcileEntries übernimmt das Schwere: gefüllte Sätze bleiben, der Rest
   *  kommt frisch für die neue Übung (inkl. deren Startgewicht). */
  const quickSwap = (id: string) => {
    const st = activeRef.current;
    const it = st?.session.items[st.currentIndex];
    const nx = byId.get(id);
    if (!st || !it || !nx || nx.id === it.exerciseId) return;
    cancelCoachCall();
    setCoachCall(null); // alte Live-Ansage ist gegenstandslos
    recordCelebratedRef.current.delete(it.id); // neue Übung darf wieder feiern
    applyEdit(swapItem(st.session, it.id, nx));
    // Pausen-Dock re-ankern: Warmups der alten Übung fallen weg → Indizes
    // verschoben; sonst editiert der RIR-Regler des Docks den falschen Satz.
    setRest((r) => {
      if (!r || r.itemId !== it.id) return r;
      const sets = activeRef.current?.entries[it.id] ?? [];
      let idx = -1;
      for (let k = 0; k < sets.length; k++) {
        const s = sets[k];
        if (!s.warmup && s.reps !== "" && s.reps != null) idx = k;
      }
      return idx >= 0 ? { ...r, setIdx: idx } : null;
    });
    tap();
    toast(`Getauscht: ${nx.name}`);
  };

  /* ── Abschluss ── */

  /** ATLAS-Debrief streamen: ersetzt die deterministischen Zeilen im
   *  Sieger-Moment und wird nach Abschluss an die gespeicherte Einheit
   *  geschrieben (bleibt so für Verlauf + Cloud stabil). */
  const streamDebrief = async (state: ActiveSessionState, summary: SessionSummary) => {
    if (settings.coachLive === false) return;
    if (typeof navigator !== "undefined" && navigator.onLine === false) return;
    try {
      const facts = buildDebriefFacts({ state, allLib, summary });
      const res = await fetch("/api/atlas/debrief", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ facts, persona }),
      });
      if (res.headers.get("content-type")?.includes("application/json")) return;
      const reader = res.body?.getReader();
      if (!reader) return;
      const dec = new TextDecoder();
      let acc = "";
      const toLines = (s: string) =>
        s
          .split("\n")
          .map((l) => l.trim())
          .filter((l) => l && !l.startsWith("("))
          .slice(0, 3);
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += dec.decode(value, { stream: true });
        const lines = toLines(acc);
        if (lines.length) setComplete((c) => (c ? { ...c, debrief: lines } : c));
      }
      const lines = toLines(acc);
      if (lines.length >= 2) amendLastDebrief(lines);
    } catch {
      /* deterministisches Debrief bleibt stehen */
    }
  };

  const doSave = async (backTraffic: TrafficLight | null, note: string) => {
    const st = activeRef.current;
    if (!st) return;
    cancelCoachCall();
    setCoachCall(null);
    const final: ActiveSessionState = { ...st, backTraffic, note };
    // Figur für den Sieger-Moment VOR dem Save wählen (active ist danach weg):
    // die Hauptübung trägt das Poster der Studie ohne Maximum.
    const hauptEx = final.session.items[0]
      ? byId.get(final.session.items[0].exerciseId)
      : undefined;
    setCompleteFigur(hauptEx ? figurFor(hauptEx) : null);
    setCompleteRegion(hauptEx ? regionOf(hauptEx) : undefined);
    // Tafel des Maximums: bester rekordschlagender Arbeitssatz der Studie.
    // recordMap kennt nur das Archiv — die laufende Studie ist noch nicht im
    // Log, `best` ist also genau die Marke, die es zu schlagen galt. Bei
    // mehreren Maxima gewinnt der größte RELATIVE Sprung (kg-e1RM, Wdh und
    // Sekunden sind absolut nicht vergleichbar).
    let sieger: SiegerTafel | null = null;
    let siegerSprung = 0;
    const nummern = plattenNummern(log);
    for (const it of final.session.items) {
      const ex = byId.get(it.exerciseId);
      const best = recordMap.get(it.exerciseId);
      if (!ex || !best) continue;
      let wert = 0;
      let satz: SetEntry | null = null;
      for (const set of final.entries[it.id] ?? []) {
        if (!beatsRecord(ex, set, best)) continue;
        const m = setMetric(ex, set);
        if (m > wert) {
          wert = m;
          satz = set;
        }
      }
      if (wert <= 0) continue;
      const sprung = (wert - best.best) / best.best;
      if (sieger && sprung <= siegerSprung) continue;
      const prevSession = log.find((s) => s.date === best.date);
      sieger = {
        figur: figurFor(ex),
        region: regionOf(ex),
        exName: ex.name,
        wert,
        einheit: recordUnit(best.kind),
        kind: best.kind,
        satz: satz ? fmtSatz(satz.weight, satz.reps, ex.unit === "Sek") : undefined,
        delta: wert - best.best,
        prevPlattenNr: prevSession ? nummern.get(prevSession) : undefined,
      };
      siegerSprung = sprung;
    }
    setCompleteSieger(sieger);
    commit(final);
    const summary = await saveActiveSession(final);
    activeRef.current = null;
    setActive(null);
    if (summary) {
      setComplete(summary);
      void streamDebrief(final, summary);
    } else router.replace("/");
  };

  const doDiscard = () => {
    setExitOpen(false);
    discardActive();
    activeRef.current = null;
    setActive(null);
    router.replace("/");
  };

  /* ── Rendering ── */

  if (complete) {
    return (
      <SessionComplete
        summary={complete}
        name={todaySession?.name}
        figur={completeFigur ?? undefined}
        region={completeRegion}
        sieger={completeSieger ?? undefined}
        onDone={() => router.replace("/")}
      />
    );
  }
  // Redirect läuft bereits bei "none" — dort bleibt es leer (kein Zucken).
  if (boot === "none") return null;
  // Resume liest asynchronen Storage — hier ist die Wartezeit real, das
  // Gerüst pulsiert (Workout-Silhouette: Kopfzeile, Titel, Bühne, CTA).
  if (boot === "loading")
    return (
      <div aria-busy="true" className="mx-auto max-w-md px-5 pt-5">
        <div className="flex items-center justify-between">
          <Skeleton pulse className="h-8 w-24" />
          <Skeleton pulse className="h-8 w-8 rounded-pill" />
        </div>
        <Skeleton pulse className="mt-6 h-7 w-2/3" />
        <Skeleton pulse className="mt-4 h-64 w-full" />
        <Skeleton pulse className="mt-4 h-12 w-full" />
      </div>
    );

  if (boot === "gate") {
    return (
      <>
        <div className="pt-10 text-center">
          <p className="font-mono text-3xs font-bold text-muted">
            Gleich geht&apos;s los
          </p>
          <h1 className="mt-1 font-display font-bold text-2xl text-fg">
            {todaySession?.name ?? "Deine Einheit"}
          </h1>
        </div>
        <ReadinessGate
          open
          onClose={() => begin()}
          onSubmit={(r, spareBack) => {
            setReadiness(r);
            setBackSpareToday(spareBack);
            begin(r, spareBack);
          }}
        />
      </>
    );
  }

  const st = active;
  if (!st) return null;

  if (st.phase === "warmup") {
    const drills = warmupDrills;
    const toExercise = () => patch((s) => ({ ...s, phase: "exercise" }));
    return (
      <WarmupPlayer
        drills={drills}
        voiceOn={!!settings.voiceCues}
        onCountdown={onWarmupCountdown}
        onClose={toExercise}
        onFinished={() => {
          success();
          toExercise();
        }}
      />
    );
  }

  if (st.phase === "finish") {
    return (
      <FinishFlow
        state={st}
        allLib={allLib}
        saving={saving}
        onBack={() => patch((s) => ({ ...s, phase: "exercise" }))}
        onSave={(b, n) => void doSave(b, n)}
      />
    );
  }

  const items = st.session.items;
  const item = items[st.currentIndex];
  const baseEx = item ? byId.get(item.exerciseId) : undefined;
  if (!item || !baseEx) return null;
  const ex = itemExercise(baseEx, item);
  const sets = st.entries[item.id] ?? [];
  // Ohne Historie liefert die Startgewichts-Engine den Anker — presc macht
  // daraus Vorschlag, Platzhalter und Ein-Tap-Eintrag.
  const p = prescForItem(ex, prescCtx, curLp);
  const isExam = st.session.variant === "exam";

  // Live-Phasenband für den Kopf: belichtet sich Kader für Kader.
  const headerGruppen = bandOfActive(st.session, st.entries, byId, log);
  const openLeft = items.filter((it) => {
    const e = byId.get(it.exerciseId);
    return e ? !itemDone(e, st.entries[it.id]) : false;
  }).length;
  const remainMin = estimateRemainingMin(
    items
      .map((it) => {
        const e = byId.get(it.exerciseId);
        return e ? { ex: e, sets: st.entries[it.id] ?? [] } : null;
      })
      .filter((x): x is { ex: Exercise; sets: SetEntry[] } => x !== null),
  );
  const doneCount = doneWorkSets(st.entries);
  const restSet = rest ? st.entries[rest.itemId]?.[rest.setIdx] : undefined;
  const restItem = rest
    ? items.find((it) => it.id === rest.itemId)
    : undefined;
  const restEx = restItem ? byId.get(restItem.exerciseId) : undefined;

  const restMark = "var(--accent)";

  return (
    <DockSlotContext.Provider value={rest ? null : slotEl}>
    {/* Der Inhalt bekommt so viel Auslauf, wie das Dock GEMESSEN hoch ist —
        ein fester Abstand lag daneben, sobald das Dock wuchs (Bewertung,
        „Als Nächstes“), und verdeckte dann die Satzliste. */}
    <div
      data-testid="session-root"
      className="space-y-3"
      style={dockH > 0 ? { paddingBottom: dockH + 12 } : undefined}
      onFocus={(e) => {
        if (istFeld(e.target)) setTippt(true);
      }}
      onBlur={(e) => {
        if (istFeld(e.target)) setTippt(false);
      }}
    >
      <div ref={sentinelRef} aria-hidden className="-mb-3 h-px" />
      {/* Der Kopf haftet beim Scrollen: Full-bleed über -mx-5 (AppShell wrappt
          in px-5), z-20 unter dem Dock (30) und Sheets (50). */}
      <div
        className={cn(
          "sticky top-0 z-20 -mx-5 bg-surface-0 px-5 pb-2",
          condensed && "border-b border-line",
        )}
        style={{ paddingTop: "calc(env(safe-area-inset-top) + 0.5rem)" }}
      >
        <ProgressHeader
          gruppen={headerGruppen}
          currentIndex={st.currentIndex}
          remainMin={remainMin}
          onExit={() => setExitOpen(true)}
          onOverview={() => setOverviewOpen(true)}
        />
      </div>

      <SpotifyNowPlaying />

      <ExerciseStage
        key={item.id}
        ex={ex}
        item={item}
        sets={sets}
        presc={p}
        lastPerf={curLp}
        relatedPerf={curRel}
        nextExName={nextExName}
        record={recordMap.get(ex.id) ?? null}
        isExam={isExam}
        aidNote={exerciseNotes[ex.id]}
        weightStep={settings.weightStep ?? 2.5}
        zoetropOn={settings.zoetrope !== false}
        onOpenGuide={() => setGuideOpen(true)}
        onSwap={
          !isExam && ex.pattern !== "cardio" && stagePool.some((e) => e.id !== ex.id)
            ? () => setSwapOpen(true)
            : undefined
        }
        onPrev={goPrev}
        onNext={goNext}
        onWeight={(i, val) => setFieldEffort(item.id, i, "weight", val)}
        onReps={(i, oldVal, val) => onReps(item.id, i, oldVal, val)}
        onRir={(i, val) => setFieldEffort(item.id, i, "rir", val)}
        onIntensity={(i, val) => setFieldEffort(item.id, i, "intensity", val)}
        onCardioToggle={(done) => setField(item.id, 0, "reps", done ? "1" : "")}
      />

      <AtlasPanel
        ex={ex}
        item={item}
        sets={sets}
        presc={p}
        record={recordMap.get(ex.id) ?? null}
        readiness={scale}
        lastPerf={curLp}
        isExam={isExam}
        motivateOn={settings.coachMotivation !== false}
        voiceOn={!!settings.voiceCues}
        override={
          coachCall && coachCall.itemId === item.id
            ? {
                text: coachCall.say,
                actionLabel: coachCall.adjustment
                  ? coachCall.adjustment.kind === "weight"
                    ? `Auf ${String(coachCall.adjustment.value).replace(".", ",")} kg`
                    : rest
                      ? `+${coachCall.adjustment.value} s Pause`
                      : undefined
                  : undefined,
                onApply: applyCoach,
              }
            : null
        }
      />

      {/* Was danach kommt — gestrichelt, nur Info; „Weiter“ springt dorthin. */}
      {nextExName && (
        <p className="flex min-h-11 items-center gap-2 rounded-inner border-dick border-dashed border-rand px-3.5 py-2 text-sm text-muted">
          <span className="shrink-0">Danach</span>
          <span className="min-w-0 truncate font-display text-base font-extrabold text-fg">
            {nextExName}
          </span>
        </p>
      )}

      <div className="flex items-center gap-2 pt-1">
        <Button
          variant="secondary"
          onClick={goPrev}
          disabled={st.currentIndex === 0}
          aria-label="Vorherige Übung"
          className="shrink-0 px-4"
        >
          <ChevronLeft size={20} aria-hidden />
        </Button>
        <Button variant="secondary" onClick={goNext} className="flex-1">
          {openLeft === 0 ? (
            <>
              <Flag size={18} aria-hidden /> Zum Abschluss
            </>
          ) : (
            <>
              Weiter <ChevronRight size={18} strokeWidth={2.5} aria-hidden />
            </>
          )}
        </Button>
      </div>

      {/* Das Dock: EIN Wirt unten — Pause ODER „Satz eintragen“ (kommt
          per Portal aus der Satzkarte). Beim Tippen in ein Feld unsichtbar:
          die iOS-Tastatur schiebt feste Elemente sonst mitten ins Bild. */}
      <div ref={dockRef} className={cn("fixed inset-x-0 bottom-0 z-30", tippt && "invisible")}>
        {rest ? (
          <RestPanel
            left={rest.left}
            total={rest.total}
            set={restSet}
            timed={restEx?.unit === "Sek"}
            setNo={restSet ? workSetNo(st.entries[rest.itemId] ?? [], rest.setIdx) : 0}
            next={restNext}
            markVar={restMark}
            onRir={(v) => rest && setFieldEffort(rest.itemId, rest.setIdx, "rir", v)}
            onIntensity={(v) =>
              rest && setFieldEffort(rest.itemId, rest.setIdx, "intensity", v)
            }
            onAdd={() =>
              setRest((r) => (r ? { ...r, left: r.left + 15, total: r.total + 15 } : r))
            }
            onSub={() =>
              setRest((r) =>
                r
                  ? { ...r, left: Math.max(0, r.left - 15), total: Math.max(15, r.total - 15) }
                  : r,
              )
            }
            onSkip={() => setRest(null)}
          />
        ) : (
          <div
            ref={setSlotEl}
            className="border-t border-line bg-surface-0 px-5 pt-3 empty:hidden"
            style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 0.75rem)" }}
          />
        )}
      </div>

      <OverviewSheet
        open={overviewOpen}
        onClose={() => setOverviewOpen(false)}
        session={st.session}
        allLib={allLib}
        entries={st.entries}
        currentIndex={st.currentIndex}
        onJump={(i) => patch((s) => ({ ...s, currentIndex: i }))}
        onEdit={() => setEditOpen(true)}
      />

      <SessionEditSheet
        open={editOpen}
        onClose={() => setEditOpen(false)}
        session={st.session}
        allLib={allLib}
        has={has}
        onChange={applyEdit}
      />

      {/* Schnell-Tausch aus der Bühne — gleicher Picker wie im Edit-Sheet. */}
      <ExercisePicker
        open={swapOpen}
        onClose={() => setSwapOpen(false)}
        pool={stagePool}
        currentId={item.exerciseId}
        onPick={quickSwap}
      />

      <GuideSheet open={guideOpen} onClose={() => setGuideOpen(false)} ex={ex} />

      <Sheet open={exitOpen} onClose={() => setExitOpen(false)} title="Training beenden?">
        {doneCount > 0 ? (
          <>
            <p className="mb-4 text-sm text-muted">
              Du hast {doneCount} {doneCount === 1 ? "Satz" : "Sätze"} erledigt.
              Beenden speichert diese — der Rest wird verworfen.
            </p>
            <div className="flex flex-col gap-2">
              <Button
                variant="strong"
                full
                onClick={() => {
                  setExitOpen(false);
                  patch((s) => ({ ...s, phase: "finish" }));
                }}
              >
                Zum Abschluss
              </Button>
              <Button variant="secondary" full onClick={() => setExitOpen(false)}>
                Weiter trainieren
              </Button>
              <Button variant="danger" full onClick={doDiscard}>
                Ohne Speichern verwerfen
              </Button>
            </div>
          </>
        ) : (
          <>
            <p className="mb-4 text-sm text-muted">
              Noch kein Satz erledigt. Training wirklich verlassen? Es wird
              nichts gespeichert.
            </p>
            <div className="flex flex-col gap-2">
              <Button variant="strong" full onClick={doDiscard}>
                Training verlassen
              </Button>
              <Button variant="secondary" full onClick={() => setExitOpen(false)}>
                Weiter trainieren
              </Button>
            </div>
          </>
        )}
      </Sheet>
    </div>
    </DockSlotContext.Provider>
  );
}
