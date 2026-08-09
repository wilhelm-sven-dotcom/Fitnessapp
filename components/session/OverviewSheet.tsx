"use client";

import { Check, Pencil } from "lucide-react";
import { useMemo } from "react";
import { Pressable } from "@/components/ui/pressable";
import { Sheet } from "@/components/ui/sheet";
import { itemDone } from "@/lib/active-session";
import { isFilled } from "@/lib/stats";
import { cn } from "@/lib/utils";
import type { DailySession } from "@/lib/session-model";
import type { Exercise, SetEntry } from "@/lib/types";

/**
 * Die ganze Einheit im Überblick — per Tipp aus dem Kopf des Steppers.
 * Springen ist ein Tap; Umbauen (tauschen/ergänzen/entfernen) öffnet den
 * bekannten Editor. Geloggte Sätze hängen an der Item-Instanz und überleben.
 */
export function OverviewSheet({
  open,
  onClose,
  session,
  allLib,
  entries,
  currentIndex,
  onJump,
  onEdit,
}: {
  open: boolean;
  onClose: () => void;
  session: DailySession;
  allLib: Exercise[];
  entries: Record<string, SetEntry[]>;
  currentIndex: number;
  onJump: (index: number) => void;
  onEdit: () => void;
}) {
  const byId = useMemo(() => new Map(allLib.map((e) => [e.id, e])), [allLib]);

  return (
    <Sheet open={open} onClose={onClose} title={session.name}>
      <p className="mb-3 text-xs text-muted">{session.focus}</p>
      <div className="space-y-1.5">
        {session.items.map((it, i) => {
          const ex = byId.get(it.exerciseId);
          if (!ex) return null;
          const sets = entries[it.id] ?? [];
          const work = sets.filter((s) => !s.warmup);
          const done = work.filter(isFilled).length;
          const finished = itemDone(ex, sets);
          const isCurrent = i === currentIndex;
          return (
            <Pressable
              key={it.id}
              onClick={() => {
                onJump(i);
                onClose();
              }}
              className={cn(
                "flex w-full items-center gap-2 rounded-card border px-3 py-2.5 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-ink",
                isCurrent
                  ? "border-accent-sessions bg-surface-2"
                  : "border-line bg-surface-1",
              )}
            >
              <span
                className={cn(
                  "font-mono text-xs tabular-nums",
                  finished ? "text-status-in" : isCurrent ? "text-accent-ink" : "text-faint",
                )}
              >
                {String(i + 1).padStart(2, "0")}
              </span>
              <span
                className={cn(
                  "min-w-0 flex-1 truncate text-sm",
                  finished ? "text-muted" : "font-medium text-fg",
                )}
              >
                {ex.name}
              </span>
              <span className="shrink-0 font-mono text-xs tabular-nums text-muted">
                {ex.pattern === "cardio"
                  ? finished
                    ? "Erledigt"
                    : `${ex.repLow}–${ex.repHigh} Min`
                  : `${done}/${work.length || it.sets}`}
              </span>
              {finished && (
                <Check size={14} className="shrink-0 text-status-in" aria-hidden />
              )}
            </Pressable>
          );
        })}
      </div>

      <Pressable
        onClick={() => {
          onClose();
          onEdit();
        }}
        className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-card bg-surface-2 py-3 text-sm font-medium text-fg focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-ink"
      >
        <Pencil size={14} /> Einheit umbauen
      </Pressable>
      <p className="mt-2 text-xs leading-relaxed text-faint">
        Tauschen, ergänzen, entfernen — deine geloggten Sätze bleiben erhalten.
      </p>
    </Sheet>
  );
}
