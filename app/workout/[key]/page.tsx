"use client";

import { AnimatePresence, motion, useAnimationControls, useReducedMotion } from "framer-motion";
import {
  ArrowLeft,
  Bike,
  Camera,
  Check,
  ChevronRight,
  Flame,
  Layers,
  Mic,
  Repeat,
  Save,
  X,
} from "lucide-react";
import dynamic from "next/dynamic";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import type { FormResult } from "@/components/form-check/CameraView";

// Camera + pose UI is only needed once the user opens a check — keep it out of
// the workout route's first-load bundle.
const CameraView = dynamic(
  () => import("@/components/form-check/CameraView").then((m) => m.CameraView),
  { ssr: false },
);
import { ExercisePicker } from "@/components/workout/ExercisePicker";
import { GuideSheet } from "@/components/workout/GuideSheet";
import { LiveDemo } from "@/components/workout/LiveDemo";
import { PhaseRail } from "@/components/workout/PhaseRail";
import { ReadinessGate } from "@/components/workout/ReadinessGate";
import { useWakeLock } from "@/components/workout/useWakeLock";
import { primeAudio } from "@/lib/beep";
import { RestTimer } from "@/components/workout/RestTimer";
import { SessionComplete } from "@/components/workout/SessionComplete";
import { AtlasLiveLine } from "@/components/trainer/AtlasLiveLine";
import { MotivationLine } from "@/components/trainer/MotivationLine";
import { SpotifyNowPlaying } from "@/components/spotify/SpotifyNowPlaying";
import { FlipbookBoot } from "@/components/layout/FlipbookBoot";
import { SessionTimeBar } from "@/components/workout/SessionTimeBar";
import { SetRow } from "@/components/workout/SetRow";
import { ShadowRace } from "@/components/workout/ShadowRace";
import { Chip } from "@/components/ui/Chip";
import { Pressable } from "@/components/ui/pressable";
import { Sheet } from "@/components/ui/sheet";
import { useTraining, type SessionSummary } from "@/components/providers/TrainingProvider";
import { exerciseAffinity } from "@/lib/affinity";
import { effectiveProfile } from "@/lib/athlete";
import { exerciseChips } from "@/lib/coaching";
import { PATTERN_LABEL } from "@/lib/exercises";
import { success, tap } from "@/lib/haptics";
import { beatsRecord, exerciseRecords } from "@/lib/records";
import { bestAlternativeForPattern, presc } from "@/lib/progression";
import { estimateRemainingMin, estimateSessionMin, supersetPair, TIME } from "@/lib/session-time";
import { liveLine, motivationLine } from "@/lib/trainer";
import { recommendedSets } from "@/lib/set-plan";
import { isFilled } from "@/lib/stats";
import { SPRING } from "@/lib/motion";
import { configForPattern } from "@/lib/pose/exercise-pose-config";
import { isPoseSupported } from "@/lib/pose/landmarker";
import { warmupFor, warmupTotalMin } from "@/lib/warmup";
import {
  createRecognizer,
  isVoiceInputSupported,
  parseSetSpeech,
  speak,
  type ParsedSet,
} from "@/lib/voice";
import { cn } from "@/lib/utils";
import type { Exercise, Pattern, TrafficLight } from "@/lib/types";

// Satzpause: EINE Quelle — TIME.restSec speist Live-Timer UND Zeitschätzung.

// Selected state as a tinted outline chip — token-pure and readable on both
// themes (the old filled raw-palette chips broke contrast in light mode).
const BACK_OPTIONS: { v: TrafficLight; label: string; on: string }[] = [
  { v: "green", label: "Gut", on: "border-status-in text-status-in bg-surface-2" },
  { v: "yellow", label: "Mittel", on: "border-status-over text-status-over bg-surface-2" },
  { v: "red", label: "Gereizt", on: "border-status-danger text-status-danger bg-surface-2" },
];

/** Per-exercise completion ring (done work-sets / planned). The arc springs to
 *  its new fill and the whole ring pops each time a set is completed — the
 *  set-level micro-moment. Static under reduced motion. */
function ProgressRing({ done, total }: { done: number; total: number }) {
  const reduce = useReducedMotion();
  const controls = useAnimationControls();
  const prev = useRef(done);
  const r = 9;
  const circ = 2 * Math.PI * r;
  const pct = total > 0 ? Math.min(1, done / total) : 0;
  useEffect(() => {
    if (done > prev.current && !reduce) {
      controls.start({ scale: [1, 1.22, 1], transition: { duration: 0.4, ease: "easeOut" } });
    }
    prev.current = done;
  }, [done, reduce, controls]);
  return (
    <motion.svg
      viewBox="0 0 24 24"
      className="h-6 w-6"
      aria-hidden
      animate={controls}
      style={{ transformOrigin: "center" }}
    >
      <g transform="rotate(-90 12 12)">
        <circle cx="12" cy="12" r={r} fill="none" stroke="var(--surface-2)" strokeWidth="3" />
        <motion.circle
          cx="12"
          cy="12"
          r={r}
          fill="none"
          stroke="var(--accent-ink)"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={circ}
          initial={false}
          animate={{ strokeDashoffset: circ * (1 - pct) }}
          transition={reduce ? { duration: 0 } : SPRING.pop}
        />
      </g>
    </motion.svg>
  );
}

