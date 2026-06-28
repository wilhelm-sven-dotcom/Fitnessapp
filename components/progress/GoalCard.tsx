"use client";

import { Target } from "lucide-react";
import { useMemo, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Pressable } from "@/components/ui/pressable";
import { useTraining } from "@/components/providers/TrainingProvider";
import {
  MIN_POINTS,
  bodyTrend,
  exercise1RMHistory,
  project,
  weeksToTarget,
  type SeriesPoint,
} from "@/lib/projection";
import { cn } from "@/lib/utils";

const WEEKS_AHEAD = 8;

interface GoalItem {
  id: string;
  name: string;
  unit: string;
  series: SeriesPoint[];
}

const fmt = (n: number) => (Math.round(n * 10) / 10).toString().replace(".", ",");

function ProjChart({
  series,
  weeksAhead,
  projected,
}: {
  series: SeriesPoint[];
  weeksAhead: number;
  projected: number;
}) {
  const W = 300;
  const H = 60;
  const pad = 6;
  const WEEK = 7 * 86400000;
  const t0 = new Date(series[0].date).getTime();
  const hx = series.map((p) => (new Date(p.date).getTime() - t0) / WEEK);
  const lastX = hx[hx.length - 1];
  const projX = lastX + weeksAhead;
  const lastY = series[series.length - 1].value;
  const ys = [...series.map((p) => p.value), projected];
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const spanY = maxY - minY || 1;
  const X = (x: number) => pad + (x / (projX || 1)) * (W - 2 * pad);
  const Y = (v: number) => H - pad - ((v - minY) / spanY) * (H - 2 * pad);
  const histLine = series
    .map((p, i) => `${i ? "L" : "M"}${X(hx[i]).toFixed(1)} ${Y(p.value).toFixed(1)}`)
    .join(" ");
  const projLine = `M${X(lastX).toFixed(1)} ${Y(lastY).toFixed(1)} L${X(projX).toFixed(1)} ${Y(projected).toFixed(1)}`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ display: "block", width: "100%", height: "auto" }}>
      <path
        d={histLine}
        fill="none"
        stroke="#30d158"
        strokeWidth={2}
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
      <path
        d={projLine}
        fill="none"
        stroke="#0a84ff"
        strokeWidth={2}
        strokeDasharray="4 3"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
      <circle cx={X(lastX)} cy={Y(lastY)} r="3" fill="#30d158" />
      <circle cx={X(projX)} cy={Y(projected)} r="3" fill="#0a84ff" />
    </svg>
  );
}

export function GoalCard() {
  const { log, allLib, body } = useTraining();

  const items = useMemo<GoalItem[]>(() => {
    const out: GoalItem[] = [];
    const seen = new Set<string>();
    log.forEach((s) =>
      s.exercises.forEach((se) => {
        if (seen.has(se.id)) return;
        seen.add(se.id);
        const series = exercise1RMHistory(log, allLib, se.id);
        if (series.length >= MIN_POINTS) {
          const ex = allLib.find((e) => e.id === se.id);
          out.push({ id: "ex:" + se.id, name: ex?.name ?? se.name, unit: "kg", series });
        }
      }),
    );
    const w = bodyTrend(body, "weightKg");
    if (w.length >= MIN_POINTS)
      out.push({ id: "body:weight", name: "Körpergewicht", unit: "kg", series: w });
    const wa = bodyTrend(body, "waistCm");
    if (wa.length >= MIN_POINTS)
      out.push({ id: "body:waist", name: "Bauchumfang", unit: "cm", series: wa });
    return out;
  }, [log, allLib, body]);

  const [selId, setSelId] = useState<string | null>(null);
  const [target, setTarget] = useState("");

  if (!items.length) return null;
  const sel = items.find((i) => i.id === selId) ?? items[0];
  const proj = project(sel.series, WEEKS_AHEAD);
  const tNum = target.trim() ? Number(target.replace(",", ".")) : null;
  const weeks =
    tNum != null && !Number.isNaN(tNum) ? weeksToTarget(sel.series, tNum) : null;

  return (
    <Card className="mb-3">
      <p className="mb-3 flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-neutral-400">
        <Target size={13} /> Ziel-Rechner
      </p>

      <div className="mb-3 flex flex-wrap gap-1.5">
        {items.map((it) => (
          <Pressable
            key={it.id}
            onClick={() => {
              setSelId(it.id);
              setTarget("");
            }}
            className={cn(
              "rounded-lg px-2.5 py-1 text-xs font-medium focus:outline-none",
              it.id === sel.id
                ? "bg-accent-coverage text-neutral-950"
                : "bg-neutral-800 text-neutral-400",
            )}
          >
            {it.name}
          </Pressable>
        ))}
      </div>

      {proj && (
        <>
          <ProjChart series={sel.series} weeksAhead={WEEKS_AHEAD} projected={proj.projected} />
          <div className="mt-2 flex items-center justify-between text-sm">
            <span className="text-neutral-400">
              Aktuell{" "}
              <span className="font-mono text-neutral-200">
                {fmt(proj.current)} {sel.unit}
              </span>
            </span>
            <span className="text-neutral-400">
              Trend{" "}
              <span
                className={cn(
                  "font-mono",
                  proj.slopePerWeek >= 0 ? "text-accent-volume" : "text-status-under",
                )}
              >
                {proj.slopePerWeek >= 0 ? "+" : ""}
                {fmt(proj.slopePerWeek)} {sel.unit}/Wo
              </span>
            </span>
          </div>
          <p className="mt-1 text-sm text-neutral-300">
            In {WEEKS_AHEAD} Wochen bei diesem Tempo:{" "}
            <span className="font-mono text-accent-coverage">
              ~{fmt(proj.projected)} {sel.unit}
            </span>
          </p>

          <div className="mt-3 flex items-center gap-2">
            <input
              type="number"
              inputMode="decimal"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              placeholder={`Ziel ${sel.unit}`}
              className="w-28 rounded-xl bg-neutral-800 px-3 py-2 text-center font-mono tabular-nums text-neutral-100 placeholder:text-neutral-600 focus:outline-none focus:ring-2 focus:ring-accent-coverage"
            />
            <span className="text-sm text-neutral-400">
              {tNum == null || Number.isNaN(tNum)
                ? "Ziel eintragen"
                : weeks == null
                  ? "noch kein klarer Trend"
                  : weeks === 0
                    ? "schon erreicht"
                    : `in ~${weeks} ${weeks === 1 ? "Woche" : "Wochen"}`}
            </span>
          </div>
          <p className="mt-2 text-xs text-neutral-600">
            Lineare Schätzung aus deinem Verlauf — keine Garantie.
          </p>
        </>
      )}
    </Card>
  );
}
