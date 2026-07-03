"use client";

import { ChevronRight, Newspaper, Play, Trophy } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { StreakCalendar } from "@/components/progress/StreakCalendar";
import { AmbientGlow } from "@/components/home/AmbientGlow";
import { HeroStage } from "@/components/home/HeroStage";
import { VolumeGauge } from "@/components/home/VolumeGauge";
import { DurationBadge } from "@/components/home/DurationBadge";
import { CoachCard } from "@/components/coach/CoachCard";
import { AtlasCard } from "@/components/trainer/AtlasCard";
import { AtlasMark } from "@/components/trainer/AtlasMark";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { StreakFlame } from "@/components/ui/StreakFlame";
import { Reveal } from "@/components/ui/Reveal";
import { Pressable } from "@/components/ui/pressable";
import { useTraining } from "@/components/providers/TrainingProvider";
import { trainingLevel } from "@/lib/achievements";
import { editorialDeck, greeting, homeChips } from "@/lib/coaching";
import { TEMPLATE } from "@/lib/exercises";
import { tap } from "@/lib/haptics";
import { weeklyAvgRir, weeklyStreak } from "@/lib/stats";
import { coverageCount, weeklyVolume } from "@/lib/volume";
import { cn } from "@/lib/utils";

const BUDGETS = [20, 25, 30];

