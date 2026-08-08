"use client";

import { ArrowDown, ArrowUp, Minus, Plus, Repeat, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { ExercisePicker } from "@/components/workout/ExercisePicker";
import { Pressable } from "@/components/ui/pressable";
import { Sheet } from "@/components/ui/sheet";
import { reqOk } from "@/lib/progression";
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
  const [swapFor, setSwapFor] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  const available = useMemo(
    () => allLib.filter((e) => e.pattern !== "cardio" && reqOk(e, has)),
    [allLib, has],
  );
  const usedIds = new Set(session.items.map((it) => it.exerciseId));

  // Tausch-Pool: gleiches Muster zuerst (naheliegende Alternativen), danach
  // der ganze Rest des Katalogs — freie Wahl statt Muster-Korsett.
  const swapPool = useMemo(() => {
    if (!swapFor) return [];
    const cur = byId.get(session.items.find((it) => it.id === swapFor)?.exerciseId ?? "");
    const rest = available.filter((e) => !usedIds.has(e.id) || e.id === cur?.id);
    if (!cur) return rest;
    return [
      ...rest.filter((e) => e.pattern === cur.pattern),
      ...rest.filter((e) => e.pattern !== cur.pattern),
    ];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [swapFor, available, session.items]);

  const addPool = useMemo(
    () => available.filter((e) => !usedIds.has(e.id)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [available, session.items],
  );

  return (
    <>
      <Sheet open={open} onClose={onClose} title="Einheit bearbeiten">
        <div className="space-y-2">
          {session.items.map((it, i) => {
            const ex = byId.get(it.exerciseId);
            if (!ex) return null;
            return (
              <div
                key={it.id}
                className="rounded-card border border-line bg-surface-1 p-3"
              >
                <div className="flex items-center gap-2">
                  <span className="w-5 shrink-0 font-mono text-xs tabular-nums text-faint">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-fg">
                    {ex.name}
                  </span>
                  <Pressable
                    onClick={() => onChange(moveItem(session, it.id, -1))}
                    disabled={i === 0}
                    aria-label="Nach oben"
                    className="rounded-full p-1.5 text-muted focus:outline-none disabled:opacity-30"
                  >
                    <ArrowUp size={15} />
                  </Pressable>
                  <Pressable
                    onClick={() => onChange(moveItem(session, it.id, 1))}
                    disabled={i === session.items.length - 1}
                    aria-label="Nach unten"
                    className="rounded-full p-1.5 text-muted focus:outline-none disabled:opacity-30"
                  >
                    <ArrowDown size={15} />
                  </Pressable>
                </div>
                <div className="mt-2 flex items-center gap-2 pl-7">
                  <span className="font-mono text-xs text-faint">Sätze</span>
                  <Pressable
                    onClick={() => onChange(setItemSets(session, it.id, it.sets - 1))}
                    disabled={it.sets <= 1}
                    aria-label="Ein Satz weniger"
                    className="rounded-full bg-surface-2 p-1.5 text-fg focus:outline-none disabled:opacity-30"
                  >
                    <Minus size={13} />
                  </Pressable>
                  <span className="w-5 text-center font-mono text-sm tabular-nums text-fg">
                    {it.sets}
                  </span>
                  <Pressable
                    onClick={() => onChange(setItemSets(session, it.id, it.sets + 1))}
                    disabled={it.sets >= 6}
                    aria-label="Ein Satz mehr"
                    className="rounded-full bg-surface-2 p-1.5 text-fg focus:outline-none disabled:opacity-30"
                  >
                    <Plus size={13} />
                  </Pressable>
                  <span className="font-mono text-xs tabular-nums text-faint">
                    × {it.repLow}
                    {it.repHigh > it.repLow ? `–${it.repHigh}` : ""}
                    {ex.unit === "Sek" ? " s" : ""}
                  </span>
                  <Pressable
                    onClick={() => setSwapFor(it.id)}
                    aria-label={`${ex.name} tauschen`}
                    className="ml-auto flex items-center gap-1 rounded-pill bg-surface-2 px-2.5 py-1.5 text-xs font-medium text-fg focus:outline-none"
                  >
                    <Repeat size={12} /> Tauschen
                  </Pressable>
                  <Pressable
                    onClick={() => onChange(removeItem(session, it.id))}
                    disabled={session.items.length <= 1}
                    aria-label={`${ex.name} entfernen`}
                    className="rounded-full p-1.5 text-status-danger focus:outline-none disabled:opacity-30"
                  >
                    <Trash2 size={14} />
                  </Pressable>
                </div>
              </div>
            );
          })}
        </div>

        <Pressable
          onClick={() => setAdding(true)}
          className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-card bg-surface-2 py-3 text-sm font-medium text-fg focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-sessions"
        >
          <Plus size={15} /> Übung hinzufügen
        </Pressable>
        <p className="mt-2 text-xs leading-relaxed text-faint">
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
