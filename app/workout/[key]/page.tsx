"use client";

import { AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Bike,
  Camera,
  Check,
  ChevronRight,
  Flame,
  Mic,
  Repeat,
  Save,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { CameraView, type FormResult } from "@/components/form-check/CameraView";
import { ExercisePicker } from "@/components/workout/ExercisePicker";
import { GuideSheet } from "@/components/workout/GuideSheet";
import { LiveDemo } from "@/components/workout/LiveDemo";
import { ReadinessGate } from "@/components/workout/ReadinessGate";
import { RestTimer } from "@/components/workout/RestTimer";
import { SessionTimeBar } from "@/components/workout/SessionTimeBar";
import { SetRow } from "@/components/workout/SetRow";
import { Chip } from "@/components/ui/Chip";
import { Pressable } from "@/components/ui/pressable";
import { useTraining } from "@/components/providers/TrainingProvider";
import { exerciseChips } from "@/lib/coaching";
import { PATTERN_LABEL } from "@/lib/exercises";
import { presc } from "@/lib/progression";
import { estimateSessionMin, supersetPair } from "@/lib/session-time";
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
import type { Pattern, TrafficLight } from "@/lib/types";

const REST_SECONDS = 90;

const BACK_OPTIONS: { v: TrafficLight; label: string; on: string }[] = [
  { v: "green", label: "Gut", on: "bg-emerald-500 text-on-strong" },
  { v: "yellow", label: "Mittel", on: "bg-amber-400 text-on-strong" },
  { v: "red", label: "Gereizt", on: "bg-rose-500 text-neutral-50" },
];

/** Per-exercise completion ring (done work-sets / planned). */
function ProgressRing({ done, total }: { done: number; total: number }) {
  const r = 9;
  const circ = 2 * Math.PI * r;
  const pct = total > 0 ? Math.min(1, done / total) : 0;
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6 -rotate-90" aria-hidden>
      <circle cx="12" cy="12" r={r} fill="none" stroke="var(--surface-2)" strokeWidth="3" />
      <circle
        cx="12"
        cy="12"
        r={r}
        fill="none"
        stroke="var(--accent-ink)"
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray={circ}
        strokeDashoffset={circ * (1 - pct)}
      />
    </svg>
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
    saving,
    activeList,
    settings,
    todayReadiness,
    readinessScale,
    lastPerf,
    backTraffic,
    setBackTraffic,
    note,
    setNote,
    log,
    daysAgo,
    cardioAdvice,
  } = useTraining();
  const lighter = daysAgo != null && daysAgo > 5;
  const say = (text: string) => {
    if (settings.voiceCues) speak(text);
  };

  const [guideSlot, setGuideSlot] = useState<string | null>(null);
  const [pickSlot, setPickSlot] = useState<string | null>(null);
  const [gateOpen, setGateOpen] = useState(false);
  const [restLeft, setRestLeft] = useState(0);
  const [restOn, setRestOn] = useState(false);
  const [listening, setListening] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [poseSupported, setPoseSupported] = useState(false);
  const [camFor, setCamFor] = useState<{ exId: string; i: number; pattern: Pattern; name: string; ghost?: string } | null>(null);
  const announcedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (key && activeKey !== key) {
      if (settings.autoregOn && !todayReadiness) setGateOpen(true);
      else startSession(key);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, activeKey]);

  // Probe device support after mount so SSR and first client render agree.
  useEffect(() => setVoiceSupported(isVoiceInputSupported()), []);
  useEffect(() => setPoseSupported(isPoseSupported()), []);

  useEffect(() => {
    if (!restOn) return;
    if (restLeft <= 0) {
      setRestOn(false);
      if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(200);
      if (settings.voiceCues) speak("Pause vorbei. Auf geht's.", { interrupt: true });
      return;
    }
    if (settings.voiceCues) {
      if (restLeft === 10) speak("Noch zehn Sekunden");
      else if (restLeft <= 3) speak(["", "eins", "zwei", "drei"][restLeft]);
    }
    const id = setTimeout(() => setRestLeft((x) => x - 1), 1000);
    return () => clearTimeout(id);
  }, [restOn, restLeft, settings.voiceCues]);

  // Announce a new record once per exercise, hands-free.
  useEffect(() => {
    if (!settings.voiceCues || activeKey !== key) return;
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
        speak("Neuer Rekord! Stark.");
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
    setRestLeft(REST_SECONDS);
    setRestOn(true);
  };
  const onReps = (exId: string, i: number, oldVal: string, val: string) => {
    setEntry(exId, i, "reps", val);
    if ((oldVal === "" || oldVal == null) && val !== "" && val != null) startRest();
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
    setCamFor(null);
    if (r.reps > 0) {
      say(`${r.reps} ${r.reps === 1 ? "Wiederholung" : "Wiederholungen"} übernommen.`);
      if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate([40, 40, 60]);
    }
  };

  const tpl = sessionTemplate(key ?? "");
  const list = activeList;
  const ssPair = settings.superset ? supersetPair(list) : null;

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
        setRestLeft(REST_SECONDS);
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

  if (activeKey !== key) {
    return (
      <>
        <div className="py-10 text-center font-mono text-sm text-faint">
          bereite vor…
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

  const guideEx = list.find((s) => s.slotKey === guideSlot)?.ex ?? null;
  const pickItem = list.find((s) => s.slotKey === pickSlot) ?? null;

  const onSave = async () => {
    await saveSession();
    router.push("/");
  };

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <Pressable
          onClick={() => router.push("/")}
          className="flex items-center gap-1 rounded-md px-1 py-1 text-sm text-muted focus:outline-none"
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

      <Pressable
        onClick={() => router.push(`/warmup/${key}`)}
        className="mb-4 mt-3 flex w-full items-center justify-center gap-2 rounded-card border border-surface-3 bg-surface-1 shadow-card py-3 text-sm font-medium text-accent-ink focus:outline-none"
      >
        <Flame size={16} /> Aufwärmen · {warmupTotalMin(warmupFor(tpl, { bike: settings.bikeWarmup }))} Min
      </Pressable>

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
          return (
            <div
              key={slotKey}
              ref={(el) => {
                if (el) cardRefs.current.set(slotKey, el);
                else cardRefs.current.delete(slotKey);
              }}
              data-slot={slotKey}
              className="rounded-card border border-surface-3 bg-surface-1 shadow-card p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-faint">
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
                    onClick={() => setPickSlot(slotKey)}
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
                          "flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-medium focus:outline-none",
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
                  <div className="mt-3 rounded-xl border-l-2 border-accent-sessions bg-surface-2 px-3 py-2">
                    <p className="text-xs uppercase tracking-widest text-muted">
                      Letztes Mal
                    </p>
                    <p className="font-mono text-sm tabular-nums text-fg">
                      {ps || "—"}
                    </p>
                    <p className="mt-1 text-xs text-accent-ink">{p.line}</p>
                  </div>

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
                "flex-1 rounded-xl py-3 text-sm font-medium focus:outline-none",
                backTraffic === o.v ? o.on : "bg-surface-2 text-muted",
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
          className="mt-4 w-full resize-none rounded-xl bg-surface-2 px-3 py-2.5 text-sm text-fg placeholder:text-faint focus:outline-none focus:ring-2 focus:ring-accent-sessions"
        />
      </div>

      <Pressable
        onClick={onSave}
        disabled={saving}
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-card bg-strong py-4 text-lg font-semibold text-on-strong focus:outline-none disabled:opacity-60"
      >
        <Save size={18} strokeWidth={2.5} /> {saving ? "Speichert…" : "Training speichern"}
      </Pressable>

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
        {restOn && (
          <RestTimer
            left={restLeft}
            total={REST_SECONDS}
            onAdd={() => setRestLeft((x) => x + 15)}
            onSkip={() => setRestOn(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
