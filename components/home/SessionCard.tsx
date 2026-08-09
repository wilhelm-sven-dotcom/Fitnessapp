"use client";

import { Pencil, Play, RefreshCw, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Pressable } from "@/components/ui/pressable";
import { WishBar } from "@/components/home/WishBar";
import { muscleOf, MUSCLE_LABEL } from "@/lib/volume";
import { tap } from "@/lib/haptics";
import { cn } from "@/lib/utils";
import type { DailySession } from "@/lib/session-model";
import type { Exercise } from "@/lib/types";

const BUDGETS = [20, 25, 30, 45, 60, 75, 90];

const SOURCE_BADGE: Record<DailySession["source"], string> = {
  atlas: "von ATLAS komponiert",
  fallback: "Basis-Plan (ATLAS offline)",
  manuell: "von dir zusammengestellt",
};

/**
 * Das Herzstück der Startseite: die heutige Einheit — vollständig sichtbar
 * (jede Übung mit Sätzen, Muskel und ATLAS-Warum), editierbar und mit EINEM
 * kräftigen Start-Moment. Kein Springen: alles Wichtige steht hier.
 */
export function SessionCard({
  session,
  allLib,
  estimatedMin,
  budgetMin,
  onBudget,
  onStart,
  onEdit,
  onRegenerate,
  regenerating,
  locked,
  spareSlot,
}: {
  session: DailySession;
  allLib: Exercise[];
  estimatedMin: number;
  budgetMin: number;
  onBudget: (min: number) => void;
  onStart: () => void;
  onEdit: () => void;
  /** Neu komponieren, optional mit Wunsch-Text. */
  onRegenerate: (wish?: string) => void;
  regenerating?: boolean;
  /** Einheit läuft bereits — Umbau gesperrt, Start wird „Fortsetzen”. */
  locked?: boolean;
  /** Slot für den „Rücken schonen”-Toggle der Startseite. */
  spareSlot?: React.ReactNode;
}) {
  const byId = new Map(allLib.map((e) => [e.id, e]));

  return (
    <Card variant="elevated" className="mb-4 overflow-hidden rounded-card p-6">
      <p className="mb-1 flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-live">
        ▸ Deine Einheit heute
      </p>
      <h2 className="font-display text-3xl font-bold leading-tight tracking-tight text-fg">
        {session.name}
      </h2>
      <p className="mt-1 flex flex-wrap items-center gap-x-2 font-mono text-xs text-faint">
        <span className="tabular-nums">
          {session.items.length} Übungen · ~{estimatedMin} Min
        </span>
        <span aria-hidden>·</span>
        <span className="flex items-center gap-1">
          <Sparkles size={11} aria-hidden /> {SOURCE_BADGE[session.source]}
          {session.edited ? " · angepasst" : ""}
        </span>
      </p>

      {session.briefing && (
        <p className="mt-3 text-sm leading-relaxed text-muted">{session.briefing}</p>
      )}

      {/* Die Übungsliste — vollständig, mit Warum. Klarheit statt Überraschung. */}
      <ol className="mt-4 space-y-2.5">
        {session.items.map((it, i) => {
          const ex = byId.get(it.exerciseId);
          if (!ex) return null;
          const m = muscleOf(ex);
          return (
            <li key={it.id} className="flex gap-3">
              <span className="mt-0.5 w-5 shrink-0 font-mono text-xs tabular-nums text-faint">
                {String(i + 1).padStart(2, "0")}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-x-2">
                  <span className="text-sm font-medium text-fg">{ex.name}</span>
                  <span className="font-mono text-xs tabular-nums text-muted">
                    {it.sets} × {it.repLow}
                    {it.repHigh > it.repLow ? `–${it.repHigh}` : ""}
                    {ex.unit === "Sek" ? " s" : ""}
                  </span>
                  <span className="rounded-pill bg-surface-2 px-1.5 py-0.5 font-mono text-xs text-muted">
                    {MUSCLE_LABEL[m.primary]}
                  </span>
                </div>
                {it.why && (
                  <p className="mt-0.5 text-xs leading-snug text-faint">{it.why}</p>
                )}
              </div>
            </li>
          );
        })}
      </ol>

      {/* Zeitbudget — steuert Komposition und Auto-Anpassung. */}
      <div className="mt-5 flex flex-wrap items-center gap-1.5">
        <span className="mr-1 font-mono text-xs uppercase tracking-widest text-faint">
          Zeit
        </span>
        {BUDGETS.map((b) => (
          <Pressable
            key={b}
            onClick={() => onBudget(b)}
            aria-label={`Zeitbudget ${b} Minuten`}
            aria-pressed={budgetMin === b}
            className={cn(
              "rounded-pill px-3 py-2 text-xs font-medium tabular-nums focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-sessions",
              budgetMin === b ? "bg-accent-sessions text-on-accent" : "bg-surface-2 text-muted",
            )}
          >
            {b}
          </Pressable>
        ))}
      </div>

      {spareSlot && <div className="mt-4">{spareSlot}</div>}

      <Pressable
        onClick={() => {
          tap();
          onStart();
        }}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-card bg-accent-sessions py-4 text-lg font-bold text-on-accent shadow-card-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-sessions"
      >
        <Play size={18} strokeWidth={2.5} /> {locked ? "Training fortsetzen" : "Training starten"}
      </Pressable>

      {!locked && (
        <div className="mt-3 space-y-2 border-t border-line pt-3">
          <div className="flex items-center gap-2">
            <Pressable
              onClick={onEdit}
              className="flex items-center gap-1.5 rounded-pill bg-surface-2 px-3 py-2 text-xs font-medium text-fg focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-sessions"
            >
              <Pencil size={13} /> Bearbeiten
            </Pressable>
            <Pressable
              onClick={() => onRegenerate()}
              disabled={regenerating}
              className="flex items-center gap-1.5 rounded-pill bg-surface-2 px-3 py-2 text-xs font-medium text-fg focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-sessions disabled:opacity-50"
            >
              <RefreshCw size={13} className={regenerating ? "opacity-50" : undefined} />
              {regenerating ? "ATLAS komponiert…" : "Neu komponieren"}
            </Pressable>
          </div>
          <WishBar onSubmit={(wish) => onRegenerate(wish)} disabled={regenerating} />
        </div>
      )}
    </Card>
  );
}
