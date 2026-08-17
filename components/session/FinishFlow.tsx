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
  { v: "green", label: "Gut", on: "border-status-in text-status-in" },
  { v: "yellow", label: "Mittel", on: "border-status-over text-status-over" },
  { v: "red", label: "Gereizt", on: "border-status-danger text-status-danger" },
];

/**
 * Die Auswertung: kurze Rücken-Ampel (steuert die nächste Studie), optionale
 * Notiz, archivieren. Danach übernimmt der Sieger-Moment (SessionComplete).
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
        <ArrowLeft size={18} /> Zurück zur Studie
      </Pressable>

      <p className="font-mono text-3xs font-semibold uppercase tracking-gesperrt-3 text-muted">
        Auswertung
      </p>
      <h2 className="mt-1 font-display text-2xl italic text-fg">
        {state.session.name}
      </h2>
      <p className="mt-1 font-mono text-2xs uppercase tracking-gesperrt text-muted">
        {done === 0 ? (
          "Kein Kader belichtet — Beenden speichert nichts."
        ) : (
          <>
            <span className="tabular-nums">{done}</span>{" "}
            {done === 1 ? "Kader" : "Kader"} belichtet.
          </>
        )}
      </p>

      <div className="mt-5 rounded-card border border-line-card bg-surface-1 p-3.5">
        <p className="text-sm font-medium text-fg">
          Wie fühlt sich dein unterer Rücken an?
        </p>
        <p className="mb-3 mt-0.5 text-xs text-muted">
          Kurz einschätzen — steuert die nächste Studie.
        </p>
        <div className="flex gap-2">
          {BACK_OPTIONS.map((o) => (
            <Pressable
              key={o.v}
              onClick={() => setBack((b) => (b === o.v ? null : o.v))}
              className={cn(
                "flex-1 rounded-pill border py-3 font-mono text-xs font-semibold uppercase tracking-gesperrt-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyanotypie",
                back === o.v ? o.on : "border-line text-muted",
              )}
            >
              {o.label}
            </Pressable>
          ))}
        </div>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Notiz zur Platte — wie war's?"
          rows={2}
          className="mt-4 w-full resize-none rounded-pill border border-line bg-transparent px-3 py-2.5 text-base text-fg placeholder:text-faint focus:outline-none focus-visible:ring-2 focus-visible:ring-cyanotypie"
        />
      </div>

      <Pressable
        onClick={() => onSave(back, note)}
        disabled={saving}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-pill bg-accent-sessions py-4 font-mono text-sm font-semibold uppercase tracking-gesperrt-3 text-on-accent active:bg-accent-press focus:outline-none disabled:opacity-60"
      >
        <Save size={18} strokeWidth={2.5} />
        {saving
          ? "Archiviert …"
          : done === 0
            ? "Studie verlassen"
            : "Platte archivieren"}
      </Pressable>
    </div>
  );
}
