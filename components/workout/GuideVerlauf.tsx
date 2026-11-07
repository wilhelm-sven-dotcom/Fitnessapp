"use client";

import { useMemo } from "react";
import { TrendChart } from "@/components/progress/TrendChart";
import { useTraining } from "@/components/providers/TrainingProvider";
import { KENNZAHL, fmtKennzahl, seriesFor } from "@/lib/exercise-series";
import { fmtDate, fmtDateShort, fmtSatz } from "@/lib/format";
import { isFilled, workSets } from "@/lib/stats";
import type { Exercise } from "@/lib/types";

/**
 * „Verlauf“ im Übungsdetail: Bestwert (beschriftet), die letzten drei Sätze
 * und die Kurve je Einheit. Rechnet nur, solange der Reiter offen ist (die
 * Komponente wird erst dann gemountet).
 */
export function GuideVerlauf({ ex }: { ex: Exercise }) {
  const { log } = useTraining();
  const serie = useMemo(() => seriesFor(log, ex.id), [log, ex.id]);
  const letzte = useMemo(() => {
    const out: { date: string; text: string }[] = [];
    const neueste = [...log].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    for (const s of neueste) {
      const e = (s.exercises ?? []).find((x) => x.id === ex.id);
      if (!e) continue;
      const sets = workSets(e.sets ?? []).filter(isFilled);
      for (let i = sets.length - 1; i >= 0 && out.length < 3; i--) {
        const st = sets[i];
        const rir = e.unit !== "Sek" && st.rir != null ? ` · RIR ${st.rir}` : "";
        out.push({ date: s.date, text: `${fmtSatz(st.weight, st.reps, e.unit === "Sek")}${rir}` });
      }
      if (out.length >= 3) break;
    }
    return out;
  }, [log, ex.id]);

  if (!serie) {
    return (
      <p className="text-sm leading-relaxed text-muted">
        Noch kein Eintrag. Nach der ersten Einheit mit dieser Übung stehen hier Bestwert,
        die letzten Sätze und die Kurve.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="text-3xs font-semibold uppercase tracking-label text-muted">
          Bestwert · {KENNZAHL[serie.kind]}
        </p>
        <p className="mt-1 font-display text-3xl font-extrabold leading-none tabular-nums text-rekord">
          {fmtKennzahl(serie.kind, serie.best)}
        </p>
        <p className="mt-1.5 text-sm text-muted">
          {serie.kind === "weight" ? "aus " : ""}
          <span className="font-semibold tabular-nums text-fg">{serie.bestPt.label}</span> am{" "}
          {fmtDateShort(serie.bestPt.date)}
        </p>
      </div>

      {letzte.length > 0 && (
        <div>
          <p className="mb-1 text-3xs font-semibold uppercase tracking-label text-muted">
            Letzte Sätze
          </p>
          <ul>
            {letzte.map((l, i) => (
              <li
                key={i}
                className="flex items-baseline justify-between gap-3 border-t border-line-card py-2 first:border-0"
              >
                <span className="text-sm text-muted">{fmtDate(l.date)}</span>
                <span className="text-base font-semibold tabular-nums text-fg">{l.text}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div>
        <p className="mb-1 text-3xs font-semibold uppercase tracking-label text-muted">
          Verlauf · {KENNZAHL[serie.kind]} je Einheit
        </p>
        <TrendChart
          points={serie.points.map((p) => ({ date: p.date, value: p.value, label: p.label }))}
        />
        <p className="mt-1 text-sm text-muted">
          {serie.points.length} {serie.points.length === 1 ? "Einheit" : "Einheiten"} · Antippen
          und ziehen zeigt den Wert.
        </p>
      </div>
    </div>
  );
}
