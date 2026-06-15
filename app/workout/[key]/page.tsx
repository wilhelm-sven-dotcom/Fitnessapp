"use client";

import { AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  ChevronRight,
  Repeat,
  Save,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ExercisePicker } from "@/components/workout/ExercisePicker";
import { GuideSheet } from "@/components/workout/GuideSheet";
import { RestTimer } from "@/components/workout/RestTimer";
import { SetRow } from "@/components/workout/SetRow";
import { Pressable } from "@/components/ui/pressable";
import { useTraining } from "@/components/providers/TrainingProvider";
import { PATTERN_LABEL, TEMPLATE } from "@/lib/exercises";
import { presc } from "@/lib/progression";
import { cn } from "@/lib/utils";

const REST_SECONDS = 90;

export default function WorkoutPage() {
  const params = useParams();
  const key = Array.isArray(params.key) ? params.key[0] : params.key;
  const router = useRouter();
  const {
    activeKey,
    entries,
    startSession,
    setEntry,
    swapExercise,
    saveSession,
    saving,
    sessionOf,
    lastPerf,
  } = useTraining();

  const [guideSlot, setGuideSlot] = useState<string | null>(null);
  const [pickSlot, setPickSlot] = useState<string | null>(null);
  const [restLeft, setRestLeft] = useState(0);
  const [restOn, setRestOn] = useState(false);

  useEffect(() => {
    if (key && activeKey !== key) startSession(key);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, activeKey]);

  useEffect(() => {
    if (!restOn) return;
    if (restLeft <= 0) {
      setRestOn(false);
      if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(200);
      return;
    }
    const id = setTimeout(() => setRestLeft((x) => x - 1), 1000);
    return () => clearTimeout(id);
  }, [restOn, restLeft]);

  const startRest = () => {
    setRestLeft(REST_SECONDS);
    setRestOn(true);
  };
  const onReps = (exId: string, i: number, oldVal: string, val: string) => {
    setEntry(exId, i, "reps", val);
    if ((oldVal === "" || oldVal == null) && val !== "" && val != null) startRest();
  };

  const tpl = TEMPLATE.find((t) => t.key === key);
  const list = key ? sessionOf(key) : [];

  if (!tpl) {
    return (
      <div>
        <p className="text-neutral-400">Einheit nicht gefunden.</p>
        <Pressable
          onClick={() => router.push("/")}
          className="mt-3 flex items-center gap-1 text-sm text-amber-400 focus:outline-none"
        >
          <ArrowLeft size={16} /> Zur Startseite
        </Pressable>
      </div>
    );
  }

  if (activeKey !== key) {
    return <div className="py-10 text-center font-mono text-sm text-neutral-600">bereite vor…</div>;
  }

  const done = list.filter(({ ex }) =>
    (entries[ex.id] || []).some((s) => s.reps !== "" && s.reps != null),
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
          className="flex items-center gap-1 rounded-md px-1 py-1 text-sm text-neutral-400 focus:outline-none"
        >
          <ArrowLeft size={18} /> Zurück
        </Pressable>
        <span className="font-mono text-xs tabular-nums text-neutral-500">
          {done}/{list.length} erledigt
        </span>
      </div>

      <h2 className="text-2xl font-semibold tracking-tight">{tpl.name}</h2>
      <p className="mb-1 text-sm text-neutral-500">{tpl.focus}</p>
      <div className="mb-5 h-1 w-full overflow-hidden rounded-full bg-neutral-800">
        <div
          className="h-full rounded-full bg-amber-400 transition-all"
          style={{ width: `${(done / total) * 100}%` }}
        />
      </div>

      <div className="space-y-3">
        {list.map(({ ex, slotKey, pool }, idx) => {
          const lp = lastPerf(ex.id);
          const p = presc(ex, lp);
          const ps = lp
            ? lp.sets
                .map((s) =>
                  ex.unit === "Sek"
                    ? `${s.reps}s`
                    : s.weight !== "" && s.weight != null
                      ? `${s.weight}×${s.reps}`
                      : `${s.reps}`,
                )
                .join("   ")
            : null;
          const isDone = (entries[ex.id] || []).some(
            (s) => s.reps !== "" && s.reps != null,
          );
          return (
            <div
              key={slotKey}
              className={cn(
                "rounded-2xl bg-neutral-900 p-4",
                isDone && "ring-1 ring-emerald-700",
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-neutral-600">
                      {String(idx + 1).padStart(2, "0")}
                    </span>
                    <h3 className="font-semibold leading-tight">{ex.name}</h3>
                  </div>
                  <p className="mt-0.5 text-xs text-neutral-500">
                    {ex.tag} · {PATTERN_LABEL[ex.pattern]}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="font-mono text-sm tabular-nums text-amber-400">
                    {ex.sets} × {ex.repLow}–{ex.repHigh}
                  </p>
                  <p className="text-xs uppercase tracking-wider text-neutral-600">
                    {ex.unit === "Sek" ? "Sekunden" : "Wdh"}
                  </p>
                </div>
              </div>

              <p className="mt-2 text-xs leading-relaxed text-neutral-400">{ex.cue}</p>

              <div className="mt-2 flex items-center gap-4">
                <Pressable
                  onClick={() => setGuideSlot(slotKey)}
                  className="flex items-center gap-1 rounded px-1 py-1 text-xs text-amber-400 focus:outline-none"
                >
                  <ChevronRight size={14} /> Ausführung
                </Pressable>
                {pool.length > 1 && (
                  <Pressable
                    onClick={() => setPickSlot(slotKey)}
                    className="flex items-center gap-1 rounded px-1 py-1 text-xs text-neutral-400 focus:outline-none"
                  >
                    <Repeat size={13} /> Übung ändern
                  </Pressable>
                )}
              </div>

              <div className="mt-3 rounded-xl bg-neutral-800 px-3 py-2">
                <p className="text-xs uppercase tracking-widest text-neutral-500">
                  Letztes Mal
                </p>
                <p className="font-mono text-sm tabular-nums text-neutral-200">
                  {ps || "—"}
                </p>
                <p className="mt-1 text-xs text-amber-300">{p.line}</p>
              </div>

              <div className="mt-3 space-y-2">
                {(entries[ex.id] || []).map((s, i) => (
                  <SetRow
                    key={i}
                    index={i}
                    unit={ex.unit}
                    set={s}
                    onWeight={(val) => setEntry(ex.id, i, "weight", val)}
                    onReps={(oldVal, val) => onReps(ex.id, i, oldVal, val)}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <Pressable
        onClick={onSave}
        disabled={saving}
        className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-amber-400 py-4 text-lg font-semibold text-neutral-950 focus:outline-none disabled:opacity-60"
      >
        <Save size={18} strokeWidth={2.5} /> {saving ? "Speichert…" : "Training speichern"}
      </Pressable>

      <GuideSheet open={!!guideSlot} onClose={() => setGuideSlot(null)} ex={guideEx} />
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
