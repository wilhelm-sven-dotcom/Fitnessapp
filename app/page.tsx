"use client";

import { ChevronRight, Flame, Play, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { StreakCalendar } from "@/components/progress/StreakCalendar";
import { VolumeGauge } from "@/components/home/VolumeGauge";
import { DurationBadge } from "@/components/home/DurationBadge";
import { CoachCard } from "@/components/coach/CoachCard";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
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
    sessionTemplate,
    lastLabel,
    log,
    days,
    equip,
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
  const activeName = activeKey ? sessionTemplate(activeKey)?.name : undefined;
  const chips = homeChips({ daysAgo, weekCount });
  const now = new Date();
  const today = now.toLocaleDateString("de-DE", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  // Calendar week — the magazine masthead's "issue number" (editorial skin).
  const kw = Math.ceil(
    ((now.getTime() - new Date(now.getFullYear(), 0, 1).getTime()) / 86400000 + 1) / 7,
  );
  const streak = weeklyStreak(log);
  // New phrase each time the home mounts (client-only, so no SSR/hydration drift).
  const greetingSeed = useMemo(() => Math.floor(Math.random() * 100000), []);
  const volT = Math.round(weeklyVolume(log) / 100) / 10;
  const volTargetT = (ringMetrics.find((m) => m.id === "exercise")?.target ?? 1000) / 1000;
  const cov = coverageCount(muscleVolumes);

  const start = (key: string) => router.push(`/workout/${key}`);

  return (
    <div className="relative">
      {/* Editorial skin: a magazine nameplate — issue folio, big Anton masthead,
          tagline, framed by rules. Hidden in the other skins. */}
      <div className="only-editorial mb-6">
        <div className="flex items-center justify-between border-b border-line pb-1.5 font-mono text-xs uppercase tracking-widest text-accent-2">
          <span>Ausgabe · KW {kw}</span>
          <span>{today}</span>
        </div>
        <h2 className="my-1.5 text-center font-display text-6xl font-bold uppercase leading-none tracking-tight text-fg">
          Training
        </h2>
        <div className="border-t border-line pt-1.5 text-center font-mono text-xs uppercase tracking-widest text-faint">
          Kraft · Form · Fortschritt
        </div>
      </div>

      <header className="mb-5">
        <p className="font-mono text-xs uppercase tracking-widest text-accent-2">
          {today} · {recTpl.focus}
        </p>
        <div className="mt-1 flex items-start justify-between gap-3">
          <h1 className="font-display text-3xl font-bold tracking-tight text-fg">
            {greeting({ name: settings.userName, seed: greetingSeed })}
          </h1>
          {streak > 0 && (
            <div className="flex shrink-0 items-center gap-1.5 rounded-pill border border-line bg-surface-1 px-3 py-1.5 shadow-card">
              <Flame size={15} className="text-accent-ink" />
              <span className="font-display text-sm font-bold tabular-nums text-fg">{streak}</span>
              <span className="text-xs text-muted">Wo</span>
            </div>
          )}
        </div>
        <p className="mt-0.5 text-sm text-muted">{lastLabel}.</p>
      </header>

      {chips.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2">
          {chips.map((c, i) => (
            <Chip key={i} tone={c.tone}>
              {c.text}
            </Chip>
          ))}
        </div>
      )}

      {/* Signature: the week's tonnage as a calibrated instrument. */}
      <Reveal>
        <Card variant="elevated" className="edge-top bg-hero-sheen mb-4 overflow-hidden rounded-card p-6">
          <VolumeGauge valueT={volT} targetT={volTargetT} />
          <div className="mt-5 flex items-center gap-5 border-t border-line pt-4 font-mono text-xs">
            <span>
              <span className="text-accent-2">EINH.</span>{" "}
              <span className="tabular-nums text-fg">{weekCount}/3</span>
            </span>
            <span>
              <span className="text-accent-2">ABDECKUNG</span>{" "}
              <span className="tabular-nums text-fg">
                {cov.hit}/{cov.total}
              </span>
            </span>
            {streak > 0 && (
              <span>
                <span className="text-accent-2">SERIE</span>{" "}
                <span className="tabular-nums text-fg">{streak} Wo</span>
              </span>
            )}
          </div>
        </Card>
      </Reveal>

      {activeKey && (
        <Reveal delay={0.06}>
          <Pressable
            onClick={() => router.push(`/workout/${activeKey}`)}
            className="mb-4 flex w-full items-center justify-between gap-3 rounded-card border border-line bg-surface-1 px-4 py-3 text-left shadow-card"
          >
            <span className="min-w-0 truncate text-sm text-accent-ink">
              Einheit läuft · {activeName}
            </span>
            <span className="flex shrink-0 items-center gap-1 text-sm font-medium text-accent-ink">
              Fortsetzen <ChevronRight size={16} />
            </span>
          </Pressable>
        </Reveal>
      )}

      {coach.length > 0 && (
        <Reveal delay={0.12}>
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

      {/* The one bold moment: today's recommended session. */}
      <Reveal delay={0.16}>
        <Card variant="elevated" className="glow-accent edge-top bg-hero-sheen mb-4 overflow-hidden rounded-card p-6">
          <p className="mb-2 font-mono text-xs uppercase tracking-widest text-live">▸ Empfohlen heute</p>
          <h2 className="font-display text-4xl font-bold tracking-tight">{recTpl.name}</h2>
          <p className="mb-3 text-muted">{recTpl.focus}</p>
          <div className="mb-4 flex items-center gap-2">
            <DurationBadge min={estimatedMin} />
            <div className="ml-auto flex gap-2">
              {BUDGETS.map((b) => (
                <Pressable
                  key={b}
                  onClick={() => setBudget(b)}
                  aria-label={`Zeitbudget ${b} Minuten`}
                  aria-pressed={settings.timeBudgetMin === b}
                  className={cn(
                    "rounded-pill px-3 py-2 text-xs font-medium tabular-nums",
                    settings.timeBudgetMin === b
                      ? "bg-accent-sessions text-on-accent"
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
              <span key={t} className="rounded-pill bg-surface-2 px-2 py-1 text-xs text-muted">
                {t}
              </span>
            ))}
          </div>
          <Pressable
            onClick={() => {
              tap();
              start(recTpl.key);
            }}
            className="flex w-full items-center justify-center gap-2 rounded-card bg-accent-sessions py-4 text-lg font-bold text-on-accent shadow-card-lg"
          >
            <Play size={18} strokeWidth={2.5} /> Training starten
          </Pressable>
        </Card>
      </Reveal>

      <Reveal delay={0.22}>
        <Pressable
          onClick={() => router.push("/coach")}
          className="mb-5 flex w-full items-center justify-between rounded-card border border-line bg-surface-1 px-4 py-3 text-left shadow-card"
        >
          <span className="flex items-center gap-2 text-sm font-medium text-fg">
            <Sparkles size={17} className="text-accent-coverage" /> Frag den Coach
          </span>
          <ChevronRight size={16} className="text-muted" />
        </Pressable>
      </Reveal>

      <Reveal delay={0.28}>
        <p className="mb-2 px-1 font-mono text-xs uppercase tracking-widest text-faint">Oder andere Einheit</p>
        <div className="grid grid-cols-3 gap-2">
          {TEMPLATE.map((t) => {
            const isRec = t.key === recTpl.key;
            return (
              <Pressable
                key={t.key}
                onClick={() => start(t.key)}
                aria-label={isRec ? `${t.focus} · empfohlen` : t.focus}
                className="rounded-card border border-line bg-surface-1 px-3 py-3 text-left shadow-card"
              >
                <span className={cn("font-mono text-xs", isRec ? "text-accent-ink" : "text-muted")}>
                  {isRec && <span aria-hidden>• </span>}
                  {t.key}
                </span>
                <p className="mt-1 text-sm font-medium leading-tight">{t.focus}</p>
              </Pressable>
            );
          })}
          {days.map((d) => (
            <Pressable
              key={d.id}
              onClick={() => start(d.id)}
              className="rounded-card border border-line bg-surface-1 px-3 py-3 text-left shadow-card"
            >
              <span className="font-mono text-xs text-accent-coverage">Eigen</span>
              <p className="mt-1 truncate text-sm font-medium leading-tight">{d.name}</p>
            </Pressable>
          ))}
          {(equip as string[]).includes("bike") && (
            <Pressable
              onClick={() => start("peloton")}
              className="rounded-card border border-line bg-surface-1 px-3 py-3 text-left shadow-card"
            >
              <span className="font-mono text-xs text-accent-coverage">Bike</span>
              <p className="mt-1 truncate text-sm font-medium leading-tight">Peloton</p>
            </Pressable>
          )}
        </div>
      </Reveal>

      <Reveal delay={0.34}>
        <div className="mt-5">
          <StreakCalendar log={log} />
        </div>
      </Reveal>
    </div>
  );
}
