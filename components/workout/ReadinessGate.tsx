"use client";

import { Bike, ShieldAlert } from "lucide-react";
import { useState } from "react";
import { JumpCheck } from "@/components/workout/JumpCheck";
import { Pressable } from "@/components/ui/pressable";
import { Sheet } from "@/components/ui/sheet";
import { Toggle } from "@/components/ui/Toggle";
import { useTraining } from "@/components/providers/TrainingProvider";
import { jumpBaseline } from "@/lib/jump";
import { readinessScore } from "@/lib/readiness";
import { cn } from "@/lib/utils";
import type { Readiness } from "@/lib/types";

const ROWS = [
  { key: "sleep", label: "Schlaf" },
  { key: "energy", label: "Energie" },
  { key: "back", label: "Rücken" },
] as const;
const OPTS = [
  { v: 1, label: "schlecht" },
  { v: 2, label: "ok" },
  { v: 3, label: "gut" },
] as const;

export function ReadinessGate({
  open,
  onClose,
  onSubmit,
  onReset,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (r: Readiness, spareBack: boolean) => void;
  /** Direkt zur gewichtsfreien Reset-Einheit wechseln (Rücken „schlecht"). */
  onReset?: () => void;
}) {
  const { cardioAdvice, jumps, addJump, backSpareToday, lastBackRed } = useTraining();
  const [vals, setVals] = useState<{ sleep?: number; energy?: number; back?: number }>({});
  const complete = !!vals.sleep && !!vals.energy && !!vals.back;
  // „Rücken heute schonen": abgeleitet vorbelegt (Komponente überlebt das
  // Schließen des Sheets) — aktiv, wenn schon eingeschaltet (Home-Chip) oder
  // der Rücken „schlecht" bewertet ist. Hand schlägt Automatik.
  const [spareOverride, setSpareOverride] = useState<boolean | null>(null);
  const spareBack = spareOverride ?? (backSpareToday || vals.back === 1);

  const submit = () => {
    if (!complete) return;
    const base = { sleep: vals.sleep!, energy: vals.energy!, back: vals.back! };
    onSubmit({ ...base, score: readinessScore(base) } as Readiness, spareBack);
  };

  return (
    <Sheet open={open} onClose={onClose} title="Tagesform">
      <p className="mb-4 text-sm text-muted">
        Kurz einschätzen — die Einheit passt sich an.
      </p>
      {/* Zünd-Check: gemessene Tagesform — das Ergebnis setzt die
          Energie-Ampel automatisch (bleibt von Hand übersteuerbar). */}
      <JumpCheck
        baseline={jumpBaseline(jumps)}
        onResult={(heightCm, jb) => {
          addJump(heightCm);
          if (jb) {
            setVals((v) => ({ ...v, energy: jb === "low" ? 1 : jb === "high" ? 3 : 2 }));
          }
        }}
      />
      {cardioAdvice.level !== "none" && (
        <div className="mb-4 flex items-start gap-2 rounded-card bg-surface-2 p-3">
          <Bike size={15} className="mt-0.5 shrink-0 text-accent-coverage" />
          <p className="text-xs leading-relaxed text-muted">{cardioAdvice.body}</p>
        </div>
      )}
      <div className="space-y-3">
        {ROWS.map((row) => (
          <div key={row.key}>
            <p className="mb-1.5 text-sm text-muted">{row.label}</p>
            <div className="flex gap-2">
              {OPTS.map((o) => (
                <Pressable
                  key={o.v}
                  onClick={() => setVals((v) => ({ ...v, [row.key]: o.v }))}
                  className={cn(
                    "flex-1 rounded-card py-2.5 text-sm focus:outline-none",
                    vals[row.key] === o.v
                      ? "bg-accent-sessions text-on-accent"
                      : "bg-surface-2 text-muted",
                  )}
                >
                  {o.label}
                </Pressable>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 border-t border-line pt-4">
        {lastBackRed ? (
          // Rote Ampel der letzten Einheit erzwingt die Schonung ohnehin —
          // ein abschaltbar wirkender Toggle wäre gelogen.
          <p className="flex items-center gap-1.5 font-mono text-xs text-status-over">
            <ShieldAlert size={13} aria-hidden /> Rückenschonung aktiv — letzte Einheit „rot“
          </p>
        ) : (
          <Toggle
            checked={spareBack}
            onChange={setSpareOverride}
            label="Rücken heute schonen"
            hint="Heute rückenfreundliche Alternativen: Rumpf stabilisierend statt belastend, keine schweren Hüft- und Beugemuster."
          />
        )}
      </div>
      {onReset && vals.back === 1 && (
        <Pressable
          onClick={onReset}
          className="mt-4 w-full rounded-card bg-surface-2 py-3 text-sm font-medium text-accent-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-sessions"
        >
          Stattdessen: Rücken-Reset — ganz ohne Gewichte
        </Pressable>
      )}
      <Pressable
        onClick={submit}
        disabled={!complete}
        className="mt-5 w-full rounded-card bg-strong py-3.5 text-base font-semibold text-on-strong focus:outline-none disabled:opacity-40"
      >
        Los geht&apos;s
      </Pressable>
      <Pressable
        onClick={onClose}
        className="mt-2 w-full rounded-card py-2.5 text-sm text-muted focus:outline-none"
      >
        Überspringen
      </Pressable>
    </Sheet>
  );
}
