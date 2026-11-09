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
import { fmtDate, fmtSatz, isoWeek } from "@/lib/format";
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
  const { log, cardio, deleteSession, addManualCardio, removeCardio, allLib, gyms } =
    useTraining();
  // Der Ort steht erst in der Zeile, wenn es mehr als einen gibt — sonst wäre
  // es auf jeder Einheit dasselbe Wort.
  const zeigeOrt = gyms.length > 1;
  const byId = useMemo(() => new Map(allLib.map((e) => [e.id, e])), [allLib]);
  // Plattennummern (chronologisch, abgeleitet) + Rekordzahl je Platte.
  const plattenNr = useMemo(() => plattenNummern(log), [log]);
  const rekordeJePlatte = useMemo(() => {
    const m = new Map<string, number>();
    prTimeline(log).forEach((e) => m.set(e.date, (m.get(e.date) ?? 0) + 1));
    return m;
  }, [log]);
  const router = useRouter();
  /** Aufgeklappte Einheit: `s-‹Index›` (Kraft) bzw. `c-‹Id›` (Cardio). */
  const [expanded, setExpanded] = useState<string | null>(null);
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
    { v: String(strengthWeek), l: "Kraft" },
    { v: String(wk.count), l: "Cardio" },
    { v: String(wk.minutes), l: "Cardio-Min" },
    { v: kmLabel(wk.distance) ?? "–", l: "Distanz" },
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
    "w-full rounded-pill bg-surface-2 px-3 py-2.5 text-sm tabular-nums text-fg placeholder:text-faint focus:outline-none focus-visible:ring-2 focus-visible:ring-fokus";
  const eyebrowCls = "mb-1.5 block text-3xs font-semibold uppercase tracking-label text-muted";

  if (items.length === 0) {
    return (
      <EmptyState
        icon={Dumbbell}
        title="Noch nichts aufgezeichnet"
        description="Starte deine erste Einheit — danach findest du hier Kraft und Ausdauer in einer Timeline."
        action={
          <Button onClick={() => router.push("/")}>
            <Play size={16} strokeWidth={2.5} aria-hidden /> Erste Einheit starten
          </Button>
        }
      />
    );
  }

  /** Löschen steht in der aufgeklappten Einheit, mit Rückfrage. */
  const loeschZeile = (key: string, onDelete: () => void) =>
    confirmDel === key ? (
      <div className="mt-3 flex items-center gap-2">
        <Button
          variant="danger"
          onClick={() => {
            onDelete();
            setConfirmDel(null);
            setExpanded(null);
          }}
        >
          Ja, löschen
        </Button>
        <Button variant="ghost" onClick={() => setConfirmDel(null)}>
          Abbrechen
        </Button>
      </div>
    ) : (
      <Button variant="danger" onClick={() => setConfirmDel(key)} className="mt-3">
        <Trash2 size={16} aria-hidden /> Einheit löschen
      </Button>
    );

  return (
    <div>
      <p className="mb-2 px-1 text-3xs font-semibold uppercase tracking-label text-muted">
        Diese Woche
      </p>
      <div className="mb-4 grid grid-cols-4 gap-2">
        {stats.map((s) => (
          <div key={s.l} className="rounded-inner bg-surface-1 px-2 py-2.5 text-center">
            <p className="font-display text-xl font-extrabold tabular-nums text-fg">{s.v}</p>
            <p className="mt-0.5 text-sm text-muted">{s.l}</p>
          </div>
        ))}
      </div>

      <Pressable
        onClick={() => setAddOpen(true)}
        className="mb-4 flex min-h-11 w-full items-center justify-center gap-2 rounded-pill border border-line text-sm font-semibold text-fg focus:outline-none focus-visible:ring-2 focus-visible:ring-fokus"
      >
        <Plus size={16} aria-hidden /> Cardio-Einheit nachtragen
      </Pressable>

      <div className="space-y-2">
        {items.map((it, idx) => {
          const dateOf = (x: (typeof items)[number]) =>
            x.kind === "cardio" ? x.c.date : x.s.date;
          const wk = weekStartMon(new Date(dateOf(it))).getTime();
          const neueWoche =
            idx === 0 || weekStartMon(new Date(dateOf(items[idx - 1]))).getTime() !== wk;
          const folio = neueWoche ? (
            <p className="px-1 pt-2 text-3xs font-semibold uppercase tracking-label text-muted">
              KW {isoWeek(new Date(dateOf(it)))}
            </p>
          ) : null;
          if (it.kind === "cardio") {
            const c = it.c;
            const Icon = SPORT_ICON[c.sport ?? "other"];
            const key = `c-${c.id}`;
            const isOpen = expanded === key;
            return (
              <Fragment key={key}>
                {folio}
                <div className="overflow-hidden rounded-card bg-surface-1">
                  <Pressable
                    onClick={() => setExpanded(isOpen ? null : key)}
                    aria-expanded={isOpen}
                    className="flex w-full items-center gap-3 p-3 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-fokus"
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-pill bg-surface-2 text-fg">
                      <Icon size={18} aria-hidden />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="line-clamp-2 text-base font-semibold leading-snug text-fg">
                        {c.title || sportLabel(c.sport)}
                      </span>
                      <span className="block text-sm tabular-nums text-muted">{metricsLine(c)}</span>
                      {dupeIds.has(c.id) && (
                        <span className="mt-1 inline-block rounded-pill border border-warnung px-2 py-0.5 text-3xs font-semibold text-warnung">
                          möglich doppelt
                        </span>
                      )}
                    </span>
                    <span className="shrink-0 text-sm tabular-nums text-muted">{fmtDate(c.date)}</span>
                  </Pressable>
                  {isOpen && (
                    <div className="px-3 pb-3">{loeschZeile(key, () => void removeCardio(c.id))}</div>
                  )}
                </div>
              </Fragment>
            );
          }

          const { s, realIdx } = it;
          const key = `s-${realIdx}`;
          const isOpen = expanded === key;
          const v = sessionVolume(s);
          const gruppen = bandOfLogged(s, byId, log);
          const kaderZahl = gruppen.reduce((n, g) => n + g.kader.length, 0);
          const rekorde = rekordeJePlatte.get(s.date) ?? 0;
          return (
            <Fragment key={`s-${s.date}-${realIdx}`}>
              {folio}
              <div className="overflow-hidden rounded-card bg-surface-1">
                <Pressable
                  onClick={() => setExpanded(isOpen ? null : key)}
                  aria-expanded={isOpen}
                  className="block w-full px-4 pb-3 pt-3 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-fokus"
                >
                  <span className="flex items-start justify-between gap-3">
                    <span className="min-w-0">
                      <span className="flex items-center gap-2 text-sm tabular-nums text-muted">
                        Einheit {plattenNr.get(s) ?? "–"} · {fmtDate(s.date)}
                        {s.backTraffic && (
                          <span
                            className={cn("h-2 w-2 shrink-0 rounded-pill", trafficDot[s.backTraffic])}
                            aria-label={`Rücken ${s.backTraffic}`}
                          />
                        )}
                      </span>
                      {/* Zweizeilig statt abgeschnitten. */}
                      <span className="mt-0.5 line-clamp-2 text-base font-semibold leading-snug text-fg">
                        {s.dayName}
                      </span>
                    </span>
                    {v > 0 && (
                      <span className="shrink-0 text-right">
                        <span className="block text-base font-bold tabular-nums text-fg">
                          {v.toLocaleString("de-DE")} kg
                        </span>
                        <span className="block text-sm text-muted">Volumen</span>
                      </span>
                    )}
                  </span>
                  {/* Fingerabdruck der Einheit: das Phasenband dessen, was war. */}
                  <span className="mt-2.5 block">
                    <Phasenband gruppen={gruppen} groesse="mini" />
                  </span>
                  <span className="mt-2 flex items-baseline justify-between gap-2 text-sm text-muted">
                    <span className="tabular-nums">
                      {kaderZahl} {kaderZahl === 1 ? "Satz" : "Sätze"}
                      {s.durationMin ? ` · ${s.durationMin} Min` : ""}
                      {zeigeOrt && s.ort ? ` · ${s.ort}` : ""}
                    </span>
                    {rekorde > 0 && (
                      <span className="font-semibold tabular-nums text-rekord">
                        {rekorde} {rekorde === 1 ? "Rekord" : "Rekorde"}
                      </span>
                    )}
                  </span>
                </Pressable>

                {isOpen && (
                  <div className="space-y-2 border-t border-line-card px-4 pb-4 pt-3">
                    {(s.exercises ?? []).map((ex) => (
                      <div key={ex.id}>
                        <p className="text-sm font-semibold text-fg">
                          {ex.name}
                          {ex.note && <span className="font-normal text-muted"> · {ex.note}</span>}
                        </p>
                        <p className="text-sm tabular-nums text-muted">
                          {(ex.sets ?? [])
                            .filter((st) => !st.warmup)
                            .map((st) => fmtSatz(st.weight, st.reps, ex.unit === "Sek"))
                            .join(" · ") || "–"}
                        </p>
                      </div>
                    ))}
                    {s.debrief && s.debrief.length > 0 && (
                      <div className="rounded-inner bg-surface-0 px-3 py-2">
                        <p className="mb-1 flex items-center gap-1.5 text-3xs font-semibold uppercase tracking-label text-muted">
                          <AtlasMark size={12} className="text-fg" /> ATLAS
                        </p>
                        <p className="text-sm leading-relaxed text-muted">{s.debrief.join(" ")}</p>
                      </div>
                    )}
                    {s.note && (
                      <p className="rounded-inner bg-surface-0 px-3 py-2 text-sm text-muted">„{s.note}“</p>
                    )}
                    {loeschZeile(key, () => void deleteSession(realIdx))}
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
