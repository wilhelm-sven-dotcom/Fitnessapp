"use client";

import {
  Activity,
  Bike,
  Footprints,
  Plus,
  Trash2,
  Waves,
  Zap,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useTraining } from "@/components/providers/TrainingProvider";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { Pressable } from "@/components/ui/pressable";
import { Sheet } from "@/components/ui/sheet";
import { weeklyCardio } from "@/lib/cardio";
import {
  intensityLabel,
  kmLabel,
  paceLabel,
  SPORT_LABEL,
  SPORTS,
  sportLabel,
  type Sport,
} from "@/lib/cardio-sport";
import { fmtDate } from "@/lib/format";
import type { CardioSession } from "@/lib/types";
import { cn } from "@/lib/utils";

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

/** One-line metric summary for a session (duration · distance · pace · kcal · bpm · intensity). */
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

export default function AusdauerPage() {
  const { cardio, addManualCardio, removeCardio } = useTraining();
  const [open, setOpen] = useState(false);
  const [confirmDel, setConfirmDel] = useState<string | null>(null);

  // Manual-entry form state.
  const [sport, setSport] = useState<Sport>("run");
  const [min, setMin] = useState("");
  const [km, setKm] = useState("");
  const [kcal, setKcal] = useState("");
  const [hr, setHr] = useState("");
  const [intensity, setIntensity] =
    useState<NonNullable<CardioSession["intensity"]>>("moderate");

  const wk = weeklyCardio(cardio);
  const sorted = [...cardio].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );

  // Mögliche Duplikate: zwei Einheiten, die weniger als 5 Minuten auseinander
  // starten, sind fast sicher dieselbe Fahrt aus zwei Quellen (z. B. Peloton
  // nativ UND über HealthFit). Nur ein Hinweis — gelöscht wird von Hand.
  const dupeIds = new Set<string>();
  for (let i = 0; i < sorted.length; i++) {
    for (let j = i + 1; j < sorted.length; j++) {
      const dt = Math.abs(
        new Date(sorted[i].date).getTime() - new Date(sorted[j].date).getTime(),
      );
      if (dt < 5 * 60 * 1000) {
        dupeIds.add(sorted[i].id);
        dupeIds.add(sorted[j].id);
      }
    }
  }

  const num = (s: string) => {
    const n = parseFloat(s.replace(",", "."));
    return isFinite(n) && n > 0 ? n : undefined;
  };
  const canSave = num(min) != null;

  const reset = () => {
    setSport("run");
    setMin("");
    setKm("");
    setKcal("");
    setHr("");
    setIntensity("moderate");
  };

  const save = async () => {
    const m = num(min);
    if (m == null) return;
    const d = num(km);
    const cal = num(kcal);
    const bpm = num(hr);
    await addManualCardio({
      sport,
      date: new Date().toISOString(),
      durationSec: Math.round(m * 60),
      distance: d != null ? Math.round(d * 1000) : undefined,
      calories: cal != null ? Math.round(cal) : undefined,
      avgHr: bpm != null ? Math.round(bpm) : undefined,
      intensity,
      title: sportLabel(sport),
    });
    reset();
    setOpen(false);
  };

  const inputCls =
    "w-full rounded-pill bg-surface-2 px-3 py-2.5 text-sm tabular-nums text-fg placeholder:text-faint focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-sessions";
  const eyebrowCls = "mb-1.5 block font-mono text-xs uppercase tracking-widest text-muted";

  const stats = [
    { v: String(wk.count), l: "Einheiten" },
    { v: String(wk.minutes), l: "Minuten" },
    { v: kmLabel(wk.distance) ?? "—", l: "Distanz" },
    { v: wk.calories ? String(wk.calories) : "—", l: "kcal" },
  ];

  return (
    <div>
      <PageHeader
        eyebrow="Ausdauer"
        title="Ausdauer"
        subtitle="Läufe, Intervalle und Fahrten an einem Ort — der Coach bewertet sie mit."
      />

      {/* Wochensumme */}
      <div className="mb-4 grid grid-cols-4 gap-2">
        {stats.map((s) => (
          <div
            key={s.l}
            className="rounded-card border border-line bg-panel p-3 text-center shadow-card"
          >
            <p className="font-display text-lg font-semibold tabular-nums text-fg">{s.v}</p>
            <p className="mt-0.5 font-mono text-xs uppercase tracking-wider text-faint">{s.l}</p>
          </div>
        ))}
      </div>

      <Pressable
        onClick={() => setOpen(true)}
        className="mb-5 flex w-full items-center justify-center gap-2 rounded-pill bg-surface-2 py-2.5 text-sm font-medium text-fg"
      >
        <Plus size={16} /> Einheit hinzufügen
      </Pressable>

      {sorted.length === 0 ? (
        <EmptyState
          icon={Activity}
          title="Noch keine Ausdauer-Einheiten"
          description="Verbinde Strava in den Einstellungen — dann landen Läufe, Intervalle und Fahrten automatisch hier. Oder trag eine Einheit von Hand ein."
        />
      ) : (
        <div className="space-y-2">
          {sorted.map((c) => {
            const Icon = SPORT_ICON[c.sport ?? "other"];
            return (
              <div
                key={c.id}
                className="flex items-center gap-3 rounded-card border border-line bg-panel p-3 shadow-card"
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
                  <p className="font-mono text-xs tabular-nums text-muted">{metricsLine(c)}</p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <span className="font-mono text-xs tabular-nums text-faint">
                    {fmtDate(c.date)}
                  </span>
                  {/* Alle Einheiten löschbar — auch Strava-Importe. Der Grabstein
                      (removeCardio) verhindert, dass der Sync sie zurückholt. */}
                  {confirmDel === c.id ? (
                    <button
                      onClick={() => {
                        void removeCardio(c.id);
                        setConfirmDel(null);
                      }}
                      className="font-mono text-xs text-status-danger focus:outline-none"
                    >
                      Löschen?
                    </button>
                  ) : (
                    <button
                      onClick={() => setConfirmDel(c.id)}
                      aria-label="Einheit löschen"
                      className="text-faint transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-ink"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Link
        href="/settings"
        className="mt-5 block text-center text-xs text-muted underline-offset-2 hover:underline"
      >
        Strava verbinden für automatische Läufe und Fahrten →
      </Link>

      <Sheet open={open} onClose={() => setOpen(false)} title="Einheit hinzufügen">
        <div className="space-y-4">
          <div>
            <p className={eyebrowCls}>Art</p>
            <div className="flex flex-wrap gap-1.5">
              {SPORTS.map((s) => (
                <Pressable
                  key={s}
                  onClick={() => setSport(s)}
                  className={cn(
                    "rounded-pill px-3 py-1.5 text-sm font-medium",
                    sport === s ? "bg-strong text-on-strong" : "bg-surface-2 text-muted",
                  )}
                >
                  {SPORT_LABEL[s]}
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
              {INTENSITIES.map((it) => (
                <Pressable
                  key={it.v}
                  onClick={() => setIntensity(it.v)}
                  className={cn(
                    "flex-1 rounded-pill py-2 text-sm font-medium",
                    intensity === it.v ? "bg-strong text-on-strong" : "bg-surface-2 text-muted",
                  )}
                >
                  {it.label}
                </Pressable>
              ))}
            </div>
          </div>

          <Pressable
            onClick={() => void save()}
            disabled={!canSave}
            className="mt-1 w-full rounded-card bg-accent-sessions py-3.5 text-base font-bold text-on-accent shadow-card-lg disabled:opacity-40"
          >
            Speichern
          </Pressable>
        </div>
      </Sheet>
    </div>
  );
}
