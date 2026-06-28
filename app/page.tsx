"use client";

import { ChevronRight, Play, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { ActivityRings } from "@/components/rings/ActivityRings";
import { RingLegend } from "@/components/rings/RingLegend";
import { StreakCalendar } from "@/components/progress/StreakCalendar";
import { DurationBadge } from "@/components/home/DurationBadge";
import { CoachCard } from "@/components/coach/CoachCard";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { CountUp } from "@/components/ui/CountUp";
import { Pressable } from "@/components/ui/pressable";
import { useTraining } from "@/components/providers/TrainingProvider";
import { greeting, homeChips } from "@/lib/coaching";
import { TEMPLATE } from "@/lib/exercises";
import { tap } from "@/lib/haptics";
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
    daysAgo,
    weekCount,
    ringMetrics,
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

  const start = (key: string) => router.push(`/workout/${key}`);

  return (
    <div>
      <div className="mb-6">
        <p className="font-display text-2xl font-semibold tracking-tight">{greeting(daysAgo)}</p>
        <p className="mt-1 text-sm text-neutral-500">{lastLabel}.</p>
        {chips.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {chips.map((c, i) => (
              <Chip key={i} tone={c.tone}>
                {c.text}
              </Chip>
            ))}
          </div>
        )}
      </div>

      <Card className="mb-5 flex items-center gap-5 rounded-3xl p-5">
        <ActivityRings
          metrics={ringMetrics}
          size={132}
          stroke={12}
          gap={5}
          center={
            <p className="font-display text-2xl font-semibold leading-none tabular-nums">
              <CountUp value={weekCount} />
              <span className="text-base text-neutral-500">/3</span>
            </p>
          }
        />
        <div className="min-w-0 flex-1">
          <RingLegend metrics={ringMetrics} />
        </div>
      </Card>

      {coach.length > 0 && (
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
      )}

      <Pressable
        onClick={() => router.push("/coach")}
        className="mb-4 flex w-full items-center justify-between rounded-2xl border border-surface-3 bg-surface-1 shadow-card px-4 py-3 text-left focus:outline-none"
      >
        <span className="flex items-center gap-2 text-sm font-medium text-neutral-100">
          <Sparkles size={17} className="text-accent-coverage" /> Frag den Coach
        </span>
        <ChevronRight size={16} className="text-neutral-500" />
      </Pressable>

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

      <Card
        variant="elevated"
        className="mb-5 overflow-hidden rounded-3xl p-5"
        style={{
          backgroundImage:
            "linear-gradient(135deg, rgba(255,255,255,.06), rgba(255,255,255,0) 42%)",
        }}
      >
        <p className="mb-2 font-mono text-xs uppercase tracking-widest text-neutral-400">
          Empfohlen heute
        </p>
        <h2 className="font-display text-3xl font-semibold tracking-tight">{recTpl.name}</h2>
        <p className="mb-3 text-neutral-400">{recTpl.focus}</p>
        <div className="mb-4 flex items-center gap-2">
          <DurationBadge min={estimatedMin} />
          <div className="ml-auto flex gap-1">
            {BUDGETS.map((b) => (
              <Pressable
                key={b}
                onClick={() => setBudget(b)}
                className={cn(
                  "rounded-lg px-2.5 py-1 text-xs font-medium tabular-nums focus:outline-none",
                  settings.timeBudgetMin === b
                    ? "bg-accent-coverage text-neutral-950"
                    : "bg-neutral-800 text-neutral-400",
                )}
              >
                {b}
              </Pressable>
            ))}
          </div>
        </div>
        <div className="mb-5 flex flex-wrap gap-1.5">
          {tags.map((t) => (
            <span
              key={t}
              className="rounded-lg bg-neutral-800 px-2 py-1 text-xs text-neutral-300"
            >
              {t}
            </span>
          ))}
        </div>
        <Pressable
          onClick={() => {
            tap();
            start(recTpl.key);
          }}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-neutral-100 py-4 text-lg font-semibold text-neutral-950 shadow-card-lg focus:outline-none"
        >
          <Play size={18} strokeWidth={2.5} /> Training starten
        </Pressable>
      </Card>

      <p className="mb-2 px-1 text-xs text-neutral-500">Oder andere Einheit</p>
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
                  : "font-mono text-xs text-neutral-500"
              }
            >
              {t.key}
            </span>
            <p className="mt-1 text-sm font-medium leading-tight">{t.focus}</p>
          </Pressable>
        ))}
      </div>

      <div className="mt-6">
        <StreakCalendar log={log} />
      </div>
    </div>
  );
}
