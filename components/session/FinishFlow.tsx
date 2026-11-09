"use client";

import { ArrowLeft, Save } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Pressable } from "@/components/ui/pressable";
import { Segment } from "@/components/ui/Segment";
import { itemDone, type ActiveSessionState } from "@/lib/active-session";
import { fmtKg, fmtSatz } from "@/lib/format";
import { REGION_VAR, regionOf } from "@/lib/phasen/band";
import { setMetric } from "@/lib/records";
import { sessionMinutes } from "@/lib/session-time";
import { isFilled } from "@/lib/stats";
import type { Exercise, TrafficLight } from "@/lib/types";

const BACK_OPTIONS = [
  { value: "green", label: "Gut" },
  { value: "yellow", label: "Mittel" },
  { value: "red", label: "Gereizt" },
] as const;

interface Zeile {
  key: string;
  name: string;
  farbe: string;
  saetze: number;
  /** Bester Satz („22,5 kg × 12“) bzw. „erledigt“ bei Cardio. */
  rechts: string;
}

/** „3,2 t“ ab einer Tonne, darunter „820 kg“. */
function bewegt(kg: number): { wert: string; einheit: string } {
  return kg >= 1000
    ? { wert: fmtKg(kg / 1000), einheit: "t" }
    : { wert: String(Math.round(kg)), einheit: "kg" };
}

function Kennzahl({ label, wert, einheit }: { label: string; wert: string; einheit?: string }) {
  return (
    <div className="rounded-inner border-dick border-rand bg-surface-1 px-3 py-2.5">
      <p className="text-3xs font-bold text-muted">{label}</p>
      <p className="mt-1 font-display text-2xl font-extrabold leading-none tabular-nums text-fg">
        {wert}
        {einheit && <span className="ml-1 font-body text-sm font-semibold text-muted">{einheit}</span>}
      </p>
    </div>
  );
}

/**
 * Abschluss vor dem Speichern: was die Einheit gebracht hat (Dauer · Sätze ·
 * Bewegt, je Übung eine Zeile), Rücken-Ampel (steuert die nächste Einheit),
 * Notiz, speichern. Danach zeigt SessionComplete Rekord, Level und ATLAS.
 */
export function FinishFlow({
  state,
  allLib,
  saving,
  onBack,
  onSave,
}: {
  state: ActiveSessionState;
  allLib: Exercise[];
  saving: boolean;
  onBack: () => void;
  onSave: (backTraffic: TrafficLight | null, note: string) => void;
}) {
  const [back, setBack] = useState<TrafficLight | null>(state.backTraffic ?? null);
  const [note, setNote] = useState(state.note ?? "");

  const { zeilen, saetze, kg, ausgelassen } = useMemo(() => {
    const byId = new Map(allLib.map((e) => [e.id, e]));
    const out: Zeile[] = [];
    let saetze = 0;
    let kg = 0;
    let ausgelassen = 0;
    for (const it of state.session.items) {
      const ex = byId.get(it.exerciseId);
      if (!ex) continue;
      const sets = state.entries[it.id] ?? [];
      if (ex.pattern === "cardio") {
        if (itemDone(ex, sets))
          out.push({ key: it.id, name: ex.name, farbe: REGION_VAR.cardio, saetze: 0, rechts: "erledigt" });
        else ausgelassen++;
        continue;
      }
      const work = sets.filter((s) => !s.warmup && isFilled(s));
      if (!work.length) {
        ausgelassen++;
        continue;
      }
      saetze += work.length;
      for (const s of work) kg += (Number(s.weight) || 0) * (Number(s.reps) || 0);
      const top = work.reduce((a, b) => (setMetric(ex, b) > setMetric(ex, a) ? b : a));
      out.push({
        key: it.id,
        name: ex.name,
        farbe: REGION_VAR[regionOf(ex)],
        saetze: work.length,
        rechts: fmtSatz(top.weight, top.reps, ex.unit === "Sek"),
      });
    }
    return { zeilen: out, saetze, kg, ausgelassen };
  }, [state.session.items, state.entries, allLib]);

  const minuten = sessionMinutes(state.startedAt, new Date().toISOString());
  const b = bewegt(kg);

  return (
    <div className="pb-6">
      <Pressable
        onClick={onBack}
        className="-ml-2 mb-3 flex min-h-11 items-center gap-1.5 rounded-pill px-2 text-sm font-semibold text-fg focus:outline-none focus-visible:ring-2 focus-visible:ring-fokus"
      >
        <ArrowLeft size={18} aria-hidden /> Zurück zum Training
      </Pressable>

      <p className="text-3xs font-bold text-muted">Abschluss</p>
      <h2 className="mt-1 font-display text-titel font-extrabold text-fg">{state.session.name}</h2>

      {saetze === 0 && zeilen.length === 0 ? (
        <p className="mt-2 text-sm text-muted">Kein Satz erledigt. Beenden speichert nichts.</p>
      ) : (
        <>
          <div className="mt-4 grid grid-cols-3 gap-2">
            <Kennzahl label="Dauer" wert={minuten != null ? String(minuten) : "–"} einheit="Min" />
            <Kennzahl label={saetze === 1 ? "Satz" : "Sätze"} wert={String(saetze)} />
            <Kennzahl label="Bewegt" wert={b.wert} einheit={b.einheit} />
          </div>
          <ul className="mt-3 space-y-2">
            {zeilen.map((z) => (
              <li
                key={z.key}
                className="flex min-h-12 items-center gap-3 rounded-inner border-dick border-rand bg-surface-1 px-3 py-2"
              >
                <span
                  aria-hidden
                  className="h-4 w-4 shrink-0 rounded-xs border-dick border-rand"
                  style={{ backgroundColor: z.farbe }}
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-base font-semibold text-fg">{z.name}</span>
                  {z.saetze > 0 && (
                    <span className="block text-sm tabular-nums text-muted">
                      {z.saetze} {z.saetze === 1 ? "Satz" : "Sätze"}
                    </span>
                  )}
                </span>
                <span className="shrink-0 text-base font-semibold tabular-nums text-fg">{z.rechts}</span>
              </li>
            ))}
          </ul>
          {ausgelassen > 0 && (
            <p className="mt-2 text-sm text-muted">
              {ausgelassen} {ausgelassen === 1 ? "Übung" : "Übungen"} ausgelassen
            </p>
          )}
        </>
      )}

      <div className="mt-5 rounded-card border-dick border-rand bg-surface-1 p-4">
        <p className="text-base font-semibold text-fg">Wie fühlt sich dein unterer Rücken an?</p>
        <p className="mb-3 mt-0.5 text-sm text-muted">Steuert die nächste Einheit.</p>
        <Segment
          label="Unterer Rücken"
          options={BACK_OPTIONS}
          value={back ?? undefined}
          onChange={(v) => setBack(v)}
        />
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Notiz: Wie war's?"
          rows={2}
          className="mt-4 w-full resize-none rounded-inner border-dick border-rand bg-surface-1 px-3 py-2.5 text-base text-fg placeholder:text-faint focus:outline-none focus-visible:ring-2 focus-visible:ring-fokus"
        />
      </div>

      <Button size="lg" full onClick={() => onSave(back, note)} disabled={saving} className="mt-4">
        <Save size={18} strokeWidth={2.5} aria-hidden />
        {saving ? "Speichert …" : saetze === 0 && zeilen.length === 0 ? "Training verlassen" : "Beenden & speichern"}
      </Button>
    </div>
  );
}
