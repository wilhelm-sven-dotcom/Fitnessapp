"use client";

import { CheckCircle2, ChevronRight, RefreshCw, ShieldAlert, ShieldCheck, Trophy } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { StreakCalendar } from "@/components/progress/StreakCalendar";
import { SessionCard } from "@/components/home/SessionCard";
import { SessionEditSheet } from "@/components/home/SessionEditSheet";
import { CoachCard } from "@/components/coach/CoachCard";
import { AtlasMark } from "@/components/trainer/AtlasMark";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { StreakFlame } from "@/components/ui/StreakFlame";
import { Pressable } from "@/components/ui/pressable";
import { useTraining } from "@/components/providers/TrainingProvider";
import { trainingLevel } from "@/lib/achievements";
import { athletePersona, effectiveProfile } from "@/lib/athlete";
import { greeting, homeChips } from "@/lib/coaching";
import { isoWeek } from "@/lib/format";
import { tap } from "@/lib/haptics";
import { generateFallbackSession } from "@/lib/session-fallback";
import {
  resolveDailySession,
  todayKey,
  type DailySession,
  type SessionVariant,
} from "@/lib/session-model";
import { estimateSessionMin } from "@/lib/session-time";
import { weeklyStreak } from "@/lib/stats";
import { requestAtlasSession } from "@/lib/today-session";
import { cn } from "@/lib/utils";

