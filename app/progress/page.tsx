"use client";

import { motion } from "framer-motion";
import { useMemo } from "react";
import { BackTraffic } from "@/components/progress/BackTraffic";
import { GoalCard } from "@/components/progress/GoalCard";
import { MuscleBalanceCard } from "@/components/progress/MuscleBalanceCard";
import { MuscleVolumeBars } from "@/components/progress/MuscleVolumeBars";
import { ProgressPhotos } from "@/components/progress/ProgressPhotos";
import { TrendChart } from "@/components/progress/TrendChart";
import { Card } from "@/components/ui/Card";
import { useTraining } from "@/components/providers/TrainingProvider";
import { fmtDateShort } from "@/lib/format";
import { isFilled, oneRm, workSets } from "@/lib/stats";

type Kind = "weight" | "reps" | "time";
interface Point {
  date: string;
  value: number;
  label: string;
}
interface ExSeries {
  id: string;
  name: string;
  kind: Kind;
  points: Point[];
}

const kindLabel: Record<Kind, string> = {
  weight: "geschätztes 1RM",
  reps: "Wiederholungen",
  time: "Haltezeit",
};

function BodyCard({
  label,
  unit,
  values,
}: {
  label: string;
  unit: string;
  values: number[];
}) {
  const latest = values[values.length - 1];
  const delta = values.length > 1 ? latest - values[0] : 0;
  return (
    <Card>
      <div className="flex items-end justify-between">
        <div>
          <p className="font-display text-3xl font-semibold tabular-nums text-neutral-100">
            {latest}
            <span className="text-base text-neutral-500"> {unit}</span>
          </p>
          <p className="mt-0.5 text-xs text-neutral-500">{label}</p>
        </div>
        {values.length > 1 && (
          <span className="text-xs tabular-nums text-neutral-400">
            {delta > 0 ? "+" : ""}
            {delta.toFixed(1)} {unit}
          </span>
        )}
      </div>
      <div className="mt-2">
        <TrendChart values={values} />
      </div>
    </Card>
  );
}

export default function ProgressPage() {
  const { log, body, muscleVolumes } = useTraining();
  const weightSeries = body
    .filter((m) => m.weightKg != null)
    .map((m) => m.weightKg as number);
  const waistSeries = body
    .filter((m) => m.waistCm != null)
    .map((m) => m.waistCm as number);

  const byEx = useMemo(() => {
    const m: Record<string, ExSeries> = {};
    log.forEach((s) =>
      (s.exercises || []).forEach((ex) => {
        const sets = workSets(ex.sets || []).filter(isFilled);
        if (!sets.length) return;
        const kind: Kind =
          ex.unit === "Sek"
            ? "time"
            : sets.some(
                  (st) => st.weight !== "" && st.weight != null && Number(st.weight) > 0,
                )
              ? "weight"
              : "reps";
        let value: number;
        let label: string;
        if (kind === "time") {
          value = Math.max(...sets.map((st) => Number(st.reps) || 0));
          label = `${value} s`;
        } else if (kind === "weight") {
          let best = 0;
          let bl = "";
          sets.forEach((st) => {
            const w = Number(st.weight) || 0;
            const r = Number(st.reps) || 0;
            const e = oneRm(w, r);
            if (e > best) {
              best = e;
              bl = `${w} × ${r}`;
            }
          });
          value = Math.round(best);
          label = bl;
        } else {
          value = Math.max(...sets.map((st) => Number(st.reps) || 0));
          label = `${value} Wdh`;
        }
        (m[ex.id] = m[ex.id] || { id: ex.id, name: ex.name, kind, points: [] }).points.push({
          date: s.date,
          value,
          label,
        });
      }),
    );
    return m;
  }, [log]);

  const list = Object.values(byEx)
    .map((e) => {
      const best = Math.max(...e.points.map((p) => p.value));
      const bestPt = e.points.find((p) => p.value === best)!;
      const latest = e.points[e.points.length - 1];
      const isPR = e.points.length > 1 && latest.value >= best;
      const top =
        e.kind === "weight" ? `${best} kg` : e.kind === "time" ? `${best} s` : `${best} Wdh`;
      return { ...e, best, bestPt, latest, isPR, top };
    })
    .sort((a, b) => new Date(b.latest.date).getTime() - new Date(a.latest.date).getTime());

  return (
    <div>
      <h2 className="mb-1 font-display text-2xl font-semibold tracking-tight">Fortschritt</h2>
      <p className="mb-5 text-sm text-neutral-500">
        {list.length
          ? `${list.length} ${list.length === 1 ? "Übung" : "Übungen"} mit Verlauf`
          : "Noch keine Daten"}
        .
      </p>

      {muscleVolumes.some((m) => m.sets > 0) && <MuscleVolumeBars data={muscleVolumes} />}

      <MuscleBalanceCard muscleVolumes={muscleVolumes} />

      <BackTraffic log={log} />

      {(weightSeries.length > 0 || waistSeries.length > 0) && (
        <div className="mb-3 space-y-3">
          {weightSeries.length > 0 && (
            <BodyCard label="Körpergewicht" unit="kg" values={weightSeries} />
          )}
          {waistSeries.length > 0 && (
            <BodyCard label="Bauchumfang" unit="cm" values={waistSeries} />
          )}
        </div>
      )}

      <ProgressPhotos body={body} />

      <GoalCard />

      {list.length === 0 &&
        weightSeries.length === 0 &&
        waistSeries.length === 0 &&
        !body.some((b) => b.photoId) &&
        !log.some((s) => s.backTraffic) && (
          <Card className="p-8 text-center">
            <p className="text-neutral-400">Noch nichts zu zeigen.</p>
            <p className="mt-1 text-sm text-neutral-600">
              Trainiere ein paar Einheiten, dann erscheinen hier deine Kurven und Rekorde.
            </p>
          </Card>
        )}

      <div className="space-y-3">
        {list.map((e) => (
          <Card key={e.id}>
            <div className="mb-2 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="truncate font-semibold leading-tight">{e.name}</h3>
                <p className="mt-0.5 text-xs text-neutral-500">{kindLabel[e.kind]}</p>
              </div>
              <div className="shrink-0 text-right">
                <div className="flex items-center justify-end gap-1.5">
                  {e.isPR && (
                    <motion.span
                      initial={{ scale: 0.7, opacity: 0 }}
                      animate={{ scale: [0.7, 1.2, 1], opacity: 1 }}
                      transition={{ duration: 0.5, ease: "easeOut" }}
                      style={{ boxShadow: "0 0 12px -2px #30d158" }}
                      className="rounded bg-accent-volume px-1.5 py-0.5 font-mono text-xs uppercase tracking-wider text-neutral-950"
                    >
                      Rekord
                    </motion.span>
                  )}
                  <p className="font-display text-lg font-semibold leading-none tabular-nums text-accent-volume">
                    {e.top}
                  </p>
                </div>
                <p className="mt-1 text-xs uppercase tracking-wider text-neutral-600">Bestwert</p>
              </div>
            </div>
            <TrendChart values={e.points.map((p) => p.value)} />
            <div className="mt-2 flex items-center justify-between gap-2">
              <span className="truncate text-xs text-neutral-500">
                Bestleistung <span className="text-neutral-300">{e.bestPt.label}</span> ·{" "}
                {fmtDateShort(e.bestPt.date)}
              </span>
              <span className="shrink-0 text-xs text-neutral-500">
                zuletzt <span className="text-neutral-300">{e.latest.label}</span>
              </span>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
