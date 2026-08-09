"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { AtlasPanel } from "@/components/session/AtlasPanel";
import { ExerciseStage } from "@/components/session/ExerciseStage";
import { FinishFlow } from "@/components/session/FinishFlow";
import { OverviewSheet } from "@/components/session/OverviewSheet";
import { ProgressHeader } from "@/components/session/ProgressHeader";
import { RestPanel } from "@/components/session/RestPanel";
import { SessionEditSheet } from "@/components/home/SessionEditSheet";
import { SpotifyNowPlaying } from "@/components/spotify/SpotifyNowPlaying";
import { GuideSheet } from "@/components/workout/GuideSheet";
import { ReadinessGate } from "@/components/workout/ReadinessGate";
import { SessionComplete } from "@/components/workout/SessionComplete";
import { WarmupPlayer } from "@/components/warmup/WarmupPlayer";
import { useWakeLock } from "@/components/workout/useWakeLock";
import { Pressable } from "@/components/ui/pressable";
import { Sheet } from "@/components/ui/sheet";
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
  loadActiveState,
  persistActiveState,
  prefillEntries,
  reconcileEntries,
  startScale,
  type ActiveSessionState,
  type PrefillOpts,
} from "@/lib/active-session";
import { dailyToTemplate, type DailySession } from "@/lib/session-model";
import { estimateRemainingMin, TIME } from "@/lib/session-time";
import { presc } from "@/lib/progression";
import { beatsRecord, exerciseRecords } from "@/lib/records";
import { success, tap } from "@/lib/haptics";
import { speak } from "@/lib/voice";
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
    lastPerf,
    daysAgo,
    settings,
    todayReadiness,
    setReadiness,
    lastBackRed,
    backSpareToday,
    setBackSpareToday,
    saveActiveSession,
    discardActive,
    saving,
    exerciseNotes,
  } = useTraining();

  const [active, setActive] = useState<ActiveSessionState | null>(null);
  const [boot, setBoot] = useState<Boot>("loading");
  const [complete, setComplete] = useState<SessionSummary | null>(null);
  const [rest, setRest] = useState<RestState | null>(null);
  const [overviewOpen, setOverviewOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [exitOpen, setExitOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);

  // Refs für Handler, die frischen State brauchen, ohne pro Render neu zu binden.
  const activeRef = useRef<ActiveSessionState | null>(null);
  const committedRef = useRef<Set<string>>(new Set());
  const recordCelebratedRef = useRef<Set<string>>(new Set());

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
  const prefillOpts = (variant: DailySession["variant"]): PrefillOpts => ({
    allLib,
    lastPerf,
    daysAgo,
    weightStep: settings.weightStep,
    scale,
    variant,
  });

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

  // Display wach halten, solange trainiert wird (abschaltbar).
  useWakeLock(settings.keepAwake !== false && boot === "running" && !complete);

  // Pausen-Countdown — inline, ohne Overlay.
  useEffect(() => {
    if (!rest) return;
    if (rest.left <= 0) {
      if (typeof navigator !== "undefined" && navigator.vibrate)
        navigator.vibrate(200);
      if (settings.voiceCues) speak("Pause vorbei. Auf geht's.", { interrupt: true });
      const id = setTimeout(() => setRest(null), 700);
      return () => clearTimeout(id);
    }
    if (settings.voiceCues) {
      if (rest.left === 10) speak("Noch zehn Sekunden");
      else if (rest.left <= 3) speak(["", "eins", "zwei", "drei"][rest.left]);
    }
    const id = setTimeout(
      () => setRest((r) => (r ? { ...r, left: r.left - 1 } : r)),
      1000,
    );
    return () => clearTimeout(id);
  }, [rest, settings.voiceCues]);

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
      if (settings.voiceCues) speak("Neuer Rekord! Stark.");
    } else {
      tap();
    }
    setRest({ itemId, setIdx: i, left: TIME.restSec, total: TIME.restSec });
  };

  /* ── Navigation ── */

  const nextOpenIndex = (): number | null => {
    const st = activeRef.current;
    if (!st) return null;
    const its = st.session.items;
    for (let off = 1; off <= its.length; off++) {
      const i = (st.currentIndex + off) % its.length;
      const ex = byId.get(its[i].exerciseId);
      if (ex && !itemDone(ex, st.entries[its[i].id])) return i;
    }
    return null;
  };

  const goNext = () => {
    tap();
    const n = nextOpenIndex();
    if (n == null) patch((s) => ({ ...s, phase: "finish" }));
    else patch((s) => ({ ...s, currentIndex: n }));
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

  /* ── Abschluss ── */

  const doSave = async (backTraffic: TrafficLight | null, note: string) => {
    const st = activeRef.current;
    if (!st) return;
    const final: ActiveSessionState = { ...st, backTraffic, note };
    commit(final);
    const summary = await saveActiveSession(final);
    activeRef.current = null;
    setActive(null);
    if (summary) setComplete(summary);
    else router.replace("/");
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
    return <SessionComplete summary={complete} onDone={() => router.replace("/")} />;
  }
  if (boot === "loading" || boot === "none") return null;

  if (boot === "gate") {
    return (
      <>
        <div className="pt-10 text-center">
          <p className="font-mono text-xs uppercase tracking-widest text-accent-2">
            Gleich geht&apos;s los
          </p>
          <h1 className="mt-1 font-display text-2xl font-semibold tracking-tight text-fg">
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
    const drills = warmupFor(dailyToTemplate(st.session, allLib), {
      bike: settings.bikeWarmup,
    });
    const toExercise = () => patch((s) => ({ ...s, phase: "exercise" }));
    return (
      <WarmupPlayer
        drills={drills}
        voiceOn={!!settings.voiceCues}
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
  const ex = {
    ...baseEx,
    sets: item.sets,
    repLow: item.repLow,
    repHigh: item.repHigh,
  };
  const sets = st.entries[item.id] ?? [];
  const p = presc(ex, lastPerf(ex.id), {
    lighter,
    loadMult: scale.loadMult,
    cap: scale.cap,
    step: settings.weightStep,
  });
  const isExam = st.session.variant === "exam";

  const headerItems = items.map((it) => {
    const e = byId.get(it.exerciseId);
    return { id: it.id, done: e ? itemDone(e, st.entries[it.id]) : false };
  });
  const openLeft = headerItems.filter((h) => !h.done).length;
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

  return (
    <div className="space-y-3">
      <ProgressHeader
        items={headerItems}
        currentIndex={st.currentIndex}
        remainMin={remainMin}
        onExit={() => setExitOpen(true)}
        onOverview={() => setOverviewOpen(true)}
      />

      <div className="px-1">
        <p className="truncate text-sm text-muted">
          {st.session.name}
          {st.session.focus ? ` · ${st.session.focus}` : ""}
        </p>
      </div>

      <SpotifyNowPlaying />

      <ExerciseStage
        key={item.id}
        ex={ex}
        item={item}
        index={st.currentIndex}
        total={items.length}
        sets={sets}
        presc={p}
        lastPerf={lastPerf(ex.id)}
        record={recordMap.get(ex.id) ?? null}
        isExam={isExam}
        aidNote={exerciseNotes[ex.id]}
        onOpenGuide={() => setGuideOpen(true)}
        onWeight={(i, val) => setField(item.id, i, "weight", val)}
        onReps={(i, oldVal, val) => onReps(item.id, i, oldVal, val)}
        onRir={(i, val) => setField(item.id, i, "rir", val)}
        onIntensity={(i, val) => setField(item.id, i, "intensity", val)}
        onCardioToggle={(done) => setField(item.id, 0, "reps", done ? "1" : "")}
      />

      {rest && (
        <RestPanel
          left={rest.left}
          total={rest.total}
          set={restSet}
          timed={restEx?.unit === "Sek"}
          setNo={
            restSet
              ? (st.entries[rest.itemId] ?? [])
                  .slice(0, rest.setIdx + 1)
                  .filter((s) => !s.warmup).length
              : 0
          }
          onRir={(v) => rest && setField(rest.itemId, rest.setIdx, "rir", v)}
          onIntensity={(v) =>
            rest && setField(rest.itemId, rest.setIdx, "intensity", v)
          }
          onAdd={() => setRest((r) => (r ? { ...r, left: r.left + 15 } : r))}
          onSkip={() => setRest(null)}
        />
      )}

      <AtlasPanel
        ex={ex}
        item={item}
        sets={sets}
        presc={p}
        record={recordMap.get(ex.id) ?? null}
        readiness={scale}
        lastPerf={lastPerf(ex.id)}
        isExam={isExam}
        motivateOn={settings.coachMotivation !== false}
        voiceOn={!!settings.voiceCues}
      />

      <div className="flex items-center gap-2 pt-1">
        <Pressable
          onClick={goPrev}
          disabled={st.currentIndex === 0}
          aria-label="Vorherige Übung"
          className="flex shrink-0 items-center justify-center rounded-card bg-surface-2 px-4 py-3.5 text-fg focus:outline-none disabled:opacity-30"
        >
          <ChevronLeft size={18} />
        </Pressable>
        <Pressable
          onClick={goNext}
          className="flex flex-1 items-center justify-center gap-2 rounded-card bg-strong py-3.5 text-sm font-semibold text-on-strong focus:outline-none"
        >
          {openLeft === 0 ? (
            <>
              <Flag size={16} /> Zum Abschluss
            </>
          ) : (
            <>
              Weiter <ChevronRight size={16} strokeWidth={2.5} />
            </>
          )}
        </Pressable>
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

      <GuideSheet open={guideOpen} onClose={() => setGuideOpen(false)} ex={ex} />

      <Sheet open={exitOpen} onClose={() => setExitOpen(false)} title="Training beenden?">
        {doneCount > 0 ? (
          <>
            <p className="mb-4 text-sm text-muted">
              Du hast {doneCount} {doneCount === 1 ? "Satz" : "Sätze"} erledigt.
              Beenden speichert diese — der Rest wird verworfen.
            </p>
            <div className="flex flex-col gap-2">
              <Pressable
                onClick={() => {
                  setExitOpen(false);
                  patch((s) => ({ ...s, phase: "finish" }));
                }}
                className="rounded-card bg-strong py-3 text-sm font-semibold text-on-strong focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-ink"
              >
                Zum Abschluss
              </Pressable>
              <Pressable
                onClick={() => setExitOpen(false)}
                className="rounded-card bg-surface-2 py-3 text-sm font-medium text-fg focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-ink"
              >
                Weiter trainieren
              </Pressable>
              <Pressable
                onClick={doDiscard}
                className="rounded-card py-2 text-xs font-medium text-status-danger focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-ink"
              >
                Ohne Speichern verwerfen
              </Pressable>
            </div>
          </>
        ) : (
          <>
            <p className="mb-4 text-sm text-muted">
              Noch keine Sätze erledigt. Training wirklich verlassen? Es wird
              nichts gespeichert.
            </p>
            <div className="flex flex-col gap-2">
              <Pressable
                onClick={doDiscard}
                className="rounded-card bg-strong py-3 text-sm font-semibold text-on-strong focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-ink"
              >
                Training verlassen
              </Pressable>
              <Pressable
                onClick={() => setExitOpen(false)}
                className="rounded-card bg-surface-2 py-3 text-sm font-medium text-fg focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-ink"
              >
                Weiter trainieren
              </Pressable>
            </div>
          </>
        )}
      </Sheet>
    </div>
  );
}
