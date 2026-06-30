"use client";

import { Reorder, useDragControls } from "framer-motion";
import {
  ArrowLeft,
  Check,
  GripVertical,
  Minus,
  Plus,
  Repeat,
  Sparkles,
  Trash2,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { BalanceRadar } from "@/components/progress/BalanceRadar";
import { ExercisePicker } from "@/components/workout/ExercisePicker";
import { Card } from "@/components/ui/Card";
import { Pressable } from "@/components/ui/pressable";
import { Readout } from "@/components/ui/Readout";
import { Sheet } from "@/components/ui/sheet";
import { useTraining } from "@/components/providers/TrainingProvider";
import { athletePersona, effectiveProfile } from "@/lib/athlete";
import { sessionRadarAxes } from "@/lib/balance";
import { buildCoachContext } from "@/lib/coach-context";
import { PATTERN_LABEL } from "@/lib/exercises";
import { reqOk } from "@/lib/progression";
import { estimateSessionMin } from "@/lib/session-time";
import { exerciseMuscleVolume } from "@/lib/volume";
import { tap } from "@/lib/haptics";
import type { DayItem, Exercise, ResolvedSlot, WorkoutDay } from "@/lib/types";

const COACH_TIMES = [15, 20, 25, 30, 45];
const COACH_FOCI = ["Ganzkörper", "Oberkörper", "Unterkörper", "Push", "Pull"];

interface Draft {
  key: string;
  exerciseId: string;
  sets: number;
  repLow: number;
  repHigh: number;
}

let _seq = 0;
const newKey = () => "it" + _seq++;

function Stepper({
  label,
  value,
  suffix,
  onDec,
  onInc,
}: {
  label: string;
  value: string;
  suffix?: string;
  onDec: () => void;
  onInc: () => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-12 shrink-0 font-mono text-xs uppercase tracking-wider text-faint">
        {label}
      </span>
      <Pressable
        onClick={onDec}
        aria-label={`${label} weniger`}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-2 text-fg focus:outline-none"
      >
        <Minus size={15} />
      </Pressable>
      <span className="min-w-0 flex-1 text-center font-mono text-sm tabular-nums text-fg">
        {value}
        {suffix ? <span className="text-muted"> {suffix}</span> : null}
      </span>
      <Pressable
        onClick={onInc}
        aria-label={`${label} mehr`}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-2 text-fg focus:outline-none"
      >
        <Plus size={15} />
      </Pressable>
    </div>
  );
}

function ItemRow({
  item,
  ex,
  onChange,
  onSwap,
  onRemove,
}: {
  item: Draft;
  ex: Exercise | undefined;
  onChange: (next: Draft) => void;
  onSwap: () => void;
  onRemove: () => void;
}) {
  const controls = useDragControls();
  const timed = ex?.unit === "Sek";
  const repUnit = timed ? "Sek" : "Wdh";
  const cardio = ex?.pattern === "cardio";
  const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

  return (
    <Reorder.Item
      value={item}
      dragListener={false}
      dragControls={controls}
      className="rounded-card border border-surface-3 bg-surface-1 shadow-card"
    >
      <div className="flex items-center gap-2 px-3 py-3">
        <button
          onPointerDown={(e) => {
            tap();
            controls.start(e);
          }}
          aria-label="Zum Verschieben ziehen"
          className="flex h-9 w-7 shrink-0 cursor-grab touch-none items-center justify-center rounded-md text-faint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-sessions"
        >
          <GripVertical size={18} />
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium text-fg">{ex?.name ?? "Unbekannt"}</p>
          <p className="mt-0.5 text-xs text-muted">
            {ex ? `${ex.tag} · ${PATTERN_LABEL[ex.pattern]}` : "Übung fehlt"}
          </p>
        </div>
        <Pressable
          onClick={onSwap}
          aria-label="Übung tauschen"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted focus:outline-none"
        >
          <Repeat size={15} />
        </Pressable>
        <Pressable
          onClick={onRemove}
          aria-label="Übung entfernen"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted focus:outline-none"
        >
          <Trash2 size={15} />
        </Pressable>
      </div>
      {cardio ? (
        <div className="border-t border-surface-3 px-3 py-3">
          <p className="text-xs leading-relaxed text-muted">
            <span className="font-mono tabular-nums text-fg">
              {item.repLow}–{item.repHigh} Min
            </span>
            {ex ? ` · ${ex.cue}` : ""}
          </p>
        </div>
      ) : (
        <div className="space-y-2 border-t border-surface-3 px-3 py-3">
          <Stepper
            label="Sätze"
            value={String(item.sets)}
            onDec={() => onChange({ ...item, sets: clamp(item.sets - 1, 1, 6) })}
            onInc={() => onChange({ ...item, sets: clamp(item.sets + 1, 1, 6) })}
          />
          <Stepper
            label="von"
            value={String(item.repLow)}
            suffix={repUnit}
            onDec={() => onChange({ ...item, repLow: clamp(item.repLow - 1, 1, item.repHigh) })}
            onInc={() => onChange({ ...item, repLow: clamp(item.repLow + 1, 1, item.repHigh) })}
          />
          <Stepper
            label="bis"
            value={String(item.repHigh)}
            suffix={repUnit}
            onDec={() => onChange({ ...item, repHigh: clamp(item.repHigh - 1, item.repLow, 90) })}
            onInc={() => onChange({ ...item, repHigh: clamp(item.repHigh + 1, item.repLow, 90) })}
          />
        </div>
      )}
    </Reorder.Item>
  );
}

export default function DayBuilderPage() {
  const params = useParams();
  const router = useRouter();
  const {
    loading,
    days,
    allLib,
    sessionOf,
    sessionTemplate,
    addDay,
    updateDay,
    log,
    body,
    cardio,
    equip,
    settings,
  } = useTraining();

  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const byId = useMemo(() => new Map(allLib.map((e) => [e.id, e])), [allLib]);

  const [name, setName] = useState("");
  const [focus, setFocus] = useState("");
  const [items, setItems] = useState<Draft[]>([]);
  const [editId, setEditId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [swapKey, setSwapKey] = useState<string | null>(null);

  // KI-Coach: builds a whole session from time + focus + available equipment.
  const [coachOpen, setCoachOpen] = useState(false);
  const [coachBusy, setCoachBusy] = useState(false);
  const [coachErr, setCoachErr] = useState("");
  const [coachNotConfigured, setCoachNotConfigured] = useState(false);
  const [coachMin, setCoachMin] = useState(25);
  const [coachFocus, setCoachFocus] = useState("Ganzkörper");

  const draftFrom = (exId: string, sets?: number, repLow?: number, repHigh?: number): Draft => {
    const base = byId.get(exId);
    return {
      key: newKey(),
      exerciseId: exId,
      sets: sets ?? base?.sets ?? 3,
      repLow: repLow ?? base?.repLow ?? 8,
      repHigh: repHigh ?? base?.repHigh ?? 12,
    };
  };

  // One-time init: edit an existing day, prefill from a template (?from=A), or blank.
  useEffect(() => {
    if (ready || loading) return;
    if (id && id !== "neu") {
      const day = days.find((d) => d.id === id);
      if (day) {
        setEditId(day.id);
        setName(day.name);
        setFocus(day.focus);
        setItems(day.items.map((it) => draftFrom(it.exerciseId, it.sets, it.repLow, it.repHigh)));
        setReady(true);
        return;
      }
    }
    const qp =
      typeof window !== "undefined"
        ? new URLSearchParams(window.location.search)
        : null;
    const from = qp?.get("from") ?? null;
    if (from) {
      const meta = sessionTemplate(from);
      if (meta) {
        setName(`${meta.name} (eigene)`);
        setFocus(meta.focus);
      }
      setItems(sessionOf(from).map((s) => draftFrom(s.ex.id, s.ex.sets, s.ex.repLow, s.ex.repHigh)));
    }
    if (qp?.get("coach") === "1") setCoachOpen(true);
    setReady(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, loading, id, days]);

  const resolved = useMemo(
    () =>
      items
        .map((it) => {
          const base = byId.get(it.exerciseId);
          if (!base) return null;
          return {
            ex: { ...base, sets: it.sets, repLow: it.repLow, repHigh: it.repHigh },
            sets: it.sets,
          };
        })
        .filter((r): r is { ex: Exercise; sets: number } => r !== null),
    [items, byId],
  );

  const duration = useMemo(() => {
    const slots: ResolvedSlot[] = resolved.map((r, i) => ({
      ex: r.ex,
      slotKey: String(i),
      pool: [],
    }));
    return estimateSessionMin(slots);
  }, [resolved]);

  const dnaAxes = useMemo(
    () => sessionRadarAxes(exerciseMuscleVolume(resolved)),
    [resolved],
  );

  const save = () => {
    if (!name.trim() || !items.length) return;
    const day: WorkoutDay = {
      id: editId ?? "day_" + Date.now(),
      name: name.trim(),
      focus: focus.trim() || "Eigener Tag",
      items: items.map((it) => ({
        exerciseId: it.exerciseId,
        sets: it.sets,
        repLow: it.repLow,
        repHigh: it.repHigh,
      })),
      createdAt: days.find((d) => d.id === editId)?.createdAt ?? new Date().toISOString(),
    };
    if (editId) updateDay(day);
    else addDay(day);
    router.push("/plan");
  };

  const runCoach = async () => {
    if (coachBusy) return;
    setCoachErr("");
    setCoachBusy(true);
    try {
      const has = (k: string) => (equip as string[]).includes(k);
      const exercises = allLib
        .filter((e) => reqOk(e, has))
        .map((e) => ({ id: e.id, name: e.name, pattern: PATTERN_LABEL[e.pattern] }));
      const res = await fetch("/api/coach/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          minutes: coachMin,
          focus: coachFocus,
          exercises,
          context: buildCoachContext({ log, allLib, body, cardio }),
          persona: athletePersona(effectiveProfile(settings, body), settings.userName),
        }),
      });
      const j = (await res.json()) as
        | { configured?: boolean }
        | { ok: true; day: { name: string; focus: string; items: DayItem[] } }
        | { ok: false; error?: string };
      if ("configured" in j && j.configured === false) {
        setCoachNotConfigured(true);
        return;
      }
      if ("ok" in j && j.ok) {
        setName(j.day.name);
        setFocus(j.day.focus);
        setItems(
          j.day.items.map((it) =>
            draftFrom(it.exerciseId, it.sets, it.repLow, it.repHigh),
          ),
        );
        tap();
        setCoachOpen(false);
        return;
      }
      setCoachErr(
        ("ok" in j && !j.ok && j.error) ||
          "Hat nicht geklappt. Versuch es nochmal.",
      );
    } catch {
      setCoachErr("Coach nicht erreichbar. Versuch es gleich nochmal.");
    } finally {
      setCoachBusy(false);
    }
  };

  const swapItem = items.find((it) => it.key === swapKey);
  const swapEx = swapItem ? byId.get(swapItem.exerciseId) : undefined;
  const swapPool = swapEx ? allLib.filter((e) => e.pattern === swapEx.pattern) : [];

  return (
    <div>
      <Pressable
        onClick={() => router.push("/plan")}
        className="mb-4 flex items-center gap-1 rounded-md px-1 py-1 text-sm text-muted focus:outline-none"
      >
        <ArrowLeft size={18} /> Plan
      </Pressable>

      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Name des Tages"
        className="w-full rounded-xl bg-surface-2 px-3 py-2.5 font-display text-xl font-semibold tracking-tight text-fg placeholder:font-sans placeholder:text-base placeholder:font-normal placeholder:text-faint focus:outline-none focus:ring-2 focus:ring-accent-sessions"
      />
      <input
        value={focus}
        onChange={(e) => setFocus(e.target.value)}
        placeholder="Fokus (z. B. Oberkörper, Push)"
        className="mt-2 w-full rounded-xl bg-surface-2 px-3 py-2.5 text-sm text-fg placeholder:text-faint focus:outline-none focus:ring-2 focus:ring-accent-sessions"
      />

      <Pressable
        onClick={() => {
          setCoachErr("");
          setCoachOpen(true);
        }}
        className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-surface-3 bg-surface-1 py-2.5 text-sm font-medium text-accent-2 shadow-card focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-sessions"
      >
        <Sparkles size={16} strokeWidth={2.5} /> Coach-Vorschlag
      </Pressable>

      {/* Live instrument readouts */}
      <Card variant="elevated" className="edge-top mt-4 rounded-card p-5">
        <BalanceRadar axes={dnaAxes} />
        <div className="mt-4 flex items-center justify-center gap-10 border-t border-surface-3 pt-4">
          <Readout eyebrow="Dauer" value={duration} unit="Min" size="md" />
          <Readout eyebrow="Übungen" value={items.length} size="md" count={false} />
        </div>
      </Card>

      <p className="mb-2 mt-5 px-1 font-mono text-xs uppercase tracking-widest text-muted">
        Übungen · ziehen zum Sortieren
      </p>

      {items.length === 0 ? (
        <Card className="p-6 text-center">
          <p className="text-sm text-muted">Noch keine Übung. Füge unten welche hinzu.</p>
        </Card>
      ) : (
        <Reorder.Group axis="y" values={items} onReorder={setItems} className="space-y-2">
          {items.map((it) => (
            <ItemRow
              key={it.key}
              item={it}
              ex={byId.get(it.exerciseId)}
              onChange={(next) => setItems((arr) => arr.map((x) => (x.key === it.key ? next : x)))}
              onSwap={() => setSwapKey(it.key)}
              onRemove={() => {
                tap();
                setItems((arr) => arr.filter((x) => x.key !== it.key));
              }}
            />
          ))}
        </Reorder.Group>
      )}

      <Pressable
        onClick={() => setAddOpen(true)}
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-card border border-surface-3 bg-surface-1 py-3 text-sm font-medium text-accent-ink shadow-card focus:outline-none"
      >
        <Plus size={16} strokeWidth={2.5} /> Übung hinzufügen
      </Pressable>

      <Pressable
        onClick={save}
        disabled={!name.trim() || !items.length}
        className="mt-5 flex w-full items-center justify-center gap-2 rounded-card bg-strong py-4 text-lg font-semibold text-on-strong shadow-card-lg focus:outline-none disabled:opacity-40"
      >
        <Check size={18} strokeWidth={2.5} /> Tag speichern
      </Pressable>

      {/* Add exercise (whole library) */}
      <ExercisePicker
        open={addOpen}
        onClose={() => setAddOpen(false)}
        pool={allLib}
        currentId=""
        onPick={(exId) => {
          tap();
          setItems((arr) => [...arr, draftFrom(exId)]);
          setAddOpen(false);
        }}
      />

      {/* Swap one item (same movement pattern) */}
      <ExercisePicker
        open={swapKey !== null}
        onClose={() => setSwapKey(null)}
        pool={swapPool}
        currentId={swapItem?.exerciseId ?? ""}
        onPick={(exId) => {
          setItems((arr) =>
            arr.map((x) => (x.key === swapKey ? { ...x, exerciseId: exId } : x)),
          );
          setSwapKey(null);
        }}
      />

      {/* KI-Coach: build a session by time + focus, prefilled into the builder */}
      <Sheet open={coachOpen} onClose={() => setCoachOpen(false)} title="Coach-Vorschlag">
        {coachNotConfigured ? (
          <div className="space-y-4 pb-2">
            <p className="text-sm leading-relaxed text-muted">
              Damit der Coach Einheiten baut, muss in Vercel der Schlüssel
              <span className="font-mono text-fg"> ANTHROPIC_API_KEY </span>
              hinterlegt sein. Danach läuft alles serverseitig — dein Schlüssel
              bleibt geheim.
            </p>
            <Pressable
              onClick={() => setCoachOpen(false)}
              className="flex w-full items-center justify-center rounded-xl bg-surface-2 py-2.5 text-sm font-medium text-fg focus:outline-none"
            >
              Verstanden
            </Pressable>
          </div>
        ) : (
          <div className="space-y-5 pb-2">
            <p className="text-sm leading-relaxed text-muted">
              Sag dem Coach Zeit und Fokus — er baut eine rückenschonende Einheit
              aus deinem aktiven Gym, die du danach hier anpassen kannst.
            </p>

            <div>
              <p className="mb-2 font-mono text-xs uppercase tracking-widest text-muted">
                Zeit
              </p>
              <div className="flex flex-wrap gap-2">
                {COACH_TIMES.map((m) => {
                  const active = coachMin === m;
                  return (
                    <Pressable
                      key={m}
                      onClick={() => setCoachMin(m)}
                      className={
                        "rounded-full px-4 py-2 text-sm font-medium tabular-nums focus:outline-none " +
                        (active ? "bg-strong text-on-strong" : "bg-surface-2 text-muted")
                      }
                    >
                      {m} Min
                    </Pressable>
                  );
                })}
              </div>
            </div>

            <div>
              <p className="mb-2 font-mono text-xs uppercase tracking-widest text-muted">
                Fokus
              </p>
              <div className="flex flex-wrap gap-2">
                {COACH_FOCI.map((f) => {
                  const active = coachFocus === f;
                  return (
                    <Pressable
                      key={f}
                      onClick={() => setCoachFocus(f)}
                      className={
                        "rounded-full px-4 py-2 text-sm font-medium focus:outline-none " +
                        (active ? "bg-strong text-on-strong" : "bg-surface-2 text-muted")
                      }
                    >
                      {f}
                    </Pressable>
                  );
                })}
              </div>
              <input
                value={coachFocus}
                onChange={(e) => setCoachFocus(e.target.value)}
                placeholder="… oder eigenen Fokus eintippen"
                className="mt-2 w-full rounded-xl bg-surface-2 px-3 py-2.5 text-sm text-fg placeholder:text-faint focus:outline-none focus:ring-2 focus:ring-accent-sessions"
              />
            </div>

            {coachErr && <p className="text-sm text-rose-300">{coachErr}</p>}

            <Pressable
              onClick={runCoach}
              disabled={coachBusy}
              className="flex w-full items-center justify-center gap-2 rounded-card bg-strong py-3.5 text-base font-semibold text-on-strong focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-sessions disabled:opacity-50"
            >
              <Sparkles size={18} strokeWidth={2.5} />
              {coachBusy ? "Baut deine Einheit…" : "Einheit bauen"}
            </Pressable>
          </div>
        )}
      </Sheet>
    </div>
  );
}