/** Editorial "DIE WOCHE" stat cell — big Anton number, mono caption. */
function MagStat({
  value,
  unit,
  label,
  className,
}: {
  value: string;
  unit?: string;
  label: string;
  className?: string;
}) {
  return (
    <div className={cn("py-3", className)}>
      <p className="font-display text-4xl font-bold leading-none tracking-tight text-fg">
        {value}
        {unit && <span className="ml-1 font-mono text-sm font-normal text-muted">{unit}</span>}
      </p>
      <p className="mt-1 font-mono text-xs uppercase tracking-widest text-faint">{label}</p>
    </div>
  );
}

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
    trainer,
    allLib,
    cardioAdvice,
    acceptDeload,
    dismissCard,
  } = useTraining();
  const tags = [...new Set(recList.map((s) => s.ex?.tag).filter(Boolean))];
  const activeName = activeKey ? sessionTemplate(activeKey)?.name : undefined;
  const chips = homeChips({ daysAgo, weekCount });
  const now = new Date();
  const today = now.toLocaleDateString("de-DE", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  const wkShort = now.toLocaleDateString("de-DE", { weekday: "short" });
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
  const rirAvg = weeklyAvgRir(log);

  const start = (key: string) => router.push(`/workout/${key}`);

  // Editorial skin renders a magazine spread instead of the gauge hero. The home
  // only mounts after the provider finishes loading (AppShell gates on it), so
  // branching on the resolved skin here is hydration-safe (home isn't in SSR).
  const isEditorial = settings.skin === "editorial";
  const deck = editorialDeck({
    exCount: recList.length,
    minutes: estimatedMin,
    cardioLevel: cardioAdvice?.level,
    seed: greetingSeed,
  });
  const focusParts = recTpl.focus.split(" & ");
  const level = useMemo(() => trainingLevel({ log, allLib, settings }), [log, allLib, settings]);

  // Context blocks shared by both heroes (defined once; only the rendered branch mounts).
  const chipsEl =
    chips.length > 0 ? (
      <div className="mb-4 flex flex-wrap gap-2">
        {chips.map((c, i) => (
          <Chip key={i} tone={c.tone}>
            {c.text}
          </Chip>
        ))}
      </div>
    ) : null;

  const activeEl = activeKey ? (
    <Reveal delay={0.06}>
      <Pressable
        onClick={() => router.push(`/workout/${activeKey}`)}
        className="mb-4 flex w-full items-center justify-between gap-3 rounded-card border border-line bg-surface-1 px-4 py-3 text-left shadow-card"
      >
        <span className="min-w-0 truncate text-sm text-accent-ink">Einheit läuft · {activeName}</span>
        <span className="flex shrink-0 items-center gap-1 text-sm font-medium text-accent-ink">
          Fortsetzen <ChevronRight size={16} />
        </span>
      </Pressable>
    </Reveal>
  ) : null;

  // ATLAS absorbiert das Info-Geplauder (Plateau/Volumen/Recomp) in Mission +
  // Wache; als Karten bleiben nur handlungsrelevante Fälle mit eigenem CTA.
  const actionCards = coach.filter((c) => c.severity !== "info" || c.action);
  const coachEl =
    actionCards.length > 0 ? (
      <Reveal delay={0.12}>
        <div className="mb-4 space-y-2">
          {actionCards.map((c, i) => (
            <CoachCard
              key={c.kind + (c.exId ?? "") + i}
              card={c}
              onAccept={c.action === "deload" ? acceptDeload : undefined}
              onDismiss={() => dismissCard(c)}
            />
          ))}
        </div>
      </Reveal>
    ) : null;

  const atlasEl = (
    <Reveal delay={0.08}>
      <AtlasCard trainer={trainer} className="mb-4" />
    </Reveal>
  );

  return (
    <div className="relative">
      <AmbientGlow />
      {isEditorial ? (
        /* ── Editorial: a magazine spread — nameplate, cover-line, headline,
           serif deck, the week as a stat block, and the coach's pull-quote. ── */
        <section className="mb-6">
          <div className="flex items-baseline justify-between border-b-2 border-fg pb-2">
            <span className="font-display text-3xl font-bold uppercase tracking-tight text-fg">
              Training
            </span>
            <span className="font-mono text-xs uppercase tracking-widest text-accent-2">
              Nr. {kw} · {wkShort}
            </span>
          </div>

          <p className="mt-5 font-mono text-xs uppercase tracking-widest text-accent-ink">
            Empfohlen heute — {recTpl.name}
          </p>
          <h1 className="mt-1 font-display text-6xl font-bold uppercase leading-none tracking-tight text-fg">
            {focusParts.map((p, i) => (
              <span key={i}>
                {i > 0 && <span className="text-accent-ink">{" & "}</span>}
                {p}
              </span>
            ))}
          </h1>

          {/* „Der Trainer" — ATLAS als Magazin-Leader: Hairline, Kursiv-Direktive,
              Mission als Mono-Datenzeile. Kein Karten-Wrapper — der Spread bleibt flach. */}
          <Pressable
            onClick={() => {
              tap();
              router.push("/coach");
            }}
            aria-label="ATLAS öffnen"
            className="mt-4 block w-full border-t border-line pt-3 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-sessions"
          >
            <span className="flex items-center gap-2">
              <AtlasMark size={16} live className="text-fg" />
              <span className="font-mono text-xs uppercase tracking-widest text-accent-2">
                Der Trainer — ATLAS
              </span>
            </span>
            <p className="mt-2 font-body text-xl italic leading-snug text-fg">
              {trainer.directive.text}
            </p>
            <p className="mt-1 font-mono text-xs text-faint">{trainer.directive.reason}</p>
            <p className="mt-2 flex flex-wrap gap-x-3 gap-y-1 font-mono text-xs tabular-nums text-muted">
              {trainer.mission.meters.map((m) => (
                <span key={m.id}>
                  {m.current}/{m.target} {m.label.toUpperCase()}
                </span>
              ))}
            </p>
          </Pressable>

          <HeroStage slots={recList} compact className="mt-4" />
          <p className="mt-4 font-body text-lg italic leading-snug text-muted">{deck}</p>

          <Pressable
            onClick={() => {
              tap();
              start(recTpl.key);
            }}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-card bg-accent-sessions py-4 text-lg font-bold text-on-accent"
          >
            <Play size={18} strokeWidth={2.5} /> Training starten
          </Pressable>
          <div className="mt-3 flex items-center gap-2">
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

          <div className="mt-7">
            <div className="flex items-baseline justify-between border-b border-line pb-1.5">
              <span className="font-mono text-xs uppercase tracking-widest text-accent-2">
                Die Woche
              </span>
              <span className="font-body text-sm italic text-faint">{weekCount} von 3 Einheiten</span>
            </div>
            <div className="grid grid-cols-2">
              <MagStat
                value={String(volT).replace(".", ",")}
                unit="t"
                label="Volumen ges."
                className="border-b border-r border-line pr-4"
              />
              <MagStat
                value={`${cov.hit}/${cov.total}`}
                label="Muskelgruppen"
                className="border-b border-line pl-4"
              />
              <MagStat
                value={rirAvg != null ? rirAvg.toFixed(1).replace(".", ",") : "–"}
                unit="RIR"
                label="Anstrengung Ø"
                className="border-r border-line pr-4"
              />
              <MagStat value={String(estimatedMin)} unit="min" label="Heute geplant" className="pl-4" />
            </div>
          </div>

          <figure className="mt-7 border-t border-line pt-5">
            <div className="flex gap-2">
              <span aria-hidden className="font-display text-5xl leading-none text-accent-ink">
                „
              </span>
              <p className="font-body text-xl italic leading-snug text-fg">{trainer.statusLine}</p>
            </div>
            <figcaption className="mt-2 text-right font-mono text-xs uppercase tracking-widest text-accent-2">
              — ATLAS
            </figcaption>
          </figure>

          <div className="mt-6">
            {chipsEl}
            {activeEl}
            {coachEl}
            {/* Die Wache als Magazin-Fußzeile. */}
            <p className="flex flex-wrap gap-x-3 gap-y-1 border-t border-line pt-3 font-mono text-xs text-muted">
              {trainer.watch.map((w) => (
                <span
                  key={w.id}
                  className={cn(
                    w.tone === "alert" && "text-status-danger",
                    w.tone === "watch" && "text-status-over",
                  )}
                >
                  {w.label.toUpperCase()} {w.value}
                </span>
              ))}
            </p>
          </div>
        </section>
      ) : (
        /* ── Blueprint / Tactile: Kommandozentrale — ATLAS führt, die
           Empfehlung ist das eine fette Visual, Instrumente kompakt. ── */
        <>
          <header className="mb-4">
            <p className="font-mono text-xs uppercase tracking-widest text-accent-2">
              {today} · KW {kw}
            </p>
            <h1 className="mt-1 font-display text-3xl font-bold tracking-tight text-fg">
              {greeting({ name: settings.userName, seed: greetingSeed })}
            </h1>
            <p className="mt-0.5 text-sm text-muted">{lastLabel}.</p>
            {/* Status-Pills: Serie · Level · Einheiten — der Puls auf einen Blick. */}
            <div className="mt-3 flex flex-wrap gap-2">
              {streak > 0 && (
                <span className="flex items-center gap-1.5 rounded-pill border border-line bg-surface-1 px-3 py-1.5 shadow-card">
                  <StreakFlame size={14} className="text-accent-ink" />
                  <span className="font-display text-sm font-bold tabular-nums text-fg">{streak}</span>
                  <span className="text-xs text-muted">Wo</span>
                </span>
              )}
              <span className="flex items-center gap-1.5 rounded-pill border border-line bg-surface-1 px-3 py-1.5 shadow-card">
                <Trophy size={13} className="text-accent-ink" aria-hidden />
                <span className="font-display text-sm font-bold tabular-nums text-fg">
                  Lv {level.level}
                </span>
              </span>
              <span className="flex items-center gap-1.5 rounded-pill border border-line bg-surface-1 px-3 py-1.5 shadow-card">
                <span className="font-display text-sm font-bold tabular-nums text-fg">
                  {weekCount}/3
                </span>
                <span className="text-xs text-muted">Woche</span>
              </span>
            </div>
          </header>

          {chipsEl}
          {activeEl}

          {/* ATLAS führt: die Direktive ist das Erste, was der Trainer sagt. */}
          {atlasEl}

          {/* The one bold moment: today's recommended session. */}
          <Reveal delay={0.14}>
            <Card variant="elevated" className="glow-accent edge-top bg-hero-sheen mb-4 overflow-hidden rounded-card p-6">
              <p className="mb-2 font-mono text-xs uppercase tracking-widest text-live">▸ Empfohlen heute</p>
              <h2 className="font-display text-4xl font-bold leading-none tracking-tight">{recTpl.name}</h2>
              <p className="mt-1 text-muted">{recTpl.focus}</p>
              <p className="mb-3 mt-1 font-mono text-xs text-faint">
                {recList.length} Übungen · ~{estimatedMin} Min
              </p>
              <HeroStage slots={recList} className="mb-4" />
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
                {tags.slice(0, 3).map((t) => (
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

          {/* Instrumente kompakt: Tonnage-Strip + Kernzahlen (leer = verborgen). */}
          {log.length > 0 && (
            <Reveal delay={0.18}>
              <Card className="mb-4 p-4">
                <VolumeGauge valueT={volT} targetT={volTargetT} compact />
                <div className="mt-3 flex items-center gap-5 border-t border-line pt-3 font-mono text-xs">
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
                </div>
              </Card>
            </Reveal>
          )}

          {coachEl}
        </>
      )}

      <Reveal delay={0.2}>
        <Pressable
          onClick={() => router.push("/briefing")}
          className="mb-4 flex w-full items-center justify-between gap-3 rounded-card border border-line bg-surface-1 px-4 py-3 text-left shadow-card"
        >
          <span className="flex items-center gap-2 text-sm font-medium text-fg">
            <Newspaper size={17} className="text-accent-ink" /> ATLAS-Rapport
          </span>
          <span className="flex items-center gap-1 font-mono text-xs text-muted">
            KW {kw} <ChevronRight size={16} />
          </span>
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
