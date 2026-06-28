"use client";

import { ChevronRight, Flame, Play, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { ActivityRings } from "@/components/rings/ActivityRings";
import { RingLegend } from "@/components/rings/RingLegend";
import { StreakCalendar } from "@/components/progress/StreakCalendar";
import { DurationBadge } from "@/components/home/DurationBadge";
import { CoachCard } from "@/components/coach/CoachCard";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { CountUp } from "@/components/ui/CountUp";
import { Readout } from "@/components/ui/Readout";
import { Reveal } from "@/components/ui/Reveal";
import { Pressable } from "@/components/ui/pressable";
import { useTraining } from "@/components/providers/TrainingProvider";
import { greeting, homeChips } from "@/lib/coaching";
import { TEMPLATE } from "@/lib/exercises";
import { tap } from "@/lib/haptics";
import { weeklyStreak } from "@/lib/stats";
import { coverageCount, weeklyVolume } from "@/lib/volume";
import { cn } from "@/lib/utils";

const BUDGETS = [20, 25, 30];

export default function HomePage() {
  const router = useRouter();
  const {
    recTpl,
    recList,
    activeKey,
    lastLabel,
    log,
    days,
    daysAgo,
    weekCount,
    ringMetrics,
    muscleVolumes,
    estimatedMin,
    settings,
    setBudget,
    coach,
    acceptDeload,
    dismissCard,
  } = useTraining();
  const tags = [...new Set(recList.map(({ ex }) => ex.tag))];
  const activeName = TEMPLATE.find((t) => t.key === activeKey)?.name;
  const chips = homeChips({ daysAgo, weekCount });
  const today = new Date().toLocaleDateString("de-DE", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  const streak = weeklyStreak(log);
  const volT = Math.round(weeklyVolume(log) / 100) / 10;
  const cov = coverageCount(muscleVolumes);

  const start = (key: string) => router.push(`/workout/${key}`);

  return (
    <div>
      <div className="mb-5 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-widest text-faint">{today}</p>
          <p className="font-display text-2xl font-semibold tracking-tight text-fg">
            {greeting({ name: settings.userName })}
          </p>
          <p className="mt-0.5 text-sm text-muted">{lastLabel}.</p>
        </div>
        {streak > 0 && (
          <div className="flex shrink-0 items-center gap-1.5 rounded-full border border-surface-3 bg-surface-1 px-3 py-1.5 shadow-card">
            <Flame size={16} style={{ color: "var(--accent)" }} />
            <span className="font-display text-sm font-semibold tabular-nums text-fg">{streak}</span>
            <span className="text-xs text-muted">Wo</span>
          </div>
        )}
      </div>

      {chips.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2">
          {chips.map((c, i) => (
            <Chip key={i} tone={c.tone}>
              {c.text}
            </Chip>
          ))}
        </div>
      )}

      {/* Instrument hero: the week's tonnage as the headline number + ring cluster. */}
      <Reveal>
        <Card variant="elevated" className="edge-top mb-5 rounded-3xl p-5">
          <Readout
            eyebrow="Volumen · diese Woche"
            value={volT}
            unit="t"
            decimals={1}
            size="lg"
            hint={`${weekCount} von 3 Einheiten · ${cov.hit}/${cov.total} Muskelgruppen abgedeckt`}
          />
          <div className="mt-5 flex items-center gap-5">
            <ActivityRings
              metrics={ringMetrics}
              size={128}
              stroke={12}
              gap={5}
              center={
                <p className="font-display text-2xl font-semibold leading-none tabular-nums">
                  <CountUp value={weekCount} />
                  <span className="text-base text-muted">/3</span>
                </p>
              }
            />
            <div className="min-w-0 flex-1">
              <RingLegend metrics={ringMetrics} />
            </div>
          </div>
        </Card>
      </Reveal>

      {coach.length > 0 && (
        <Reveal delay={0.05}>
          <div className="mb-4 space-y-2">
            {coach.map((c, i) => (
              <CoachCard
                key={c.kind + (c.exId ?? "") + i}
                card={c}
                onAccept={c.action === "deload" ? acceptDeload : undefined}
                onDismiss={() => dismissCard(c)}
              />
            ))}
          </div>
        </Reveal>
      )}

      <Reveal delay={0.1}>
        <Pressable
          onClick={() => router.push("/coach")}
          className="mb-4 flex w-full items-center justify-between rounded-2xl border border-surface-3 bg-surface-1 shadow-card px-4 py-3 text-left focus:outline-none"
        >
          <span className="flex items-center gap-2 text-sm font-medium text-fg">
            <Sparkles size={17} className="text-accent-coverage" /> Frag den Coach
          </span>
          <ChevronRight size={16} className="text-muted" />
        </Pressable>
      </Reveal>

      {activeKey && (
        <Pressable
          onClick={() => router.push(`/workout/${activeKey}`)}
          className="mb-4 flex w-full items-center justify-between rounded-2xl border border-surface-3 bg-surface-1 px-4 py-3 text-left shadow-card focus:outline-none"
        >
          <span className="text-sm text-accent-sessions">Einheit läuft · {activeName}</span>
          <span className="flex items-center gap-1 text-sm font-medium text-accent-sessions">
            Fortsetzen <ChevronRight size={16} />
          </span>
        </Pressable>
      )}

      {/* The one bold moment: today's recommended session. */}
      <Reveal delay={0.15}>
        <Card
          variant="elevated"
          className="glow-accent edge-top mb-5 overflow-hidden rounded-3xl p-5"
          style={{
            backgroundImage:
              "linear-gradient(135deg, rgba(255,255,255,.06), rgba(255,255,255,0) 42%)",
          }}
        >
          <p
            className="mb-2 font-mono text-xs uppercase tracking-widest"
            style={{ color: "var(--accent)" }}
          >
            Empfohlen heute
          </p>
          <h2 className="font-display text-3xl font-semibold tracking-tight">{recTpl.name}</h2>
          <p className="mb-3 text-muted">{recTpl.focus}</p>
          <div className="mb-4 flex items-center gap-2">
            <DurationBadge min={estimatedMin} />
            <div className="ml-auto flex gap-1">
              {BUDGETS.map((b) => (
                <Pressable
                  key={b}
                  onClick={() => setBudget(b)}
                  aria-label={`Zeitbudget ${b} Minuten`}
                  className={cn(
                    "rounded-lg px-2.5 py-1 text-xs font-medium tabular-nums focus:outline-none",
                    settings.timeBudgetMin === b
                      ? "bg-accent-coverage text-on-strong"
                      : "bg-surface-2 text-muted",
                  )}
                >
                  {b}
                </Pressable>
              ))}
            </div>
          </div>
          <div className="mb-5 flex flex-wrap gap-1.5">
            {tags.map((t) => (
              <span key={t} className="rounded-lg bg-surface-2 px-2 py-1 text-xs text-muted">
                {t}
              </span>
            ))}
          </div>
          <Pressable
            onClick={() => {
              tap();
              start(recTpl.key);
            }}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-strong py-4 text-lg font-semibold text-on-strong shadow-card-lg focus:outline-none"
          >
            <Play size={18} strokeWidth={2.5} /> Training starten
          </Pressable>
        </Card>
      </Reveal>

      <Reveal delay={0.2}>
        <p className="mb-2 px-1 text-xs text-muted">Oder andere Einheit</p>
        <div className="grid grid-cols-3 gap-2">
          {TEMPLATE.map((t) => (
            <Pressable
              key={t.key}
              onClick={() => start(t.key)}
              className="rounded-2xl border border-surface-3 bg-surface-1 px-3 py-3 text-left focus:outline-none"
            >
              <span
                className={
                  t.key === recTpl.key
                    ? "font-mono text-xs text-accent-sessions"
                    : "font-mono text-xs text-muted"
                }
              >
                {t.key}
              </span>
              <p className="mt-1 text-sm font-medium leading-tight">{t.focus}</p>
            </Pressable>
          ))}
          {days.map((d) => (
            <Pressable
              key={d.id}
              onClick={() => start(d.id)}
              className="rounded-2xl border border-surface-3 bg-surface-1 px-3 py-3 text-left focus:outline-none"
            >
              <span className="font-mono text-xs text-accent-coverage">Eigen</span>
              <p className="mt-1 truncate text-sm font-medium leading-tight">{d.name}</p>
            </Pressable>
          ))}
        </div>
      </Reveal>

      <Reveal delay={0.25}>
        <div className="mt-6">
          <StreakCalendar log={log} />
        </div>
      </Reveal>
    </div>
  );
}
