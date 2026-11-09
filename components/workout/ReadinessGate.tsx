"use client";

import { Bike, ShieldAlert } from "lucide-react";
import { useMemo, useState } from "react";
import { JumpCheck } from "@/components/workout/JumpCheck";
import { Button } from "@/components/ui/Button";
import { Segment } from "@/components/ui/Segment";
import { Sheet } from "@/components/ui/sheet";
import { Toggle } from "@/components/ui/Toggle";
import { useTraining } from "@/components/providers/TrainingProvider";
import { jumpBaseline } from "@/lib/jump";
import { lastReadiness, readinessScore } from "@/lib/readiness";
import type { Readiness } from "@/lib/types";

type Stufe = 1 | 2 | 3;

const ROWS = [
  { key: "sleep", label: "Schlaf" },
  { key: "energy", label: "Energie" },
  { key: "back", label: "Rücken" },
] as const;
const OPTS = [
  { value: 1, label: "schlecht" },
  { value: 2, label: "ok" },
  { value: 3, label: "gut" },
] as const;

/**
 * Check-in vor der Einheit. Vorbelegt mit der Tagesform der letzten Einheit
 * (≤ 7 Tage), sonst mit der mittleren Stufe (keine Anpassung) — der Knopf ist
 * sofort aktiv, man tippt nur an, was heute anders ist.
 */
export function ReadinessGate({
  open,
  onClose,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (r: Readiness, spareBack: boolean) => void;
}) {
  const { cardioAdvice, jumps, addJump, backSpareToday, lastBackRed, log } = useTraining();
  const zuletzt = useMemo(() => lastReadiness(log), [log]);
  const [vals, setVals] = useState<{ sleep: Stufe; energy: Stufe; back: Stufe }>(() => ({
    sleep: zuletzt?.sleep ?? 2,
    energy: zuletzt?.energy ?? 2,
    back: zuletzt?.back ?? 2,
  }));
  // Schonung schaltet sich nur über eine HEUTE angetippte Rücken-Wertung
  // ein — eine übernommene „schlecht“-Vorbelegung von neulich nicht.
  const [backGetippt, setBackGetippt] = useState(false);
  const [spareOverride, setSpareOverride] = useState<boolean | null>(null);
  const spareBack = spareOverride ?? (backSpareToday || (backGetippt && vals.back === 1));

  const submit = () => {
    onSubmit({ ...vals, score: readinessScore(vals) }, spareBack);
  };

  return (
    <Sheet open={open} onClose={onClose} title="Tagesform">
      <p className="mb-4 text-sm text-muted">
        {zuletzt
          ? "Vorbelegt wie zuletzt. Tippe an, was heute anders ist."
          : "Mittlere Stufe vorbelegt, damit bleibt die Einheit wie geplant. Tippe an, was heute anders ist."}
      </p>
      {/* Sprungtest: gemessene Tagesform — das Ergebnis setzt die Energie
          (bleibt von Hand übersteuerbar). */}
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
        <div className="mb-4 flex items-start gap-2 rounded-inner bg-surface-2 p-3">
          <Bike size={16} className="mt-0.5 shrink-0 text-fg" aria-hidden />
          <p className="text-sm leading-relaxed text-muted">{cardioAdvice.body}</p>
        </div>
      )}
      <div className="space-y-3">
        {ROWS.map((row) => (
          <div key={row.key}>
            <p className="mb-1.5 text-sm font-semibold text-fg">{row.label}</p>
            <Segment
              label={row.label}
              options={OPTS}
              value={vals[row.key]}
              onChange={(v) => {
                if (row.key === "back") setBackGetippt(true);
                setVals((cur) => ({ ...cur, [row.key]: v }));
              }}
            />
          </div>
        ))}
      </div>
      <div className="mt-4 border-t border-line pt-4">
        {lastBackRed ? (
          // Rote Ampel der letzten Einheit erzwingt die Schonung ohnehin —
          // ein abschaltbar wirkender Schalter wäre gelogen.
          <p className="flex items-center gap-1.5 text-sm text-warnung">
            <ShieldAlert size={14} aria-hidden /> Rückenschonung aktiv, letzte Einheit „rot“
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
      <Button size="lg" full onClick={submit} className="mt-5">
        Weiter zum Aufwärmen
      </Button>
      <Button variant="ghost" full onClick={onClose} className="mt-2">
        Überspringen
      </Button>
    </Sheet>
  );
}
