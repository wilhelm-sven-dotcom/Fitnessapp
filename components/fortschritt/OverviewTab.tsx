"use client";

import { ChevronDown, ChevronRight, LineChart, Play } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { LevelSheet } from "@/components/progress/LevelSheet";
import { MiniKurve } from "@/components/progress/MiniKurve";
import { PhaseCard } from "@/components/progress/PhaseCard";
import { RecordsBoard } from "@/components/progress/RecordsBoard";
import { GuideSheet } from "@/components/workout/GuideSheet";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { Pressable } from "@/components/ui/pressable";
import { Segment } from "@/components/ui/Segment";
import { Sheet } from "@/components/ui/sheet";
import { useTraining } from "@/components/providers/TrainingProvider";
import { trainingLevel } from "@/lib/achievements";
import { KENNZAHL, exerciseSeries, fmtKennzahl } from "@/lib/exercise-series";
import { fmtKg } from "@/lib/format";
import { REGION_FLAECHE, regionOf } from "@/lib/phasen/band";
import { sessionVolume } from "@/lib/stats";
import { cn } from "@/lib/utils";

type Zeitraum = "4w" | "6m" | "1j";
const ZEITRAEUME = [
  { value: "4w", label: "4 Wochen" },
  { value: "6m", label: "6 Monate" },
  { value: "1j", label: "1 Jahr" },
] as const;

const VERLAEUFE_VORSCHAU = 6;
const WOCHE = 7 * 86_400_000;

const montag = (d: Date) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return x;
};

/** Tonnage je Woche (4 Wo / 6 Mon) bzw. je Monat (1 J), älteste zuerst. */
function volumenReihe(
  log: { date: string }[],
  vol: (i: number) => number,
  zeitraum: Zeitraum,
): { werte: number[]; links: string; rechts: string; je: string } {
  const jetzt = new Date();
  if (zeitraum === "1j") {
    const werte = Array.from({ length: 12 }, () => 0);
    const basis = jetzt.getFullYear() * 12 + jetzt.getMonth() - 11;
    log.forEach((s, i) => {
      const d = new Date(s.date);
      const idx = d.getFullYear() * 12 + d.getMonth() - basis;
      if (idx >= 0 && idx < 12) werte[idx] += vol(i);
    });
    const erster = new Date(jetzt.getFullYear(), jetzt.getMonth() - 11, 1);
    const monat = (d: Date) => d.toLocaleDateString("de-DE", { month: "short", year: "2-digit" });
    return { werte, links: monat(erster), rechts: monat(jetzt), je: "Monat" };
  }
  const n = zeitraum === "4w" ? 4 : 26;
  const start = montag(jetzt).getTime() - (n - 1) * WOCHE;
  const werte = Array.from({ length: n }, () => 0);
  log.forEach((s, i) => {
    const idx = Math.round((montag(new Date(s.date)).getTime() - start) / WOCHE);
    if (idx >= 0 && idx < n) werte[idx] += vol(i);
  });
  return {
    werte,
    links: zeitraum === "4w" ? "vor 3 Wochen" : "vor 6 Monaten",
    rechts: "diese Woche",
    je: "Woche",
  };
}

function Kachel({
  label,
  wert,
  einheit,
  hinweis,
  pfeil,
}: {
  label: string;
  wert: string;
  einheit?: string;
  hinweis?: string;
  pfeil?: boolean;
}) {
  return (
    <div className="h-full rounded-card border-dick border-rand bg-surface-1 px-3 py-3 text-left">
      <p className="flex items-center justify-between text-3xs font-bold text-muted">
        {label}
        {pfeil && <ChevronRight size={14} aria-hidden />}
      </p>
      <p className="mt-1.5 font-display text-2xl font-extrabold leading-none tabular-nums text-fg">
        {wert}
        {einheit && <span className="ml-1 font-body text-sm font-semibold text-muted">{einheit}</span>}
      </p>
      {hinweis && <p className="mt-1 truncate text-sm text-muted">{hinweis}</p>}
    </div>
  );
}

