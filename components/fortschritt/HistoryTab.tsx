"use client";

import {
  Activity,
  Bike,
  Dumbbell,
  Footprints,
  Play,
  Plus,
  Trash2,
  Waves,
  Zap,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Fragment, useMemo, useState } from "react";
import { AtlasMark } from "@/components/trainer/AtlasMark";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { Pressable } from "@/components/ui/pressable";
import { Sheet } from "@/components/ui/sheet";
import { Phasenband } from "@/components/ui/Phasenband";
import { useTraining } from "@/components/providers/TrainingProvider";
import { weeklyCardio } from "@/lib/cardio";
import { bandOfLogged } from "@/lib/phasen/band";
import { prTimeline } from "@/lib/records";
import {
  intensityLabel,
  kmLabel,
  paceLabel,
  SPORT_LABEL,
  SPORTS,
  sportLabel,
  type Sport,
} from "@/lib/cardio-sport";
import { fmtDate, isoWeek } from "@/lib/format";
import { sessionVolume } from "@/lib/stats";
import { plattenNummern } from "@/lib/platte";
import { weekStartMon } from "@/lib/volume";
import { cn } from "@/lib/utils";
import type { CardioSession, LoggedSession, TrafficLight } from "@/lib/types";

const trafficDot: Record<TrafficLight, string> = {
  green: "bg-status-in",
  yellow: "bg-status-over",
  red: "bg-status-danger",
};

const SPORT_ICON: Record<Sport, LucideIcon> = {
  run: Footprints,
  walk: Footprints,
  ride: Bike,
  interval: Zap,
  row: Waves,
  other: Activity,
};

const INTENSITIES: { v: NonNullable<CardioSession["intensity"]>; label: string }[] = [
  { v: "easy", label: "locker" },
  { v: "moderate", label: "moderat" },
  { v: "hard", label: "hart" },
];

/** One-line metric summary for a cardio session. */
function metricsLine(c: CardioSession): string {
  const parts: string[] = [`${Math.round(c.durationSec / 60)} Min`];
  const km = kmLabel(c.distance);
  if (km) parts.push(km);
  if (c.sport === "run" || c.sport === "walk") {
    const p = paceLabel(c.distance, c.durationSec);
    if (p) parts.push(p);
  }
  if (c.calories) parts.push(`${c.calories} kcal`);
  if (c.avgHr) parts.push(`${c.avgHr} bpm`);
  const int = intensityLabel(c.intensity);
  if (int) parts.push(int);
  return parts.join(" · ");
}

type TimelineItem =
  | { kind: "strength"; date: string; s: LoggedSession; realIdx: number }
  | { kind: "cardio"; date: string; c: CardioSession };

/** Verlauf: EINE Timeline für Kraft und Ausdauer — löschen, manuell
 *  nachtragen, Strava-Import; Kraft-Einheiten klappen ins Satz-Detail auf. */