export default function WorkoutPage() {
  const params = useParams();
  const key = Array.isArray(params.key) ? params.key[0] : params.key;
  const router = useRouter();
  const {
    activeKey,
    sessionTemplate,
    entries,
    startSession,
    setEntry,
    swapExercise,
    saveSession,
    discardSession,
    saving,
    activeList,
    settings,
    todayReadiness,
    warmupDone,
    setWarmupDone,
    readinessScale,
    muscleVolumes,
    lastPerf,
    backTraffic,
    setBackTraffic,
    note,
    setNote,
    log,
    daysAgo,
    cardioAdvice,
    has,
    choices,
    allLib,
    body,
    lastBackRed,
  } = useTraining();
  const lighter = daysAgo != null && daysAgo > 5;
  const say = (text: string) => {
    if (settings.voiceCues) speak(text);
  };
  const affinity = useMemo(() => exerciseAffinity(choices, log), [choices, log]);
  const injuries = effectiveProfile(settings, body).injuries ?? [];
  const swapSeed = useRef(0);
  const reduce = useReducedMotion();

  const [guideSlot, setGuideSlot] = useState<string | null>(null);
  const [pickSlot, setPickSlot] = useState<string | null>(null);
  const [swapNote, setSwapNote] = useState<
    { slotKey: string; fromId: string; fromName: string; toName: string } | null
  >(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [complete, setComplete] = useState<SessionSummary | null>(null);
  const [gateOpen, setGateOpen] = useState(false);
  const [restLeft, setRestLeft] = useState(0);
  const [restOn, setRestOn] = useState(false);
  /** Der zuletzt abgehakte Satz — die Pause trägt seine RIR-/Int-Chips. */
  const [lastCommitted, setLastCommitted] = useState<{ exId: string; i: number } | null>(
    null,
  );
  const [listening, setListening] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [poseSupported, setPoseSupported] = useState(false);
  const [camFor, setCamFor] = useState<{ exId: string; i: number; pattern: Pattern; name: string; ghost?: string } | null>(null);
  const announcedRef = useRef<Set<string>>(new Set());
  // Aktuelle entries für Effekte, die nicht pro Tastendruck neu laufen dürfen.
  const entriesRef = useRef(entries);
  entriesRef.current = entries;

  useEffect(() => {
    // A just-saved session clears activeKey — we're on the win screen now, so
    // don't treat the null as "fresh arrival" and restart / reopen the gate.
    if (complete) return;
    if (key && activeKey !== key) {
      if (settings.autoregOn && !todayReadiness) setGateOpen(true);
      else startSession(key);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, activeKey, complete]);

  // Display wach halten, solange die Einheit läuft (abschaltbar in den
  // Einstellungen) — im Gym liegt das Handy, der Sperrbildschirm nervt.
  useWakeLock(settings.keepAwake !== false && activeKey === key && !complete);

  // Probe device support after mount so SSR and first client render agree.
  useEffect(() => setVoiceSupported(isVoiceInputSupported()), []);
  useEffect(() => setPoseSupported(isPoseSupported()), []);

  useEffect(() => {
    if (!restOn) return;
    if (restLeft <= 0) {
      if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(200);
      if (settings.voiceCues) speak("Pause vorbei. Auf geht's.", { interrupt: true });
      // Fallback fürs Auto-Advance: Wer die Pause aussitzt (Keyboard offen,
      // kein Blur), rückt spätestens jetzt zum nächsten offenen Satz vor.
      setEditKey((k) => {
        if (!k) return k;
        const [exId, iStr] = k.split(":");
        const s = entriesRef.current[exId]?.[Number(iStr)];
        return s && s.reps !== "" && s.reps != null ? null : k;
      });
      // Keep the card mounted for a beat so the ring's 0-snap (pop + flash) is
      // actually visible before it slides away. A new set mid-linger resets
      // restLeft and the cleanup cancels the hide.
      const id = setTimeout(() => setRestOn(false), 700);
      return () => clearTimeout(id);
    }
    if (settings.voiceCues) {
      if (restLeft === 10) speak("Noch zehn Sekunden");
      else if (restLeft <= 3) speak(["", "eins", "zwei", "drei"][restLeft]);
    }
    const id = setTimeout(() => setRestLeft((x) => x - 1), 1000);
    return () => clearTimeout(id);
  }, [restOn, restLeft, settings.voiceCues]);

  // Celebrate a new record once per exercise: a haptic buzz always, plus a
  // hands-free voice cue when voice is on. Fires the moment a logged set beats
  // the all-time best (detected by exerciseChips' "Neuer Rekord" card).
  useEffect(() => {
    if (activeKey !== key) return;
    activeList.forEach(({ ex }) => {
      const p = presc(ex, lastPerf(ex.id), {
        lighter,
        loadMult: readinessScale.loadMult,
        cap: readinessScale.cap,
      });
      const chips = exerciseChips({
        ex,
        prescription: p,
        log,
        currentSets: entries[ex.id] || [],
      });
      if (
        chips.some((c) => c.text.startsWith("Neuer Rekord")) &&
        !announcedRef.current.has(ex.id)
      ) {
        announcedRef.current.add(ex.id);
        success();
        if (settings.voiceCues) speak("Neuer Rekord! Stark.");
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entries, settings.voiceCues]);

  // Sticky live-demo follows the exercise card currently in view.
  const [activeSlot, setActiveSlot] = useState<string | null>(null);
  // Focus-logbook: the manually-opened set ("exId:index"); else the first empty
  // working set (activeSetIdx) is the active one.
  const [editKey, setEditKey] = useState<string | null>(null);
  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const warmupRef = useRef<HTMLDivElement>(null);
  const ratios = useRef<Record<string, number>>({});
  const slotKeys = activeList.map((s) => s.slotKey).join(",");
  useEffect(() => {
    const els = [...cardRefs.current.values()];
    if (!els.length) return;
    const obs = new IntersectionObserver(
      (ents) => {
        for (const e of ents) {
          const slot = (e.target as HTMLElement).dataset.slot;
          if (slot) ratios.current[slot] = e.isIntersecting ? e.intersectionRatio : 0;
        }
        let best: string | null = null;
        let bestR = 0;
        for (const [slot, r] of Object.entries(ratios.current)) {
          if (r > bestR) {
            bestR = r;
            best = slot;
          }
        }
        if (best) setActiveSlot(best);
      },
      { threshold: [0.15, 0.4, 0.7, 1] },
    );
    els.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, [slotKeys, activeKey]);

  const startRest = () => {
    setRestLeft(TIME.restSec);
    setRestOn(true);
  };
  const onReps = (exId: string, i: number, oldVal: string, val: string) => {
    setEntry(exId, i, "reps", val);
    if ((oldVal === "" || oldVal == null) && val !== "" && val != null) {
      // Den eben beendeten Satz merken — die Pause trägt seine RIR-Chips.
      setLastCommitted({ exId, i });
      startRest();
    }
  };

  // Camera hand-off: counted reps fill the set (via onReps → starts the rest timer
  // like manual entry); the ghost/last weight prefills an empty weight cell. The
  // form grade is shown via voice but not persisted (SetEntry stays unchanged).
  const applyFormResult = (r: FormResult) => {
    if (!camFor) return;
    const { exId, i, ghost } = camFor;
    const cur = entries[exId]?.[i];
    if (r.reps > 0) onReps(exId, i, cur?.reps ?? "", String(r.reps));
    if (ghost && (cur?.weight === "" || cur?.weight == null)) setEntry(exId, i, "weight", ghost);
    // Kamera-VBT: gemessenes RIR vorbefüllen (in der Pause übersteuerbar).
    if (r.reps > 0 && r.estRir != null) setEntry(exId, i, "rir", r.estRir);
    setCamFor(null);
    if (r.reps > 0) {
      const vel =
        r.estRir != null && r.velLossPct != null
          ? ` Tempoverlust ${r.velLossPct} Prozent — etwa ${r.estRir} im Tank.`
          : "";
      say(
        `${r.reps} ${r.reps === 1 ? "Wiederholung" : "Wiederholungen"} übernommen.${vel}`,
      );
      if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate([40, 40, 60]);
    }
  };

  const tpl = sessionTemplate(key ?? "");
  const list = activeList;
  const ssPair = settings.superset ? supersetPair(list) : null;
  // All-time best per exercise (the in-progress session isn't in `log` yet, so
  // this is the mark to beat for the Live-Rekordjagd).
  const recordMap = useMemo(
    () => new Map(exerciseRecords(log).map((r) => [r.exId, r] as const)),
    [log],
  );

  // Only filled WORKING sets count as "done" — warmups arrive pre-filled
  // (reps "5"), so counting them claimed sets on an untouched workout.
  const doneCount = Object.values(entries)
    .flat()
    .filter((s) => !s.warmup && isFilled(s)).length;

  // ── Flow 2.0: die aktive Karte, Auto-Scroll & der Übungs-Abschluss.
  //    (Hooks — MÜSSEN vor den Early-Returns unten stehen.) ──
  const hasOpenSet = (exId: string) =>
    (entries[exId] || []).some((s) => !s.warmup && (s.reps === "" || s.reps == null));
  // Karte mit dem gepinnten Satz gewinnt, sonst die erste mit offenem Arbeitssatz.
  const editExId = editKey ? editKey.split(":")[0] : null;
  const activeCardSlot =
    (editExId ? list.find((s) => s.ex.id === editExId)?.slotKey : undefined) ??
    list.find(({ ex }) => ex.pattern !== "cardio" && hasOpenSet(ex.id))?.slotKey ??
    null;

  const scrollToSlot = (slot: string) => {
    cardRefs.current
      .get(slot)
      ?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" });
  };

  // Fokus-Akkordeon: höchstens EINE manuell aufgeklappte (nicht-aktive) Karte;
  // wandert der aktive Fokus, klappt der manuelle Blick wieder zu.
  const [viewSlot, setViewSlot] = useState<string | null>(null);
  useEffect(() => {
    setViewSlot(null);
  }, [activeCardSlot]);

  // Nach jedem erledigten Satz zur nächsten offenen Karte gleiten — aber erst,
  // wenn der Fokus-Pin gelöst ist (beim Tippen wächst doneCount VOR dem Blur).
  // Das Pending-Flag überbrückt die Lücke; 350 ms entkoppeln vom iOS-Keyboard-
  // Einfahren und vom RestTimer-Slide-in.
  const prevDoneRef = useRef(doneCount);
  const pendingScrollRef = useRef(false);
  useEffect(() => {
    if (doneCount > prevDoneRef.current) pendingScrollRef.current = true;
    prevDoneRef.current = doneCount;
    if (!pendingScrollRef.current || editKey != null) return;
    pendingScrollRef.current = false;
    const next = list.find(({ ex }) => ex.pattern !== "cardio" && hasOpenSet(ex.id));
    if (!next) return;
    const id = window.setTimeout(() => scrollToSlot(next.slotKey), 350);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doneCount, editKey]);

  // Übungs-Abschluss-Moment: kurzer Akzent-Flash + Haptik, wenn eine Übung
  // alle Arbeitssätze voll hat (Übergangs-Erkennung je Slot).
  const [flashSlot, setFlashSlot] = useState<string | null>(null);
  const exCompleteRef = useRef<Map<string, boolean>>(new Map());
  useEffect(() => {
    for (const { ex, slotKey } of list) {
      if (ex.pattern === "cardio") continue;
      const work = (entries[ex.id] || []).filter((s) => !s.warmup);
      const complete = work.length > 0 && work.every((s) => isFilled(s));
      const was = exCompleteRef.current.get(slotKey) ?? false;
      exCompleteRef.current.set(slotKey, complete);
      if (complete && !was && doneCount > 0) {
        success();
        setFlashSlot(slotKey);
        const id = window.setTimeout(() => setFlashSlot(null), 1000);
        return () => window.clearTimeout(id);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entries, list]);

  // ATLAS spricht Live-Reaktionen (nur Rekordjagd/RIR — die Rekord-Feier
  // spricht bereits), einmal je Satz-Stand.
  const spokenRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!settings.voiceCues || !activeCardSlot) return;
    const slot = list.find((s) => s.slotKey === activeCardSlot);
    if (!slot || slot.ex.pattern === "cardio") return;
    const p = presc(slot.ex, lastPerf(slot.ex.id), {
      lighter,
      loadMult: readinessScale.loadMult,
      cap: readinessScale.cap,
    });
    const line = liveLine({
      ex: slot.ex,
      sets: entries[slot.ex.id] || [],
      presc: p,
      record: recordMap.get(slot.ex.id) ?? null,
      readiness: readinessScale,
      lastPerf: lastPerf(slot.ex.id),
    });
    if (!line || (line.kind !== "chase" && line.kind !== "rir" && line.kind !== "shadow"))
      return;
    const done = (entries[slot.ex.id] || []).filter((s) => !s.warmup && isFilled(s)).length;
    const speakKey = `${slot.ex.id}:${done}:${line.text}`;
    if (spokenRef.current.has(speakKey)) return;
    spokenRef.current.add(speakKey);
    say(line.text);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entries, activeCardSlot, settings.voiceCues]);

  const remainMin = estimateRemainingMin(list, entries);

  // Fill the first still-open working set from a spoken set entry.
  const fillFromSpeech = (parsed: ParsedSet) => {
    for (const { ex } of list) {
      const arr = entries[ex.id] || [];
      const i = arr.findIndex((s) => !s.warmup && (s.reps === "" || s.reps == null));
      if (i < 0) continue;
      if (parsed.weight != null && ex.weighted)
        setEntry(ex.id, i, "weight", String(parsed.weight));
      if (parsed.reps != null) setEntry(ex.id, i, "reps", String(parsed.reps));
      if (parsed.rir != null) setEntry(ex.id, i, "rir", parsed.rir);
      if (parsed.reps != null) {
        setRestLeft(TIME.restSec);
        setRestOn(true);
      }
      if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(60);
      say(
        `${ex.name}: ${parsed.reps ?? "?"} Wiederholungen` +
          (parsed.weight != null ? `, ${parsed.weight} Kilo.` : "."),
      );
      return;
    }
    say("Alle Sätze sind schon ausgefüllt.");
  };

  const startVoiceLog = () => {
    if (listening) return;
    const rec = createRecognizer({
      onResult: (t) => fillFromSpeech(parseSetSpeech(t)),
      onEnd: () => setListening(false),
      onError: () => setListening(false),
    });
    if (!rec) return;
    setListening(true);
    rec.start();
  };

  if (!tpl) {
    return (
      <div>
        <p className="text-muted">Einheit nicht gefunden.</p>
        <Pressable
          onClick={() => router.push("/")}
          className="mt-3 flex items-center gap-1 text-sm text-accent-ink focus:outline-none"
        >
          <ArrowLeft size={16} /> Zur Startseite
        </Pressable>
      </div>
    );
  }

  // Saving clears activeKey; show the "Sieger-Moment" takeover instead of
  // falling through to the "prepare…" gate (this guard must precede it).
  if (complete) {
    return <SessionComplete summary={complete} onDone={() => router.push("/")} />;
  }

  if (activeKey !== key) {
    return (
      <>
        <div className="py-6">
          {/* Kurzfassung des Boot-Daumenkinos — füllt die Vorbereitungs-Wartezeit. */}
          <FlipbookBoot compact />
          <p className="mt-3 text-center font-mono text-sm text-faint">bereite vor…</p>
        </div>
        <ReadinessGate
          open={gateOpen}
          onClose={() => {
            setGateOpen(false);
            if (key) startSession(key);
          }}
          onSubmit={(r) => {
            setGateOpen(false);
            if (key) startSession(key, r);
          }}
        />
      </>
    );
  }

  const done = list.filter(({ ex }) =>
    (entries[ex.id] || []).some((s) => !s.warmup && s.reps !== "" && s.reps != null),
  ).length;
  const total = list.length || 1;

  // ── Geführter Ablauf: Phasen-Zustand je Slot (Kraft: alle Arbeitssätze voll;
  //    Cardio: Erledigt-Toggle) → Rail, Fokus-Akkordeon und Abschluss-Zug. ──
  const slotIsDone = ({ ex }: { ex: Exercise }) => {
    if (ex.pattern === "cardio") {
      const cur = (entries[ex.id] || [])[0];
      return !!cur && cur.reps !== "" && cur.reps != null;
    }
    const work = (entries[ex.id] || []).filter((s) => !s.warmup);
    return work.length > 0 && work.every((s) => isFilled(s));
  };
  const allDone = list.length > 0 && list.every(slotIsDone);
  // Reine Cardio-Tage haben keinen Satz-Fokus — dort bleibt jede Karte voll.
  const hasStrength = list.some((s) => s.ex.pattern !== "cardio");
  const railItems = list.map((s) => ({
    slotKey: s.slotKey,
    name: s.ex.name,
    state:
      s.slotKey === activeCardSlot
        ? ("active" as const)
        : slotIsDone(s)
          ? ("done" as const)
          : ("open" as const),
  }));
  const ssSlots = ssPair ? [list[ssPair[0]]?.slotKey, list[ssPair[1]]?.slotKey] : [];
  const wuDrills = warmupFor(tpl, { bike: settings.bikeWarmup });
  const wuMin = warmupTotalMin(wuDrills);

  const guideEx = list.find((s) => s.slotKey === guideSlot)?.ex ?? null;
  // Change an exercise mid-session → drop in the ideal same-pattern alternative
  // (equipment-, preference- and injury-aware), with browse/undo. Cardio or no
  // alternative falls back to the full picker.
  const suggestSwap = (ex: Exercise, slotKey: string) => {
    tap();
    const alt =
      ex.pattern === "cardio"
        ? null
        : bestAlternativeForPattern(ex.pattern, has, allLib, {
            excludeIds: activeList.map((s) => s.ex.id), // current + others → differs, no dup
            affinity,
            backSafe: lastBackRed,
            injuries,
            seed: swapSeed.current++,
          });
    if (!alt) {
      setSwapNote(null);
      setPickSlot(slotKey);
      return;
    }
    swapExercise(slotKey, alt.id);
    setSwapNote({ slotKey, fromId: ex.id, fromName: ex.name, toName: alt.name });
  };

  const pickItem = list.find((s) => s.slotKey === pickSlot) ?? null;

  const onSave = async () => {
    setConfirmOpen(false);
    // The summary feeds the "Sieger-Moment" takeover; null (nothing real
    // performed) falls back to the old direct exit.
    const s = await saveSession();
    if (s) setComplete(s);
    else router.push("/");
  };
  const onDiscard = () => {
    setConfirmOpen(false);
    discardSession();
    router.push("/");
  };

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <Pressable
          onClick={() => setConfirmOpen(true)}
          className="flex items-center gap-1 rounded-card px-1 py-1 text-sm text-muted focus:outline-none"
        >
          <ArrowLeft size={18} /> Zurück
        </Pressable>
        <div className="flex items-center gap-3">
          {voiceSupported && (
            <Pressable
              onClick={startVoiceLog}
              aria-label="Satz per Sprache eintragen"
              className={cn(
                "flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium focus:outline-none",
                listening
                  ? "bg-accent-sessions text-on-accent"
                  : "bg-surface-2 text-muted",
              )}
            >
              <Mic size={14} /> {listening ? "Hört zu…" : "Sprechen"}
            </Pressable>
          )}
          {/* Session work-set tally — pops +1 on each filled set (bridge to the
              Set-Collector). Distinct from "N/M erledigt" (exercises done). */}
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span
              key={doneCount}
              initial={reduce ? false : { scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={reduce ? { opacity: 0 } : { scale: 0.5, opacity: 0 }}
              transition={SPRING.pop}
              className="flex items-center gap-1 rounded-pill bg-surface-2 px-2 py-1 font-mono text-xs tabular-nums text-accent-ink"
            >
              <Layers size={12} /> {doneCount}
            </motion.span>
          </AnimatePresence>
          <span className="font-mono text-xs tabular-nums text-muted">
            {done}/{list.length} erledigt
          </span>
        </div>
      </div>

      <h2 className="font-display text-2xl font-semibold tracking-tight">{tpl.name}</h2>
      <p className="mb-1 text-sm text-muted">{tpl.focus}</p>
      <div className="mb-5 h-1 w-full overflow-hidden rounded-full bg-surface-2">
        <div
          className="h-full rounded-full bg-accent-sessions transition-all"
          style={{ width: `${(done / total) * 100}%`, boxShadow: "0 0 10px -1px var(--accent)" }}
        />
      </div>

      <SessionTimeBar
        estMin={estimateSessionMin(list, { superset: settings.superset })}
        budgetMin={settings.timeBudgetMin}
      />

      {/* Der Ablauf auf einen Blick: 🔥 → 01…NN → ⚑. Tap springt zur Phase. */}
      <PhaseRail
        warmupDone={warmupDone}
        items={railItems}
        allDone={allDone}
        onWarmup={() =>
          warmupRef.current?.scrollIntoView({
            behavior: reduce ? "auto" : "smooth",
            block: "center",
          })
        }
        onItem={scrollToSlot}
      />

      {/* Phase · Aufwärmen — eine echte Phase mit Abschluss statt nur ein Link. */}
      <div
        ref={warmupRef}
        className={cn(
          "mb-4 mt-3 rounded-card border border-surface-3 bg-surface-1 shadow-card",
          warmupDone ? "px-4 py-3 opacity-80" : "p-4",
        )}
      >
        {warmupDone ? (
          <div className="flex items-center gap-2">
            <Check size={14} className="shrink-0 text-status-in" aria-hidden />
            <span className="min-w-0 flex-1 truncate text-sm font-medium text-fg">
              Aufgewärmt · {wuMin} Min
            </span>
            <Pressable
              onClick={() => {
                primeAudio();
                router.push(`/warmup/${key}`);
              }}
              className="shrink-0 rounded-pill bg-surface-2 px-3 py-1.5 text-xs font-medium text-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-sessions"
            >
              Nochmal
            </Pressable>
          </div>
        ) : (
          <>
            <p className="font-mono text-xs uppercase tracking-widest text-accent-2">
              Phase · Aufwärmen
            </p>
            <p className="mt-1.5 truncate text-xs text-muted">
              {wuDrills.map((d) => d.name).join(" · ")}
            </p>
            <p className="mt-0.5 font-mono text-xs text-faint">
              {wuDrills.length} Drills · ~{wuMin} Min
            </p>
            <div className="mt-3 flex gap-2">
              <Pressable
                onClick={() => {
                primeAudio();
                router.push(`/warmup/${key}`);
              }}
                className="flex flex-1 items-center justify-center gap-2 rounded-card bg-accent-sessions py-2.5 text-sm font-semibold text-on-accent focus:outline-none"
              >
                <Flame size={15} /> Aufwärmen starten
              </Pressable>
              <Pressable
                onClick={() => {
                  setWarmupDone(true);
                  success();
                }}
                className="shrink-0 rounded-card bg-surface-2 px-4 py-2.5 text-sm font-medium text-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-sessions"
              >
                Abschließen
              </Pressable>
            </div>
          </>
        )}
      </div>

      <SpotifyNowPlaying />

      {cardioAdvice.level !== "none" && (
        <div className="mb-4 rounded-card border border-surface-3 bg-surface-1 shadow-card p-4">
          <div className="flex items-start gap-3">
            <Bike size={18} className="mt-0.5 shrink-0 text-accent-coverage" />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-fg">{cardioAdvice.title}</p>
              <p className="mt-0.5 text-xs leading-relaxed text-muted">
                {cardioAdvice.body}
              </p>
              <p className="mt-1 font-mono text-xs uppercase tracking-widest text-faint">
                Empfehlung · du entscheidest
              </p>
            </div>
          </div>
        </div>
      )}

      {list.length > 0 && (
        <LiveDemo
          ex={list.find((s) => s.slotKey === activeSlot)?.ex ?? list[0]?.ex ?? null}
          onOpen={() => setGuideSlot(activeSlot ?? list[0]?.slotKey ?? null)}
          hud={{ done, total: list.length, remainMin }}
        />
      )}

      <div className="space-y-3">
        {list.map(({ ex, slotKey, pool }, idx) => {
          const isSuperset = !!ssPair && (idx === ssPair[0] || idx === ssPair[1]);
          const lp = lastPerf(ex.id);
          const p = presc(ex, lp, {
            lighter,
            loadMult: readinessScale.loadMult,
            cap: readinessScale.cap,
            step: settings.weightStep,
          });
          const chips = exerciseChips({
            ex,
            prescription: p,
            log,
            currentSets: entries[ex.id] || [],
          });
          // Advisory only on neutral days — applyReadiness already bumps sets
          // on good days (the hint used to stack a second +1 on top).
          const recSets =
            ex.pattern === "cardio" || readinessScale.setDelta !== 0
              ? ex.sets
              : recommendedSets(ex, { muscleVolumes, lowReadiness: false });
          const ps = lp
            ? lp.sets
                .filter((s) => !s.warmup)
                .map((s) =>
                  ex.unit === "Sek"
                    ? `${s.reps}s`
                    : s.weight !== "" && s.weight != null
                      ? `${s.weight}×${s.reps}`
                      : `${s.reps}`,
                )
                .join("   ")
            : null;
          const exDone = (entries[ex.id] || []).filter(
            (s) => !s.warmup && s.reps !== "" && s.reps != null,
          ).length;
          const activeSetIdx = (entries[ex.id] || []).findIndex(
            (s) => !s.warmup && (s.reps === "" || s.reps == null),
          );
          const work = (entries[ex.id] || []).filter((s) => !s.warmup);
          const exComplete =
            ex.pattern !== "cardio" && work.length > 0 && work.every((s) => isFilled(s));
          const isActiveCard = slotKey === activeCardSlot;
          const nextOpen = exComplete
            ? list.find(({ ex: e }) => e.pattern !== "cardio" && hasOpenSet(e.id))
            : undefined;
          const cardLine =
            isActiveCard && ex.pattern !== "cardio" && key !== "exam"
              ? liveLine({
                  ex,
                  sets: entries[ex.id] || [],
                  presc: p,
                  record: recordMap.get(ex.id) ?? null,
                  readiness: readinessScale,
                  lastPerf: lp,
                })
              : null;
          // Coach-Motivation (an/aus): eigene, leise Ansporn-Zeile — nur Text,
          // stört die Musik nie. Weicht bei den großen Momenten (Rekord/Schatten)
          // zurück, damit die taktische Zeile allein steht. Default an.
          const cardMotivation =
            settings.coachMotivation !== false &&
            isActiveCard &&
            ex.pattern !== "cardio" &&
            !(cardLine && (cardLine.kind === "record" || cardLine.kind === "shadow"))
              ? motivationLine({ ex, sets: entries[ex.id] || [] })
              : null;
          // Fokus-Akkordeon: erledigt → Ergebnis-Zeile, offen → Ghost-Vorschau,
          // aktiv/angesehen → volle Karte. Der Superset-Partner der aktiven
          // Karte bleibt immer offen (man wechselt jeden Satz); der Flash-Guard
          // lässt den Abschluss-Schimmer erst auf der offenen Karte ausspielen.
          const slotDone = slotIsDone({ ex });
          const isSsPartner =
            activeCardSlot != null &&
            ssSlots.includes(slotKey) &&
            ssSlots.includes(activeCardSlot) &&
            slotKey !== activeCardSlot;
          const collapsedDone =
            hasStrength &&
            slotDone &&
            !isActiveCard &&
            viewSlot !== slotKey &&
            flashSlot !== slotKey &&
            // Karenz: solange die Pause zum letzten Satz DIESER Übung läuft,
            // bleibt die Karte offen (RIR nachtragbar, kein Weg-Kollabieren).
            !(restOn && lastCommitted?.exId === ex.id);
          const collapsedUpcoming =
            hasStrength && !slotDone && !isActiveCard && viewSlot !== slotKey && !isSsPartner;
          return (
            <div
              key={slotKey}
              ref={(el) => {
                if (el) cardRefs.current.set(slotKey, el);
                else cardRefs.current.delete(slotKey);
              }}
              data-slot={slotKey}
              className={cn(
                "relative overflow-hidden rounded-card border border-surface-3 bg-surface-1",
                !collapsedDone && !collapsedUpcoming && "p-4",
                isActiveCard ? "edge-top shadow-card-lg stage-light" : "shadow-card",
                (collapsedDone || collapsedUpcoming) && "stage-dim",
                slotDone && !isActiveCard && !collapsedDone && "opacity-80",
              )}
            >
              {/* Abschluss-Flash: kurzer Akzent-Schimmer, wenn die Übung voll ist. */}
              <AnimatePresence>
                {flashSlot === slotKey && !reduce && (
                  <motion.div
                    aria-hidden
                    className="pointer-events-none absolute inset-0 rounded-card bg-hero-accent"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: [0, 1, 0] }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.9, ease: "easeInOut" }}
                  />
                )}
              </AnimatePresence>
              {collapsedDone ? (
                /* Erledigt: schlanke Ergebnis-Zeile — Tap zeigt die Karte (ansehen). */
                <Pressable
                  onClick={() => {
                    tap();
                    setViewSlot(slotKey);
                  }}
                  aria-label={`${ex.name} anzeigen`}
                  className="flex w-full items-center gap-2 px-4 py-3 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-sessions"
                >
                  <span className="font-mono text-xs text-status-in">
                    {String(idx + 1).padStart(2, "0")}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-fg">
                    {ex.name}
                  </span>
                  <span className="max-w-32 shrink-0 truncate font-mono text-xs tabular-nums text-muted">
                    {ex.pattern === "cardio"
                      ? "Erledigt"
                      : work
                          .map((s) =>
                            ex.unit === "Sek"
                              ? `${s.reps}s`
                              : s.weight !== "" && s.weight != null
                                ? `${s.weight}×${s.reps}`
                                : `${s.reps}`,
                          )
                          .join("  ")}
                  </span>
                  <Check size={14} className="shrink-0 text-status-in" aria-hidden />
                </Pressable>
              ) : collapsedUpcoming ? (
                /* Offen: Ghost-Vorschau — Tap macht die Karte zur aktiven. */
                <Pressable
                  onClick={() => {
                    tap();
                    if (ex.pattern === "cardio" || activeSetIdx < 0) setViewSlot(slotKey);
                    else setEditKey(`${ex.id}:${activeSetIdx}`);
                  }}
                  aria-label={`${ex.name} öffnen`}
                  className="flex w-full items-center gap-2 px-4 py-3 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-sessions"
                >
                  <span className="font-mono text-xs text-faint">
                    {String(idx + 1).padStart(2, "0")}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm text-muted">{ex.name}</span>
                  <span className="shrink-0 font-mono text-xs tabular-nums text-faint">
                    {ex.pattern === "cardio"
                      ? `${ex.repLow}–${ex.repHigh} Min`
                      : `${ex.sets} × ${ex.repLow}–${ex.repHigh}`}
                  </span>
                </Pressable>
              ) : (
                <>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "font-mono text-xs",
                        isActiveCard ? "text-accent-ink" : "text-faint",
                      )}
                    >
                      {String(idx + 1).padStart(2, "0")}
                    </span>
                    <h3 className="font-semibold leading-tight">{ex.name}</h3>
                  </div>
                  <p className="mt-0.5 text-xs text-muted">
                    {ex.tag} · {PATTERN_LABEL[ex.pattern]}
                  </p>
                  {isSuperset && (
                    <span className="mt-1.5 inline-flex items-center gap-1 rounded-pill border border-line px-2 py-0.5 font-mono text-xs uppercase tracking-widest text-accent-2">
                      <Repeat size={11} /> Wechsel
                    </span>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {exComplete && <Check size={14} className="text-status-in" aria-hidden />}
                  {ex.pattern !== "cardio" && <ProgressRing done={exDone} total={ex.sets} />}
                  <div className="text-right">
                    <p className="font-mono text-sm tabular-nums text-accent-ink">
                      {ex.pattern === "cardio"
                        ? `${ex.repLow}–${ex.repHigh}`
                        : `${ex.sets} × ${ex.repLow}–${ex.repHigh}`}
                    </p>
                    <p className="text-xs uppercase tracking-wider text-faint">
                      {ex.pattern === "cardio"
                        ? "Min"
                        : ex.unit === "Sek"
                          ? "Sekunden"
                          : "Wdh"}
                    </p>
                  </div>
                </div>
              </div>

              <p className="mt-2 text-xs leading-relaxed text-muted">{ex.cue}</p>

              {recSets > ex.sets && exDone < recSets && (
                <p className="mt-1.5 text-xs font-medium text-accent-2">
                  Ziel heute: {recSets} Sätze — noch Raum für +1.
                </p>
              )}

              {ex.pattern !== "cardio" && chips.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {chips.map((c, i) => (
                    <Chip key={i} tone={c.tone}>
                      {c.text}
                    </Chip>
                  ))}
                </div>
              )}

              <div className="mt-2 flex items-center gap-4">
                <Pressable
                  onClick={() => setGuideSlot(slotKey)}
                  className="flex items-center gap-1 rounded px-1 py-1 text-xs text-accent-ink focus:outline-none"
                >
                  <ChevronRight size={14} /> Ausführung
                </Pressable>
                {pool.length > 1 && (
                  <Pressable
                    onClick={() => suggestSwap(ex, slotKey)}
                    className="flex items-center gap-1 rounded px-1 py-1 text-xs text-muted focus:outline-none"
                  >
                    <Repeat size={13} /> Übung ändern
                  </Pressable>
                )}
                {poseSupported && (
                  <Pressable
                    onClick={() => router.push(`/form/${ex.id}`)}
                    className="flex items-center gap-1 rounded px-1 py-1 text-xs text-accent-2 focus:outline-none"
                  >
                    <Camera size={13} /> Kamera-Check
                  </Pressable>
                )}
              </div>

              {swapNote?.slotKey === slotKey && (
                <div className="mt-2 rounded-card border border-surface-3 bg-surface-1 p-3 shadow-card">
                  <p className="text-sm text-fg">
                    <span className="text-muted">{swapNote.fromName}</span>
                    {" → "}
                    <span className="font-medium">{swapNote.toName}</span>
                  </p>
                  <p className="mt-0.5 text-xs text-muted">
                    Ideale Alternative — passend zu deinen Geräten.
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <Pressable
                      onClick={() => {
                        setPickSlot(slotKey);
                        setSwapNote(null);
                      }}
                      className="rounded-pill bg-surface-2 px-3 py-1.5 text-xs font-medium text-accent-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-sessions"
                    >
                      Andere
                    </Pressable>
                    <Pressable
                      onClick={() => {
                        swapExercise(slotKey, swapNote.fromId);
                        setSwapNote(null);
                      }}
                      className="rounded-pill bg-surface-2 px-3 py-1.5 text-xs text-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-sessions"
                    >
                      Rückgängig
                    </Pressable>
                    <Pressable
                      onClick={() => setSwapNote(null)}
                      aria-label="Behalten"
                      className="ml-auto rounded-full p-1.5 text-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-sessions"
                    >
                      <X size={14} />
                    </Pressable>
                  </div>
                </div>
              )}

              {ex.pattern === "cardio" ? (
                <div className="mt-3">
                  {ex.steps.length > 0 && (
                    <ul className="mb-3 space-y-1">
                      {ex.steps.map((st, i) => (
                        <li
                          key={i}
                          className="flex gap-2 text-xs leading-relaxed text-muted"
                        >
                          <span className="font-mono text-faint">{i + 1}</span>
                          <span>{st}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                  {(() => {
                    const cur = (entries[ex.id] || [])[0];
                    const isDone = !!cur && cur.reps !== "" && cur.reps != null;
                    return (
                      <Pressable
                        onClick={() => setEntry(ex.id, 0, "reps", isDone ? "" : "1")}
                        className={cn(
                          "flex w-full items-center justify-center gap-2 rounded-card py-2.5 text-sm font-medium focus:outline-none",
                          isDone ? "bg-surface-2 text-accent-2" : "bg-surface-2 text-fg",
                        )}
                      >
                        <Check size={16} strokeWidth={2.5} />
                        {isDone ? "Erledigt" : "Als erledigt markieren"}
                      </Pressable>
                    );
                  })()}
                  <p className="mt-2 text-center text-xs text-faint">
                    Ist-Aufzeichnung kommt aus Strava.
                  </p>
                </div>
              ) : (
                <>
                  {/* Bühne: der aktuelle Auftrag riesig — was JETZT zu tun ist.
                      Gleiche Quelle wie die Ghost-Werte der Satz-Zeilen. */}
                  {isActiveCard &&
                    activeSetIdx >= 0 &&
                    (() => {
                      const cur = (entries[ex.id] || [])[activeSetIdx];
                      const prevW = [...(entries[ex.id] || [])]
                        .slice(0, activeSetIdx)
                        .reverse()
                        .find((s) => !s.warmup && s.weight !== "" && s.weight != null)?.weight;
                      const w = !ex.weighted
                        ? undefined
                        : cur && cur.weight !== "" && cur.weight != null
                          ? String(cur.weight)
                          : ((prevW as string | undefined) ??
                            (p.suggestedWeight != null ? String(p.suggestedWeight) : undefined));
                      const r = p.r || String(ex.repHigh);
                      const orderText =
                        ex.unit === "Sek" ? `${r} Sek` : w ? `${w} kg × ${r}` : `× ${r}`;
                      const setNo = (entries[ex.id] || [])
                        .slice(0, activeSetIdx + 1)
                        .filter((s) => !s.warmup).length;
                      return (
                        <div className="mt-3 text-center" data-testid="stage-order">
                          <p className="font-mono text-xs uppercase tracking-widest text-faint">
                            Jetzt · Satz {setNo}/{ex.sets}
                          </p>
                          <motion.p
                            key={orderText}
                            initial={reduce ? false : { scale: 0.92, opacity: 0.5 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={reduce ? { duration: 0 } : SPRING.pop}
                            className="mt-1 font-display text-5xl font-bold leading-none tracking-tight tabular-nums text-fg"
                          >
                            {orderText}
                          </motion.p>
                        </div>
                      );
                    })()}
                  {/* Aktive Karte mit Historie → das Duell; sonst das ruhige Kästchen. */}
                  {isActiveCard && lp ? (
                    <ShadowRace
                      ex={ex}
                      sets={entries[ex.id] || []}
                      lastPerf={lp}
                      prescLine={
                        key === "exam"
                          ? "Prüfung: Rampe 5 · 4 · 3 — steigere zum schweren Test-Satz."
                          : p.line
                      }
                    />
                  ) : (
                    <div className="mt-3 rounded-card border-l-2 border-accent-sessions bg-surface-2 px-3 py-2">
                      <p className="text-xs uppercase tracking-widest text-muted">
                        Letztes Mal
                      </p>
                      <p className="font-mono text-sm tabular-nums text-fg">
                        {ps || "—"}
                      </p>
                      <p className="mt-1 text-xs text-accent-ink">
                        {key === "exam"
                          ? "Prüfung: Rampe 5 · 4 · 3 — steigere zum schweren Test-Satz."
                          : p.line}
                      </p>
                    </div>
                  )}

                  {cardLine && <AtlasLiveLine line={cardLine} />}
                  {cardMotivation && <MotivationLine text={cardMotivation.text} />}

                  <div className="mt-3 space-y-1">
                    {(() => {
                      let workIdx = 0;
                      const exEdit =
                        editKey && editKey.startsWith(ex.id + ":")
                          ? Number(editKey.slice(ex.id.length + 1))
                          : null;
                      const effActive = exEdit != null ? exEdit : activeSetIdx;
                      const lastW = [...(entries[ex.id] || [])]
                        .reverse()
                        .find((s) => !s.warmup && s.weight !== "" && s.weight != null)?.weight;
                      const ghostWeight = ex.weighted
                        ? ((lastW as string | undefined) ??
                          (p.suggestedWeight != null ? String(p.suggestedWeight) : undefined))
                        : undefined;
                      const ghostReps = p.r || String(ex.repHigh);
                      const canCamera = poseSupported && configForPattern(ex.pattern) != null;
                      const rec = recordMap.get(ex.id) ?? null;
                      return (entries[ex.id] || []).map((s, i) => {
                        const label = s.warmup ? "Aufw." : `Satz ${++workIdx}`;
                        const filled = s.reps !== "" && s.reps != null;
                        const setState: "active" | "done" | "upcoming" =
                          i === effActive ? "active" : filled ? "done" : "upcoming";
                        return (
                          <SetRow
                            key={i}
                            label={label}
                            isWarmup={!!s.warmup}
                            unit={ex.unit}
                            set={s}
                            isDumbbell={ex.req.includes("dumbbell")}
                            state={setState}
                            ghostWeight={s.warmup ? undefined : ghostWeight}
                            ghostReps={s.warmup ? undefined : ghostReps}
                            onWeight={(val) => setEntry(ex.id, i, "weight", val)}
                            onReps={(oldVal, val) => onReps(ex.id, i, oldVal, val)}
                            onRir={(val) => setEntry(ex.id, i, "rir", val)}
                            onIntensity={(val) => setEntry(ex.id, i, "intensity", val)}
                            onActivate={() => setEditKey(`${ex.id}:${i}`)}
                            onDeactivate={() =>
                              setEditKey((k) => (k === `${ex.id}:${i}` ? null : k))
                            }
                            recordLabel={rec?.label}
                            isRecord={beatsRecord(ex, s, rec)}
                            onCamera={
                              canCamera && !s.warmup
                                ? () =>
                                    setCamFor({
                                      exId: ex.id,
                                      i,
                                      pattern: ex.pattern,
                                      name: ex.name,
                                      ghost: ex.weighted ? ghostWeight : undefined,
                                    })
                                : undefined
                            }
                          />
                        );
                      });
                    })()}
                  </div>

                  {/* Übung voll → direkte Brücke zur nächsten offenen Übung. */}
                  {exComplete && nextOpen && (
                    <Pressable
                      onClick={() => {
                        tap();
                        setEditKey(null);
                        scrollToSlot(nextOpen.slotKey);
                      }}
                      className="mt-2 flex w-full items-center justify-between rounded-card bg-surface-2 px-3 py-2 text-sm font-medium text-accent-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-sessions"
                    >
                      <span className="min-w-0 truncate">Weiter: {nextOpen.ex.name}</span>
                      <ChevronRight size={16} className="shrink-0" />
                    </Pressable>
                  )}
                </>
              )}
                </>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-6 rounded-card border border-surface-3 bg-surface-1 shadow-card p-4">
        <p className="text-sm font-medium">Wie fühlt sich dein unterer Rücken an?</p>
        <p className="mb-3 mt-0.5 text-xs text-muted">
          Kurz einschätzen — steuert die nächste Einheit.
        </p>
        <div className="flex gap-2">
          {BACK_OPTIONS.map((o) => (
            <Pressable
              key={o.v}
              onClick={() => setBackTraffic(backTraffic === o.v ? null : o.v)}
              className={cn(
                "flex-1 rounded-card border py-3 text-sm font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-sessions",
                backTraffic === o.v ? o.on : "border-transparent bg-surface-2 text-muted",
              )}
            >
              {o.label}
            </Pressable>
          ))}
        </div>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Notiz zur Einheit — wie war's?"
          rows={2}
          className="mt-4 w-full resize-none rounded-card bg-surface-2 px-3 py-2.5 text-sm text-fg placeholder:text-faint focus:outline-none focus:ring-2 focus:ring-accent-sessions"
        />
      </div>

      <Pressable
        onClick={() => setConfirmOpen(true)}
        disabled={saving}
        className={cn(
          "mt-3 flex w-full items-center justify-center gap-2 rounded-card bg-strong py-4 text-lg font-semibold text-on-strong focus:outline-none disabled:opacity-60",
          allDone && "glow-accent",
        )}
      >
        <Save size={18} strokeWidth={2.5} /> {saving ? "Speichert…" : "Training beenden"}
      </Pressable>

      <Sheet open={confirmOpen} onClose={() => setConfirmOpen(false)} title="Training beenden?">
        {doneCount > 0 ? (
          <>
            <p className="mb-4 text-sm text-muted">
              Du hast {doneCount} {doneCount === 1 ? "Satz" : "Sätze"} erledigt. Beenden speichert
              diese — der Rest wird verworfen.
            </p>
            <div className="flex flex-col gap-2">
              <Pressable
                onClick={onSave}
                disabled={saving}
                className="flex items-center justify-center gap-2 rounded-card bg-strong py-3 text-sm font-semibold text-on-strong focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-sessions disabled:opacity-60"
              >
                <Save size={16} strokeWidth={2.5} /> {saving ? "Speichert…" : "Beenden & speichern"}
              </Pressable>
              <Pressable
                onClick={() => setConfirmOpen(false)}
                className="rounded-card bg-surface-2 py-3 text-sm font-medium text-fg focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-sessions"
              >
                Weiter trainieren
              </Pressable>
              <Pressable
                onClick={onDiscard}
                className="rounded-card py-2 text-xs font-medium text-status-danger focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-sessions"
              >
                Ohne Speichern verwerfen
              </Pressable>
            </div>
          </>
        ) : (
          <>
            <p className="mb-4 text-sm text-muted">
              Noch keine Sätze erledigt. Training wirklich verlassen? Es wird nichts gespeichert.
            </p>
            <div className="flex flex-col gap-2">
              <Pressable
                onClick={onDiscard}
                className="rounded-card bg-strong py-3 text-sm font-semibold text-on-strong focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-sessions"
              >
                Training verlassen
              </Pressable>
              <Pressable
                onClick={() => setConfirmOpen(false)}
                className="rounded-card bg-surface-2 py-3 text-sm font-medium text-fg focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-sessions"
              >
                Weiter trainieren
              </Pressable>
            </div>
          </>
        )}
      </Sheet>

      <GuideSheet open={!!guideSlot} onClose={() => setGuideSlot(null)} ex={guideEx} />
      {camFor && (
        <CameraView
          exerciseName={camFor.name}
          pattern={camFor.pattern}
          voiceOn={!!settings.voiceCues}
          onClose={() => setCamFor(null)}
          onComplete={applyFormResult}
        />
      )}
      <ExercisePicker
        open={!!pickSlot}
        onClose={() => setPickSlot(null)}
        pool={pickItem?.pool ?? []}
        currentId={pickItem?.ex.id ?? ""}
        onPick={(id) => pickItem && swapExercise(pickItem.slotKey, id)}
      />

      <AnimatePresence>
        {restOn &&
          (() => {
            const lc = lastCommitted;
            const lcEx = lc ? list.find((s) => s.ex.id === lc.exId)?.ex : undefined;
            const lcSet = lc ? (entries[lc.exId] || [])[lc.i] : undefined;
            const effort =
              lc && lcEx && lcSet && !lcSet.warmup
                ? {
                    timed: lcEx.unit === "Sek",
                    name: lcEx.name,
                    setNo: (entries[lc.exId] || [])
                      .slice(0, lc.i + 1)
                      .filter((s) => !s.warmup).length,
                    rir: lcSet.rir,
                    intensity: lcSet.intensity,
                    onRir: (v: number) => setEntry(lc.exId, lc.i, "rir", v),
                    onIntensity: (v: number) => setEntry(lc.exId, lc.i, "intensity", v),
                  }
                : undefined;
            return (
              <RestTimer
                left={restLeft}
                total={TIME.restSec}
                onAdd={() => setRestLeft((x) => x + 15)}
                onSkip={() => setRestOn(false)}
                effort={effort}
              />
            );
          })()}
      </AnimatePresence>
    </div>
  );
}
