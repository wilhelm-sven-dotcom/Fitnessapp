"use client";

import { ArrowLeft, Save } from "lucide-react";
import { useState } from "react";
import { Pressable } from "@/components/ui/pressable";
import { doneWorkSets } from "@/lib/active-session";
import type { ActiveSessionState } from "@/lib/active-session";
import { cn } from "@/lib/utils";
import type { TrafficLight } from "@/lib/types";

// Selected state as a tinted outline chip — token-pure on both themes.
const BACK_OPTIONS: { v: TrafficLight; label: string; on: string }[] = [
  { v: "green", label: "Gut", on: "border-status-in text-status-in bg-surface-2" },
  { v: "yellow", label: "Mittel", on: "border-status-over text-status-over bg-surface-2" },
  { v: "red", label: "Gereizt", on: "border-status-danger text-status-danger bg-surface-2" },
];

/**
 * Der Abschluss: kurze Rücken-Ampel (steuert die nächste Einheit), optionale
 * Notiz, speichern. Danach übernimmt der Sieger-Moment (SessionComplete).
 */
export function FinishFlow({
  state,
  saving,
  onBack,
  onSave,
}: {
  state: ActiveSessionState;
  saving: boolean;
  onBack: () => void;
  onSave: (backTraffic: TrafficLight | null, note: string) => void;
}) {
  const [back, setBack] = useState<TrafficLight | null>(state.backTraffic ?? null);
  const [note, setNote] = useState(state.note ?? "");
  const done = doneWorkSets(state.entries);

  return (
    <div>
      <Pressable
        onClick={onBack}
        className="mb-4 -ml-2 flex min-h-11 items-center gap-1 rounded-card px-2 py-2 text-sm text-muted focus:outline-none"
      >
        <ArrowLeft size={18} /> Zurück ins Training
      </Pressable>

      <p className="font-mono text-xs uppercase tracking-widest text-accent-2">
        Abschluss
      </p>
      <h2 className="mt-1 font-display text-2xl font-semibold tracking-tight text-fg">
        {state.session.name}
      </h2>
      <p className="mt-1 text-sm text-muted">
        {done === 0
          ? "Noch keine Sätze protokolliert — Beenden speichert nichts."
          : `${done} ${done === 1 ? "Satz" : "Sätze"} protokolliert.`}
      </p>

      <div className="mt-5 rounded-card border border-line bg-surface-1 p-4 shadow-card">
        <p className="text-sm font-medium text-fg">
          Wie fühlt sich dein unterer Rücken an?
        </p>
        <p className="mb-3 mt-0.5 text-xs text-muted">
          Kurz einschätzen — steuert die nächste Einheit.
        </p>
        <div className="flex gap-2">
          {BACK_OPTIONS.map((o) => (
            <Pressable
              key={o.v}
              onClick={() => setBack((b) => (b === o.v ? null : o.v))}
              className={cn(
                "flex-1 rounded-card border py-3 text-sm font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-ink",
                back === o.v ? o.on : "border-transparent bg-surface-2 text-muted",
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
          className="mt-4 w-full resize-none rounded-card bg-surface-2 px-3 py-2.5 text-sm text-fg placeholder:text-faint focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-sessions"
        />
      </div>

      <Pressable
        onClick={() => onSave(back, note)}
        disabled={saving}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-card bg-strong py-4 text-lg font-semibold text-on-strong focus:outline-none disabled:opacity-60"
      >
        <Save size={18} strokeWidth={2.5} />
        {saving
          ? "Speichert…"
          : done === 0
            ? "Training verlassen"
            : "Beenden & speichern"}
      </Pressable>
    </div>
  );
}