export function HistoryTab() {
  const { log, cardio, deleteSession, addManualCardio, removeCardio, allLib } =
    useTraining();
  const byId = useMemo(() => new Map(allLib.map((e) => [e.id, e])), [allLib]);
  // Plattennummern (chronologisch, abgeleitet) + Rekordzahl je Platte.
  const plattenNr = useMemo(() => plattenNummern(log), [log]);
  const rekordeJePlatte = useMemo(() => {
    const m = new Map<string, number>();
    prTimeline(log).forEach((e) => m.set(e.date, (m.get(e.date) ?? 0) + 1));
    return m;
  }, [log]);
  const router = useRouter();
  const [expanded, setExpanded] = useState<number | null>(null);
  const [confirmDel, setConfirmDel] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  // Manual-entry form state.
  const [sport, setSport] = useState<Sport>("run");
  const [min, setMin] = useState("");
  const [km, setKm] = useState("");
  const [kcal, setKcal] = useState("");
  const [hr, setHr] = useState("");
  const [intensity, setIntensity] =
    useState<NonNullable<CardioSession["intensity"]>>("moderate");

  const items = useMemo<TimelineItem[]>(() => {
    const st: TimelineItem[] = log.map((s, i) => ({
      kind: "strength",
      date: s.date,
      s,
      realIdx: i,
    }));
    const ca: TimelineItem[] = cardio.map((c) => ({ kind: "cardio", date: c.date, c }));
    return [...st, ...ca].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );
  }, [log, cardio]);

  // Mögliche Cardio-Duplikate: Start < 5 Min auseinander = fast sicher dieselbe
  // Fahrt aus zwei Quellen. Nur ein Hinweis — gelöscht wird von Hand.
  const dupeIds = useMemo(() => {
    const sorted = [...cardio].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );
    const ids = new Set<string>();
    for (let i = 0; i < sorted.length; i++) {
      for (let j = i + 1; j < sorted.length; j++) {
        const dt = Math.abs(
          new Date(sorted[i].date).getTime() - new Date(sorted[j].date).getTime(),
        );
        if (dt < 5 * 60 * 1000) {
          ids.add(sorted[i].id);
          ids.add(sorted[j].id);
        }
      }
    }
    return ids;
  }, [cardio]);

  const wk = weeklyCardio(cardio);
  const mon = weekStartMon();
  const strengthWeek = log.filter((s) => new Date(s.date) >= mon).length;
  const stats = [
    { v: String(strengthWeek), l: "Kraft/Wo" },
    { v: String(wk.count), l: "Cardio/Wo" },
    { v: String(wk.minutes), l: "Cardio-Min" },
    { v: kmLabel(wk.distance) ?? "—", l: "Distanz" },
  ];

  const num = (s: string) => {
    const n = parseFloat(s.replace(",", "."));
    return isFinite(n) && n > 0 ? n : undefined;
  };
  const canSave = num(min) != null;
  const save = async () => {
    const m = num(min);
    if (m == null) return;
    const d = num(km);
    await addManualCardio({
      sport,
      date: new Date().toISOString(),
      durationSec: Math.round(m * 60),
      distance: d != null ? Math.round(d * 1000) : undefined,
      calories: num(kcal) != null ? Math.round(num(kcal)!) : undefined,
      avgHr: num(hr) != null ? Math.round(num(hr)!) : undefined,
      intensity,
      title: sportLabel(sport),
    });
    setMin("");
    setKm("");
    setKcal("");
    setHr("");
    setAddOpen(false);
  };

  const inputCls =
    "w-full rounded-pill bg-surface-2 px-3 py-2.5 text-sm tabular-nums text-fg placeholder:text-faint focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-sessions";
  const eyebrowCls = "mb-1.5 block font-mono text-xs uppercase tracking-widest text-muted";

  if (items.length === 0) {
    return (
      <EmptyState
        icon={Dumbbell}
        title="Noch nichts aufgezeichnet"
        description="Starte deine erste Einheit — danach findest du hier Kraft und Ausdauer in einer Timeline."
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

  return (
    <div>
      <div className="mb-4 grid grid-cols-4 gap-2">
        {stats.map((s) => (
          <div
            key={s.l}
            className="rounded-card border border-line bg-surface-1 p-3 text-center shadow-card"
          >
            <p className="font-display text-lg font-semibold tabular-nums text-fg">{s.v}</p>
            <p className="mt-0.5 font-mono text-xs uppercase tracking-wider text-faint">
              {s.l}
            </p>
          </div>
        ))}
      </div>

      <Pressable
        onClick={() => setAddOpen(true)}
        className="mb-4 flex w-full items-center justify-center gap-2 rounded-pill bg-surface-2 py-2.5 text-sm font-medium text-fg focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-ink"
      >
        <Plus size={16} /> Cardio-Einheit nachtragen
      </Pressable>

      <div className="space-y-2">
        {items.map((it, idx) => {
          const dateOf = (x: (typeof items)[number]) =>
            x.kind === "cardio" ? x.c.date : x.s.date;
          const wk = weekStartMon(new Date(dateOf(it))).getTime();
          const neueWoche =
            idx === 0 || weekStartMon(new Date(dateOf(items[idx - 1]))).getTime() !== wk;
          const folio = neueWoche ? (
            <p className="pt-2 font-mono text-3xs font-semibold uppercase tracking-gesperrt-2 text-muted">
              Folio · KW {isoWeek(new Date(dateOf(it)))}
            </p>
          ) : null;
          if (it.kind === "cardio") {
            const c = it.c;
            const Icon = SPORT_ICON[c.sport ?? "other"];
            return (
              <Fragment key={`c-${c.id}`}>
              {folio}
              <div
                className="flex items-center gap-3 rounded-card border border-line-card bg-surface-1 p-3"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-2 text-accent-ink">
                  <Icon size={17} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1.5 truncate text-sm font-medium text-fg">
                    {c.title || sportLabel(c.sport)}
                    {dupeIds.has(c.id) && (
                      <span className="shrink-0 rounded-pill bg-surface-2 px-1.5 py-0.5 font-mono text-xs uppercase tracking-wider text-status-over">
                        möglich doppelt
                      </span>
                    )}
                  </p>
                  <p className="font-mono text-xs tabular-nums text-muted">
                    {metricsLine(c)}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <span className="font-mono text-xs tabular-nums text-faint">
                    {fmtDate(c.date)}
                  </span>
                  {confirmDel === `c-${c.id}` ? (
                    <Pressable
                      onClick={() => {
                        void removeCardio(c.id);
                        setConfirmDel(null);
                      }}
                      className="-m-2 flex min-h-11 items-center p-2 font-mono text-xs text-status-danger focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-ink"
                    >
                      Löschen?
                    </Pressable>
                  ) : (
                    <Pressable
                      onClick={() => setConfirmDel(`c-${c.id}`)}
                      aria-label="Einheit löschen"
                      className="-m-2 flex h-11 w-11 items-center justify-center text-faint transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-ink"
                    >
                      <Trash2 size={14} />
                    </Pressable>
                  )}
                </div>
              </div>
              </Fragment>
            );
          }

          const { s, realIdx } = it;
          const isOpen = expanded === realIdx;
          const isDel = confirmDel === `s-${realIdx}`;
          const v = sessionVolume(s);
          const gruppen = bandOfLogged(s, byId, log);
          const kaderZahl = gruppen.reduce((n, g) => n + g.kader.length, 0);
          const rekorde = rekordeJePlatte.get(s.date) ?? 0;
          return (
            <Fragment key={`s-${s.date}-${realIdx}`}>
            {folio}
            <div
              className="overflow-hidden rounded-card border border-line-card bg-surface-1"
            >
              <div className="flex items-center justify-between gap-2 px-4 py-3">
                <Pressable
                  onClick={() => setExpanded(isOpen ? null : realIdx)}
                  className="flex min-w-0 flex-1 items-center justify-between rounded-card text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-cyanotypie"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="truncate font-mono text-4xs font-medium uppercase tracking-gesperrt-2 text-muted">
                        Platte Nr. <span className="tabular-nums">{plattenNr.get(s) ?? "–"}</span> · {fmtDate(s.date)}
                      </p>
                      {s.backTraffic && (
                        <span
                          className={cn(
                            "h-2 w-2 shrink-0 rounded-full",
                            trafficDot[s.backTraffic],
                          )}
                          aria-label={`Rücken ${s.backTraffic}`}
                        />
                      )}
                    </div>
                    <span className="mt-0.5 block truncate font-display text-lg italic text-fg">
                      {s.dayName}
                    </span>
                  </div>
                  <div className="ml-2 shrink-0 text-right">
                    {v > 0 && (
                      <p className="font-mono text-sm font-bold tabular-nums text-fg">
                        {v.toLocaleString("de-DE")} kg
                      </p>
                    )}
                    <p className="font-mono text-4xs font-medium uppercase tracking-gesperrt text-faint">
                      Volumen
                    </p>
                  </div>
                </Pressable>
                <Pressable
                  onClick={() => setConfirmDel(isDel ? null : `s-${realIdx}`)}
                  aria-label="Einheit löschen"
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-card text-muted focus:outline-none"
                >
                  <Trash2 size={16} />
                </Pressable>
              </div>

              {/* Fingerabdruck der Platte: das Phasenband dessen, was war. */}
              <div className="px-4 pb-2">
                <Phasenband gruppen={gruppen} groesse="mini" />
              </div>
              <div className="flex items-baseline justify-between gap-2 px-4 pb-3 font-mono text-4xs font-medium uppercase tracking-gesperrt text-muted">
                <span>
                  <span className="tabular-nums">{kaderZahl}</span> Kader · alle belichtet
                </span>
                {rekorde > 0 && (
                  <span className="text-messing">
                    <span className="tabular-nums">{rekorde}</span>{" "}
                    {rekorde === 1 ? "Rekord" : "Rekorde"}
                  </span>
                )}
              </div>

              {isDel && (
                <div className="flex items-center gap-2 px-4 pb-3">
                  <Pressable
                    onClick={() => {
                      void deleteSession(realIdx);
                      setConfirmDel(null);
                      if (isOpen) setExpanded(null);
                    }}
                    className="rounded-card bg-surface-2 px-3 py-2 text-sm font-medium text-status-danger focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-sessions"
                  >
                    Einheit löschen
                  </Pressable>
                  <Pressable
                    onClick={() => setConfirmDel(null)}
                    className="rounded-card px-3 py-2 text-sm text-muted focus:outline-none"
                  >
                    Abbrechen
                  </Pressable>
                </div>
              )}

              {isOpen && (
                <div className="space-y-1 px-4 pb-4 pt-1">
                  {(s.exercises ?? []).map((ex) => (
                    <div
                      key={ex.id}
                      className="flex items-baseline justify-between gap-3"
                    >
                      <span className="text-sm text-muted">
                        {ex.name}
                        {ex.note && <span className="text-faint"> · {ex.note}</span>}
                      </span>
                      <span className="text-right font-mono text-xs tabular-nums text-muted">
                        {(ex.sets ?? [])
                          .filter((st) => !st.warmup)
                          .map((st) =>
                            ex.unit === "Sek"
                              ? `${st.reps}s`
                              : st.weight
                                ? `${st.weight}×${st.reps}`
                                : `${st.reps}`,
                          )
                          .join("  ") || "—"}
                      </span>
                    </div>
                  ))}
                  {s.debrief && s.debrief.length > 0 && (
                    <div className="mt-2 rounded-card bg-surface-0 px-3 py-2">
                      <p className="mb-1 flex items-center gap-1.5 font-mono text-xs uppercase tracking-widest text-accent-2">
                        <AtlasMark size={12} className="text-fg" /> ATLAS
                      </p>
                      <p className="text-sm italic leading-relaxed text-muted">
                        {s.debrief.join(" ")}
                      </p>
                    </div>
                  )}
                  {s.note && (
                    <p className="mt-2 rounded-card bg-surface-0 px-3 py-2 text-sm italic text-muted">
                      „{s.note}“
                    </p>
                  )}
                </div>
              )}
            </div>
            </Fragment>
          );
        })}
      </div>

      <Link
        href="/settings?seg=verbindungen"
        className="mt-5 block text-center text-xs text-muted underline-offset-2 hover:underline"
      >
        Strava verbinden für automatische Läufe und Fahrten →
      </Link>

      <Sheet open={addOpen} onClose={() => setAddOpen(false)} title="Cardio nachtragen">
        <div className="space-y-4">
          <div>
            <p className={eyebrowCls}>Art</p>
            <div className="flex flex-wrap gap-1.5">
              {SPORTS.map((sp) => (
                <Pressable
                  key={sp}
                  onClick={() => setSport(sp)}
                  className={cn(
                    "rounded-pill px-3 py-1.5 text-sm font-medium",
                    sport === sp ? "bg-strong text-on-strong" : "bg-surface-2 text-muted",
                  )}
                >
                  {SPORT_LABEL[sp]}
                </Pressable>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className={eyebrowCls}>Dauer (Min)</span>
              <input
                value={min}
                onChange={(e) => setMin(e.target.value)}
                inputMode="decimal"
                placeholder="30"
                className={inputCls}
              />
            </label>
            <label className="block">
              <span className={eyebrowCls}>Distanz (km)</span>
              <input
                value={km}
                onChange={(e) => setKm(e.target.value)}
                inputMode="decimal"
                placeholder="5,0"
                className={inputCls}
              />
            </label>
            <label className="block">
              <span className={eyebrowCls}>Kalorien</span>
              <input
                value={kcal}
                onChange={(e) => setKcal(e.target.value)}
                inputMode="numeric"
                placeholder="350"
                className={inputCls}
              />
            </label>
            <label className="block">
              <span className={eyebrowCls}>Puls Ø</span>
              <input
                value={hr}
                onChange={(e) => setHr(e.target.value)}
                inputMode="numeric"
                placeholder="140"
                className={inputCls}
              />
            </label>
          </div>

          <div>
            <p className={eyebrowCls}>Intensität</p>
            <div className="flex gap-1.5">
              {INTENSITIES.map((i) => (
                <Pressable
                  key={i.v}
                  onClick={() => setIntensity(i.v)}
                  className={cn(
                    "flex-1 rounded-pill py-2 text-sm font-medium",
                    intensity === i.v ? "bg-strong text-on-strong" : "bg-surface-2 text-muted",
                  )}
                >
                  {i.label}
                </Pressable>
              ))}
            </div>
          </div>

          <Button
            onClick={() => void save()}
            disabled={!canSave}
            size="lg"
            full
            className="mt-1"
          >
            Speichern
          </Button>
        </div>
      </Sheet>
    </div>
  );
}