export default function HomePage() {
  const router = useRouter();
  const {
    todaySession,
    setTodaySession,
    activeKey,
    sessionTemplate,
    lastLabel,
    log,
    equip,
    body,
    cardio,
    exerciseNotes,
    daysAgo,
    weekCount,
    settings,
    setBudget,
    coach,
    trainer,
    todayReadiness,
    allLib,
    acceptDeload,
    acceptExam,
    dismissCard,
    lastBackRed,
    backSpareToday,
    setBackSpareToday,
    backSafeActive,
  } = useTraining();

  const has = useMemo(
    () => (k: string) => (equip as string[]).includes(k),
    [equip],
  );
  const level = useMemo(() => trainingLevel({ log, allLib, settings }), [log, allLib, settings]);
  const chips = homeChips({ daysAgo, weekCount });
  const streak = weeklyStreak(log);
  const now = new Date();
  const today = now.toLocaleDateString("de-DE", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  const kw = isoWeek(now);
  const greetingSeed = useMemo(() => Math.floor(Math.random() * 100000), []);

  const [editing, setEditing] = useState(false);
  const [composing, setComposing] = useState(false);

  // Laufende Referenzen für die asynchrone KI-Antwort: nur eine unveränderte
  // Fallback-Session desselben Kompositions-Laufs darf ersetzt werden.
  const genRef = useRef(0);
  const sessionRef = useRef<DailySession | null>(null);
  sessionRef.current = todaySession;
  const activeRef = useRef<string | null>(null);
  activeRef.current = activeKey;

  const sessionLocked = activeKey === "today" || !!todaySession?.completedAt;

  /** Frisch komponieren: Fallback sofort, ATLAS ersetzt still, wenn möglich. */
  const compose = (opts: { wish?: string; variant?: SessionVariant } = {}) => {
    const gen = ++genRef.current;
    const variant = opts.variant ?? "normal";
    const fallback = generateFallbackSession({
      allLib,
      has,
      log,
      budgetMin: settings.timeBudgetMin,
      backSafe: backSafeActive,
      injuries: effectiveProfile(settings, body).injuries,
      variant,
    });
    setTodaySession(opts.wish ? { ...fallback, wish: opts.wish } : fallback);
    setComposing(true);

    // KI abgeschaltet → beim Fallback bleiben (bewusste Nutzer-Entscheidung).
    if (settings.aiPlanning === false) {
      setComposing(false);
      return;
    }
    const readinessLine = todayReadiness
      ? `Tagesform (Check-in): Schlaf ${todayReadiness.sleep}/3, Energie ${todayReadiness.energy}/3, Rücken ${todayReadiness.back}/3.`
      : "";
    void requestAtlasSession({
      allLib,
      has,
      log,
      body,
      cardio,
      exerciseNotes,
      budgetMin: settings.timeBudgetMin,
      wish: opts.wish,
      variant,
      backSafe: backSafeActive,
      persona: athletePersona(effectiveProfile(settings, body), settings.userName),
      readinessLine,
    }).then((s) => {
      setComposing(false);
      if (!s || genRef.current !== gen) return;
      const cur = sessionRef.current;
      // Nur die eigene, unveränderte Fallback-Fassung ersetzen — nie eine
      // editierte oder bereits gestartete Einheit.
      if (activeRef.current === "today") return;
      if (cur && cur.date === s.date && cur.source === "fallback" && !cur.edited) {
        setTodaySession(s);
      }
    });
  };

  // Beim ersten Öffnen des Tages (oder nach Mitternacht) frisch komponieren.
  const needsCompose = !todaySession || todaySession.date !== todayKey();
  useEffect(() => {
    if (needsCompose) compose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [needsCompose]);

  const resolved = useMemo(
    () => (todaySession ? resolveDailySession(todaySession, allLib, has) : []),
    [todaySession, allLib, has],
  );
  const estimatedMin = useMemo(() => estimateSessionMin(resolved), [resolved]);

  const start = (key: string) => router.push(`/workout/${key}`);
  const activeName = activeKey ? sessionTemplate(activeKey)?.name : undefined;

  // „Rücken heute schonen”: Umschalten komponiert neu (solange nicht gestartet).
  const toggleSpare = () => {
    tap();
    const next = !backSpareToday;
    setBackSpareToday(next);
    if (activeKey !== "today" && todaySession && !todaySession.completedAt) {
      // Recompose mit neuem Schon-Status — der Effekt sieht backSafeActive
      // erst nächsten Render, deshalb hier explizit.
      setTimeout(() => compose(), 0);
    }
  };

  const spareEl = (
    <div>
      {lastBackRed ? (
        <p className="flex items-center gap-1.5 font-mono text-xs text-status-over">
          <ShieldAlert size={13} aria-hidden /> Rückenschonung aktiv — letzte Einheit „rot“
        </p>
      ) : (
        <Pressable
          onClick={toggleSpare}
          aria-pressed={backSpareToday}
          className={cn(
            "flex items-center gap-1.5 rounded-pill px-3 py-2 text-xs font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-sessions",
            backSpareToday ? "bg-accent-sessions text-on-accent" : "bg-surface-2 text-muted",
          )}
        >
          <ShieldCheck size={13} aria-hidden /> Rücken heute schonen
        </Pressable>
      )}
      {backSafeActive && !sessionLocked && (
        <Pressable
          onClick={() => {
            tap();
            compose({ variant: "reset" });
          }}
          className="mt-2 flex items-center gap-1 text-xs font-medium text-accent-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-sessions"
        >
          <ChevronRight size={13} aria-hidden /> Oder: Rücken-Reset komponieren — ganz ohne Gewichte
        </Pressable>
      )}
    </div>
  );

  const actionCards = coach.filter((c) => c.severity !== "info" || c.action);

  return (
    <div className="relative">
      <header className="mb-4">
        <p className="font-mono text-xs uppercase tracking-widest text-accent-2">
          {today} · KW {kw}
        </p>
        <h1 className="mt-1 font-display text-3xl font-bold tracking-tight text-fg">
          {greeting({ name: settings.userName, seed: greetingSeed })}
        </h1>
        <p className="mt-0.5 text-sm text-muted">{lastLabel}.</p>
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

      {chips.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2">
          {chips.map((c, i) => (
            <Chip key={i} tone={c.tone}>
              {c.text}
            </Chip>
          ))}
        </div>
      )}

      {activeKey && (
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
      )}

      {/* ATLAS-Status: die Tages-Direktive als ruhige Zeile — Details im Coach. */}
      <Pressable
        onClick={() => router.push("/coach")}
        aria-label="ATLAS öffnen"
        className="mb-4 block w-full rounded-card border border-line bg-surface-1 px-4 py-3 text-left shadow-card focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-sessions"
      >
        <span className="flex items-center gap-2">
          <AtlasMark size={15} className="shrink-0 text-fg" />
          <span className="font-mono text-xs uppercase tracking-widest text-accent-2">
            ATLAS
          </span>
          <span className="ml-auto font-mono text-xs tabular-nums text-faint">
            Mission {Math.round(trainer.mission.pct * 100)} %
          </span>
        </span>
        <span className="mt-1.5 flex items-start justify-between gap-2">
          <span className="min-w-0 text-sm leading-snug text-fg">
            {trainer.directive.text}
          </span>
          <ChevronRight size={15} className="mt-0.5 shrink-0 text-faint" />
        </span>
      </Pressable>

      {/* Die heutige Einheit — das eine Herzstück der Seite. */}
      {todaySession?.completedAt ? (
        <Card variant="elevated" className="mb-4 rounded-card p-6">
          <p className="flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-accent-2">
            <CheckCircle2 size={14} className="text-status-in" /> Heute erledigt
          </p>
          <h2 className="mt-1 font-display text-2xl font-bold tracking-tight text-fg">
            {todaySession.name}
          </h2>
          <p className="mt-1 text-sm text-muted">
            Stark. Erholung ist jetzt Teil des Trainings — morgen komponiert
            ATLAS die nächste Einheit.
          </p>
          <Pressable
            onClick={() => compose()}
            className="mt-4 flex items-center gap-1.5 rounded-pill bg-surface-2 px-3 py-2 text-xs font-medium text-fg focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-sessions"
          >
            <RefreshCw size={13} /> Noch eine Einheit komponieren
          </Pressable>
        </Card>
      ) : todaySession && todaySession.items.length > 0 ? (
        <SessionCard
          session={todaySession}
          allLib={allLib}
          estimatedMin={estimatedMin}
          budgetMin={settings.timeBudgetMin}
          onBudget={(min) => {
            setBudget(min);
            if (!sessionLocked && !todaySession.edited) {
              setTimeout(() => compose({ wish: todaySession.wish }), 0);
            }
          }}
          onStart={() => start("today")}
          onEdit={() => setEditing(true)}
          onRegenerate={(wish) => compose({ wish })}
          regenerating={composing}
          locked={activeKey === "today"}
          spareSlot={spareEl}
        />
      ) : (
        <Card variant="elevated" className="mb-4 rounded-card p-6">
          <p className="font-mono text-xs uppercase tracking-widest text-accent-2">
            Deine Einheit heute
          </p>
          <p className="mt-2 text-sm text-muted">
            ATLAS stellt deine Einheit zusammen…
          </p>
        </Card>
      )}

      {actionCards.length > 0 && (
        <div className="mb-4 space-y-2">
          {actionCards.map((c, i) => (
            <CoachCard
              key={c.kind + (c.exId ?? "") + i}
              card={c}
              onAccept={
                c.action === "deload"
                  ? acceptDeload
                  : c.action === "exam"
                    ? () => {
                        acceptExam();
                        compose({ variant: "exam" });
                      }
                    : c.action === "back-reset"
                      ? () => compose({ variant: "reset" })
                      : undefined
              }
              onDismiss={() => dismissCard(c)}
            />
          ))}
        </div>
      )}

      <StreakCalendar log={log} />

      {todaySession && (
        <SessionEditSheet
          open={editing}
          onClose={() => setEditing(false)}
          session={todaySession}
          allLib={allLib}
          has={has}
          onChange={setTodaySession}
        />
      )}
    </div>
  );
}
