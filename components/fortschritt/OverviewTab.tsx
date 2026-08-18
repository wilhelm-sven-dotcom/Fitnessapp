"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ChevronDown, LineChart, Play } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { LevelCard } from "@/components/progress/LevelCard";
import { MuscleBalanceCard } from "@/components/progress/MuscleBalanceCard";
import { MuscleVolumeBars } from "@/components/progress/MuscleVolumeBars";
import { PhaseCard } from "@/components/progress/PhaseCard";
import { RecordsBoard } from "@/components/progress/RecordsBoard";
import { TrendChart } from "@/components/progress/TrendChart";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Readout } from "@/components/ui/Readout";
import { Pressable } from "@/components/ui/pressable";
import { useTraining } from "@/components/providers/TrainingProvider";
import { fmtDateShort } from "@/lib/format";
import { isFilled, oneRm, sessionVolume, workSets } from "@/lib/stats";
import { weeklyMuscleVolume } from "@/lib/volume";
import { cn } from "@/lib/utils";

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

const TREND_PREVIEW = 4;

/** Übersicht: die kuratierten Kern-Karten — Level, Phase, Rekorde,
 *  Muskel-Volumen & -Balance, dazu die Übungs-Trends (aufklappbar). */
export function OverviewTab() {
  const { log, allLib, muscleVolumes, phase } = useTraining();
  const router = useRouter();
  const reduce = useReducedMotion();
  const [showAllTrends, setShowAllTrends] = useState(false);

  // Sprung „Rekord → Übungs-Trend": erst ggf. aufklappen, der Effekt scrollt
  // NACH dem Commit (Ziel-Card ist dann gemountet), kurzes Ring-Highlight.
  const trendRefs = useRef(new Map<string, HTMLDivElement>());
  const [pendingJump, setPendingJump] = useState<string | null>(null);
  const [flashId, setFlashId] = useState<string | null>(null);

  useEffect(() => {
    if (!pendingJump) return;
    const el = trendRefs.current.get(pendingJump);
    if (el) {
      el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
      setFlashId(pendingJump);
    }
    setPendingJump(null);
  }, [pendingJump, reduce]);

  useEffect(() => {
    if (!flashId) return;
    const id = setTimeout(() => setFlashId(null), 1200);
    return () => clearTimeout(id);
  }, [flashId]);

  // Vorwochen-Volumen für den Radar-Geist (gleiche Quelle, Referenz −7 Tage).
  const prevMuscleVolumes = useMemo(
    () => weeklyMuscleVolume(log, allLib, new Date(Date.now() - 7 * 86400000)),
    [log, allLib],
  );

  const totalT = Math.round(log.reduce((a, s) => a + sessionVolume(s), 0) / 100) / 10;

  // 7 Kalenderwochen Tonnage (Mo-basiert), älteste zuerst — für die Balkenreihe.
  const wochenTonnage = useMemo(() => {
    const monday = (d: Date) => {
      const x = new Date(d);
      const day = (x.getDay() + 6) % 7;
      x.setHours(0, 0, 0, 0);
      x.setDate(x.getDate() - day);
      return x.getTime();
    };
    const start = monday(new Date()) - 6 * 7 * 86400000;
    const buckets = Array.from({ length: 7 }, () => 0);
    log.forEach((s) => {
      const idx = Math.round((monday(new Date(s.date)) - start) / (7 * 86400000));
      if (idx >= 0 && idx < 7) buckets[idx] += sessionVolume(s);
    });
    return buckets;
  }, [log]);

  const list = useMemo(() => {
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
        (m[ex.id] = m[ex.id] || { id: ex.id, name: ex.name, kind, points: [] }).points.push(
          { date: s.date, value, label },
        );
      }),
    );
    return Object.values(m)
      .map((e) => {
        const best = Math.max(...e.points.map((p) => p.value));
        const bestPt = e.points.find((p) => p.value === best)!;
        const latest = e.points[e.points.length - 1];
        const isPR = e.points.length > 1 && latest.value >= best;
        const top =
          e.kind === "weight" ? `${best} kg` : e.kind === "time" ? `${best} s` : `${best} Wdh`;
        return { ...e, best, bestPt, latest, isPR, top };
      })
      .sort(
        (a, b) => new Date(b.latest.date).getTime() - new Date(a.latest.date).getTime(),
      );
  }, [log]);

  const jumpToTrend = (exId: string) => {
    const idx = list.findIndex((e) => e.id === exId);
    if (idx < 0) return; // Übung ohne Trend-Serie — nichts zu springen
    if (idx >= TREND_PREVIEW) setShowAllTrends(true);
    setPendingJump(exId);
  };

  if (log.length === 0) {
    return (
      <EmptyState
        icon={LineChart}
        title="Noch nichts zu zeigen"
        description="Trainiere ein paar Einheiten — dann erscheinen hier Level, Rekorde, deine Muskel-Balance und die Kurven jeder Übung."
        action={
          <Pressable
            onClick={() => router.push("/")}
            className="flex items-center justify-center gap-2 rounded-card bg-strong px-5 py-3 text-sm font-semibold text-on-strong shadow-card-lg focus:outline-none"
          >
            <Play size={16} strokeWidth={2.5} /> Erste Einheit starten
          </Pressable>
        }
      />
    );
  }

  const trends = showAllTrends ? list : list.slice(0, TREND_PREVIEW);

  return (
    <div>
      <Card className="mb-4 p-5">
        <Readout
          eyebrow="Bewegte Masse gesamt"
          value={totalT}
          unit="t"
          decimals={1}
          size="lg"
          hint={`über ${log.length} ${log.length === 1 ? "Einheit" : "Einheiten"}`}
        />
      </Card>

      {/* Volumen je Woche: 7-Wochen-Tonnage als Balkenreihe (45 % Opazität,
          die laufende Woche voll) — diskrete Reihe, kein Verlauf. */}
      <Card className="mb-4">
        <div className="flex justify-between font-mono text-3xs font-medium uppercase tracking-gesperrt text-muted">
          <span>Volumen je Woche</span>
          <span className="tabular-nums">
            {(wochenTonnage[6] / 1000).toLocaleString("de-DE", { maximumFractionDigits: 1 })} t
          </span>
        </div>
        <div className="mt-2.5 flex items-end gap-1" style={{ height: 56 }} aria-hidden>
          {wochenTonnage.map((v, i) => (
            <div
              key={i}
              className="flex-1 bg-cyanotypie"
              style={{
                height: `${Math.max(v > 0 ? 8 : 2, Math.round((v / Math.max(...wochenTonnage, 1)) * 100))}%`,
                opacity: i === 6 ? 1 : 0.45,
              }}
            />
          ))}
        </div>
        <div className="mt-1.5 flex justify-between font-mono text-4xs font-medium uppercase tracking-gesperrt text-muted">
          <span>Vor 6 Wochen</span>
          <span>Diese Woche</span>
        </div>
      </Card>

      <LevelCard />

      <PhaseCard log={log} phase={phase} />

      <RecordsBoard log={log} onJump={jumpToTrend} />

      {muscleVolumes.some((m) => m.sets > 0) && <MuscleVolumeBars data={muscleVolumes} />}

      <MuscleBalanceCard muscleVolumes={muscleVolumes} prevMuscleVolumes={prevMuscleVolumes} />

      {list.length > 0 && (
        <div className="space-y-3">
          <p className="mt-5 px-1 font-mono text-3xs font-semibold uppercase tracking-gesperrt-2 text-muted">
            Messreihen · {list.length}
          </p>
          {trends.map((e) => (
            <div
              key={e.id}
              ref={(el) => {
                if (el) trendRefs.current.set(e.id, el);
                else trendRefs.current.delete(e.id);
              }}
              className="scroll-mt-20"
            >
              <Card
                className={cn(
                  "transition-shadow duration-300",
                  flashId === e.id && "ring-2 ring-cyanotypie",
                )}
              >
                <div className="mb-2 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="truncate font-display text-lg italic leading-tight text-fg">
                      {e.name}
                    </h3>
                    <p className="mt-0.5 font-mono text-4xs font-medium uppercase tracking-gesperrt text-muted">
                      {kindLabel[e.kind]}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {e.isPR && (
                        <motion.span
                          initial={reduce ? false : { scale: 0.7, opacity: 0 }}
                          animate={reduce ? undefined : { scale: [0.7, 1.2, 1], opacity: 1 }}
                          transition={{ duration: 0.5, ease: "easeOut" }}
                          className="rounded-pill border border-messing px-1.5 py-0.5 font-mono text-3xs font-semibold uppercase tracking-gesperrt text-messing"
                        >
                          Rekord
                        </motion.span>
                      )}
                      <p className="font-mono text-lg font-bold leading-none tabular-nums text-cyanotypie">
                        {e.top}
                      </p>
                    </div>
                    <p className="mt-1 text-xs uppercase tracking-wider text-faint">
                      Bestwert
                    </p>
                  </div>
                </div>
                <TrendChart points={e.points} />
                <div className="mt-2 flex items-center justify-between gap-2">
                  <span className="truncate text-xs text-muted">
                    Bestleistung <span className="text-muted">{e.bestPt.label}</span> ·{" "}
                    {fmtDateShort(e.bestPt.date)}
                  </span>
                  <span className="shrink-0 text-xs text-muted">
                    zuletzt <span className="text-muted">{e.latest.label}</span>
                  </span>
                </div>
              </Card>
            </div>
          ))}
          {list.length > TREND_PREVIEW && (
            <Pressable
              onClick={() => setShowAllTrends((v) => !v)}
              className="flex w-full items-center justify-center gap-1.5 rounded-card bg-surface-2 py-2.5 text-sm font-medium text-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-ink"
            >
              <ChevronDown
                size={15}
                className={cn("transition-transform duration-200 ease-out", showAllTrends && "rotate-180")}
              />
              {showAllTrends ? "Weniger anzeigen" : `Alle ${list.length} Übungen zeigen`}
            </Pressable>
          )}
        </div>
      )}
    </div>
  );
}