/**
 * Übersicht: Kopfzeile (Bewegt gesamt · Level · Woche im Block), Volumen mit
 * Zeitraum, Rekorde und die Verläufe als Liste mit Mini-Kurve. Die große
 * Kurve öffnet sich im Übungsdetail (Reiter „Verlauf“). Level und Phase
 * öffnen ihr Blatt; Wochen-Volumen je Muskel und Muskel-Balance stehen im
 * Reiter „Muskeln“.
 */
export function OverviewTab() {
  const { log, allLib, settings, phase } = useTraining();
  const router = useRouter();
  const [zeitraum, setZeitraum] = useState<Zeitraum>("4w");
  const [alleVerlaeufe, setAlleVerlaeufe] = useState(false);
  const [levelOffen, setLevelOffen] = useState(false);
  const [phaseOffen, setPhaseOffen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);

  const byId = useMemo(() => new Map(allLib.map((e) => [e.id, e])), [allLib]);
  const lvl = useMemo(() => trainingLevel({ log, allLib, settings }), [log, allLib, settings]);
  const volumen = useMemo(() => log.map((s) => sessionVolume(s)), [log]);
  const gesamtKg = volumen.reduce((a, v) => a + v, 0);
  const reihe = useMemo(
    () => volumenReihe(log, (i) => volumen[i], zeitraum),
    [log, volumen, zeitraum],
  );
  const reiheMax = Math.max(...reihe.werte, 1);
  const schnitt = reihe.werte.reduce((a, v) => a + v, 0) / reihe.werte.length;
  const serien = useMemo(() => exerciseSeries(log), [log]);

  if (log.length === 0) {
    return (
      <EmptyState
        icon={LineChart}
        title="Noch nichts zu zeigen"
        description="Trainiere ein paar Einheiten. Dann stehen hier Level, Rekorde und der Verlauf jeder Übung."
        action={
          <Button onClick={() => router.push("/")}>
            <Play size={16} strokeWidth={2.5} aria-hidden /> Erste Einheit starten
          </Button>
        }
      />
    );
  }

  const gezeigt = alleVerlaeufe ? serien : serien.slice(0, VERLAEUFE_VORSCHAU);
  const detailEx = detailId ? (byId.get(detailId) ?? null) : null;
  const mitPhase = log.length >= 3;

  return (
    <div className="space-y-4">
      {/* Kopfzeile: drei Kennzahlen; Level und Phase öffnen ihr Blatt. */}
      <div className="grid grid-cols-3 gap-2">
        <Kachel
          label="Bewegt"
          wert={fmtKg(gesamtKg / 1000)}
          einheit="t"
          hinweis={`${log.length} ${log.length === 1 ? "Einheit" : "Einheiten"}`}
        />
        <Pressable
          onClick={() => setLevelOffen(true)}
          aria-haspopup="dialog"
          aria-label={`Level ${lvl.level}, ${lvl.title}: Herleitung zeigen`}
          className="rounded-card focus:outline-none focus-visible:ring-2 focus-visible:ring-fokus"
        >
          <Kachel label="Level" wert={String(lvl.level)} hinweis={lvl.title} pfeil />
        </Pressable>
        {mitPhase ? (
          <Pressable
            onClick={() => setPhaseOffen(true)}
            aria-haspopup="dialog"
            aria-label={`${phase.title}, Woche ${phase.cycleWeek} von ${phase.cycleLength}: Details zeigen`}
            className="rounded-card focus:outline-none focus-visible:ring-2 focus-visible:ring-fokus"
          >
            <Kachel
              label="Woche"
              wert={`${phase.cycleWeek}/${phase.cycleLength}`}
              hinweis={phase.due ? "Entlastung fällig" : phase.title.replace("-Phase", "")}
              pfeil
            />
          </Pressable>
        ) : (
          <Kachel label="Woche" wert="–" hinweis="ab 3 Einheiten" />
        )}
      </div>

      {/* Volumen mit Zeitraum: Woche bzw. Monat als Balken, die laufende voll. */}
      <Card>
        <div className="flex items-baseline justify-between gap-2">
          <p className="text-3xs font-bold text-muted">Volumen</p>
          <p className="text-sm tabular-nums text-muted">
            Ø {fmtKg(schnitt / 1000)} t je {reihe.je}
          </p>
        </div>
        <Segment
          label="Zeitraum"
          options={ZEITRAEUME}
          value={zeitraum}
          onChange={(v) => setZeitraum(v)}
          className="mt-3"
        />
        <div
          className={cn("mt-4 flex items-end", reihe.werte.length > 12 ? "gap-0.5" : "gap-1.5")}
          style={{ height: 80 }}
          aria-hidden
        >
          {reihe.werte.map((v, i) => (
            <div
              key={i}
              className="flex-1 rounded-xs bg-info"
              style={{
                height: `${Math.max(v > 0 ? 6 : 2, Math.round((v / reiheMax) * 100))}%`,
                opacity: i === reihe.werte.length - 1 ? 1 : 0.45,
              }}
            />
          ))}
        </div>
        <div className="mt-1.5 flex justify-between text-sm text-muted">
          <span>{reihe.links}</span>
          <span>{reihe.rechts}</span>
        </div>
      </Card>

      <RecordsBoard log={log} onJump={(id) => byId.has(id) && setDetailId(id)} />

      {serien.length > 0 && (
        <section aria-label="Verläufe">
          <p className="mb-2 px-1 text-3xs font-bold text-muted">
            Verläufe · {serien.length}
          </p>
          <ul className="overflow-hidden rounded-card border-dick border-rand bg-surface-1">
            {gezeigt.map((e, i) => {
              const ex = byId.get(e.id);
              const region = ex ? regionOf(ex) : "cardio";
              return (
                <li key={e.id} className={i > 0 ? "border-t border-line-card" : undefined}>
                  <Pressable
                    onClick={() => ex && setDetailId(e.id)}
                    disabled={!ex}
                    aria-label={`${e.name}: Verlauf zeigen`}
                    className="flex min-h-14 w-full items-center gap-3 px-4 py-2.5 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-fokus"
                  >
                    <span
                      aria-hidden
                      className="h-4 w-4 shrink-0 rounded-xs border-dick border-rand"
                      style={{ backgroundColor: REGION_FLAECHE[region] }}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block text-base font-semibold leading-snug text-fg">
                        {e.name}
                      </span>
                      <span className="block text-sm tabular-nums text-muted">
                        {KENNZAHL[e.kind]} {fmtKennzahl(e.kind, e.best)}
                        {e.isPR && <span className="font-semibold text-rekord"> · Rekord</span>}
                      </span>
                    </span>
                    <MiniKurve werte={e.points.map((p) => p.value)} farbe="var(--info)" />
                    {ex && <ChevronRight size={18} className="shrink-0 text-muted" aria-hidden />}
                  </Pressable>
                </li>
              );
            })}
          </ul>
          {serien.length > VERLAEUFE_VORSCHAU && (
            <Pressable
              onClick={() => setAlleVerlaeufe((v) => !v)}
              aria-expanded={alleVerlaeufe}
              className="mt-2 flex min-h-11 w-full items-center justify-center gap-1.5 rounded-pill border border-line text-sm font-semibold text-fg focus:outline-none focus-visible:ring-2 focus-visible:ring-fokus"
            >
              <ChevronDown
                size={16}
                aria-hidden
                className={cn("transition-transform duration-200 ease-out", alleVerlaeufe && "rotate-180")}
              />
              {alleVerlaeufe ? "Weniger anzeigen" : `Alle ${serien.length} Übungen zeigen`}
            </Pressable>
          )}
        </section>
      )}

      <LevelSheet open={levelOffen} onClose={() => setLevelOffen(false)} />
      <Sheet open={phaseOffen} onClose={() => setPhaseOffen(false)} title="Phase">
        <PhaseCard log={log} phase={phase} />
      </Sheet>
      <GuideSheet
        open={!!detailEx}
        onClose={() => setDetailId(null)}
        ex={detailEx}
        startTab="verlauf"
      />
    </div>
  );
}
