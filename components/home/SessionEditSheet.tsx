"use client";

import { ArrowDown, ArrowLeftRight, ArrowUp, Minus, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { ExercisePicker } from "@/components/workout/ExercisePicker";
import { Pressable } from "@/components/ui/pressable";
import { Sheet } from "@/components/ui/sheet";
import { useTraining } from "@/components/providers/TrainingProvider";
import { addPoolFor, swapPoolFor } from "@/lib/swap-pool";
import {
  addItem,
  moveItem,
  removeItem,
  setItemSets,
  swapItem,
  type DailySession,
} from "@/lib/session-model";
import type { Exercise } from "@/lib/types";

/**
 * Die heutige Einheit frei umbauen: Übungen tauschen (aus dem GESAMTEN
 * verfügbaren Katalog), entfernen, verschieben, Sätze ändern, beliebige
 * Übungen ergänzen. Jede Änderung markiert die Einheit als „angepasst” —
 * eine später eintreffende KI-Antwort überschreibt sie dann nicht mehr.
 */
export function SessionEditSheet({
  open,
  onClose,
  session,
  allLib,
  has,
  onChange,
}: {
  open: boolean;
  onClose: () => void;
  session: DailySession;
  allLib: Exercise[];
  has: (k: string) => boolean;
  onChange: (next: DailySession) => void;
}) {
  const byId = useMemo(() => new Map(allLib.map((e) => [e.id, e])), [allLib]);
  const { disabledExercises } = useTraining();
  const [swapFor, setSwapFor] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  // Pool-Politik lebt geteilt in lib/swap-pool (auch der Schnell-Tausch in
  // der Trainings-Bühne nutzt sie) — Verhalten unverändert.
  const swapPool = useMemo(
    () =>
      swapFor ? swapPoolFor(session, swapFor, allLib, has, disabledExercises) : [],
    [swapFor, session, allLib, has, disabledExercises],
  );

  const addPool = useMemo(
    () => addPoolFor(session, allLib, has, disabledExercises),
    [session, allLib, has, disabledExercises],
  );

  return (
    <>
      <Sheet open={open} onClose={onClose} title="Einheit bearbeiten">
        <div className="space-y-2">
          {session.items.map((it, i) => {
            const ex = byId.get(it.exerciseId);
            if (!ex) return null;
            return (
              <div key={it.id} className="rounded-inner bg-surface-0 p-3">
                <div className="flex items-start gap-2">
                  <span className="mt-0.5 w-6 shrink-0 text-sm tabular-nums text-faint">
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p
                      data-testid="edit-row-name"
                      className="text-base font-semibold leading-snug text-fg"
                    >
                      {ex.name}
                    </p>
                    {/* Bereich je Satz in der Kopfzeile — in der Zeile mit
                        den Knöpfen brach er auf schmalen iPhones um. */}
                    <p className="mt-0.5 whitespace-nowrap text-sm tabular-nums text-muted">
                      {it.repLow}
                      {it.repHigh > it.repLow ? `–${it.repHigh}` : ""}{" "}
                      {ex.unit === "Sek" ? "s" : "Wdh"} je Satz
                    </p>
                  </div>
                  <Pressable
                    onClick={() => onChange(moveItem(session, it.id, -1))}
                    disabled={i === 0}
                    aria-label="Nach oben"
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-pill text-fg focus:outline-none focus-visible:ring-2 focus-visible:ring-fokus disabled:opacity-30"
                  >
                    <ArrowUp size={18} />
                  </Pressable>
                  <Pressable
                    onClick={() => onChange(moveItem(session, it.id, 1))}
                    disabled={i === session.items.length - 1}
                    aria-label="Nach unten"
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-pill text-fg focus:outline-none focus-visible:ring-2 focus-visible:ring-fokus disabled:opacity-30"
                  >
                    <ArrowDown size={18} />
                  </Pressable>
                </div>
                <div className="mt-2 flex items-center gap-2 pl-8">
                  <div className="flex items-center rounded-pill bg-surface-2">
                    <Pressable
                      onClick={() => onChange(setItemSets(session, it.id, it.sets - 1))}
                      disabled={it.sets <= 1}
                      aria-label="Ein Satz weniger"
                      className="flex h-10 w-10 items-center justify-center rounded-pill text-fg focus:outline-none focus-visible:ring-2 focus-visible:ring-fokus disabled:opacity-30"
                    >
                      <Minus size={16} />
                    </Pressable>
                    <span className="min-w-14 text-center text-sm font-semibold tabular-nums text-fg">
                      {it.sets} {it.sets === 1 ? "Satz" : "Sätze"}
                    </span>
                    <Pressable
                      onClick={() => onChange(setItemSets(session, it.id, it.sets + 1))}
                      disabled={it.sets >= 6}
                      aria-label="Ein Satz mehr"
                      className="flex h-10 w-10 items-center justify-center rounded-pill text-fg focus:outline-none focus-visible:ring-2 focus-visible:ring-fokus disabled:opacity-30"
                    >
                      <Plus size={16} />
                    </Pressable>
                  </div>
                  <Pressable
                    onClick={() => setSwapFor(it.id)}
                    aria-label={`${ex.name} tauschen`}
                    className="ml-auto flex min-h-10 items-center gap-1.5 rounded-pill border border-line px-3 text-sm font-semibold text-fg focus:outline-none focus-visible:ring-2 focus-visible:ring-fokus"
                  >
                    <ArrowLeftRight size={15} aria-hidden /> Tauschen
                  </Pressable>
                  <Pressable
                    onClick={() => onChange(removeItem(session, it.id))}
                    disabled={session.items.length <= 1}
                    aria-label={`${ex.name} entfernen`}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-pill text-gefahr focus:outline-none focus-visible:ring-2 focus-visible:ring-fokus disabled:opacity-30"
                  >
                    <Trash2 size={18} />
                  </Pressable>
                </div>
              </div>
            );
          })}
        </div>

        <Pressable
          onClick={() => setAdding(true)}
          className="mt-3 flex min-h-12 w-full items-center justify-center gap-2 rounded-pill border border-line text-base font-semibold text-fg focus:outline-none focus-visible:ring-2 focus-visible:ring-fokus"
        >
          <Plus size={18} aria-hidden /> Übung hinzufügen
        </Pressable>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Zur Auswahl steht der komplette Katalog, gefiltert auf deine Geräte.
        </p>
      </Sheet>

      <ExercisePicker
        open={!!swapFor}
        onClose={() => setSwapFor(null)}
        pool={swapPool}
        currentId={
          session.items.find((it) => it.id === swapFor)?.exerciseId ?? ""
        }
        onPick={(id) => {
          const ex = byId.get(id);
          if (ex && swapFor) onChange(swapItem(session, swapFor, ex));
          setSwapFor(null);
        }}
      />
      <ExercisePicker
        open={adding}
        onClose={() => setAdding(false)}
        pool={addPool}
        currentId=""
        onPick={(id) => {
          const ex = byId.get(id);
          if (ex) onChange(addItem(session, ex));
          setAdding(false);
        }}
      />
    </>
  );
}
