"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { CheckCircle2, ChevronRight, RefreshCw, ShieldAlert, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { StreakCalendar } from "@/components/progress/StreakCalendar";
import { SessionCard } from "@/components/home/SessionCard";
import { SessionEditSheet } from "@/components/home/SessionEditSheet";
import { CoachCard } from "@/components/coach/CoachCard";
import { AtlasMark } from "@/components/trainer/AtlasMark";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { Odometer } from "@/components/ui/Odometer";
import { Pressable } from "@/components/ui/pressable";
import { useTraining } from "@/components/providers/TrainingProvider";
import { trainingLevel } from "@/lib/achievements";
import { athletePersona, effectiveProfile } from "@/lib/athlete";
import { greeting, homeChips } from "@/lib/coaching";
import { isoWeek } from "@/lib/format";
import { tap } from "@/lib/haptics";
import { loadActiveState } from "@/lib/active-session";
import { generateFallbackSession } from "@/lib/session-fallback";
import {
  resolveDailySession,
  todayKey,
  type DailySession,
  type SessionVariant,
} from "@/lib/session-model";
import { estimateSessionMin } from "@/lib/session-time";
import { SPRING } from "@/lib/motion";
import { weeklyStreak } from "@/lib/stats";
import { requestAtlasSession } from "@/lib/today-session";
import { cn } from "@/lib/utils";

export default function HomePage() {
  const router = useRouter();
  const reduce = useReducedMotion();
  const {
    todaySession,
    setTodaySession,
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
  // Kurzform — die Hero-Kopfzeile muss neben Level/Woche in EINE Zeile passen.
  const today = now.toLocaleDateString("de-DE", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
  const kw = isoWeek(now);
  const greetingSeed = useMemo(() => Math.floor(Math.random() * 100000), []);

  const [editing, setEditing] = useState(false);
  const [composing, setComposing] = useState(false);

  // Läuft gerade eine Einheit? Der Live-State lebt gerätelokal (KEYS.active) —
  // hier nur lesen, der Runner verwaltet ihn.
  const [running, setRunning] = useState<{ name: string } | null>(null);
  useEffect(() => {
    let alive = true;
    void loadActiveState().then((st) => {
      if (alive) setRunning(st ? { name: st.session.name } : null);
    });
    return () => {
      alive = false;
    };
  }, []);

  // Laufende Referenzen für die asynchrone KI-Antwort: nur eine unveränderte
  // Fallback-Session desselben Kompositions-Laufs darf ersetzt werden.
  const genRef = useRef(0);
  const sessionRef = useRef<DailySession | null>(null);
  sessionRef.current = todaySession;
  const runningRef = useRef(false);
  runningRef.current = !!running;

  const sessionLocked = !!running || !!todaySession?.completedAt;

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
      if (runningRef.current) return;
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

  const start = () => {
    // Ab jetzt keine späte KI-Antwort mehr übernehmen — der Runner friert
    // seine eigene Fassung ein.
    runningRef.current = true;
    router.push("/workout");
  };

  // „Rücken heute schonen”: Umschalten komponiert neu (solange nicht gestartet).
  const toggleSpare = () => {
    tap();
    const next = !backSpareToday;
    setBackSpareToday(next);
    if (!running && todaySession && !todaySession.completedAt) {
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
      {/* Das blaue Farbfeld — Zustand und Tagesauftrag in einem Blick.
          Untere Zeile (ATLAS-Direktive) öffnet den Coach. */}
      <header className="mb-4 overflow-hidden rounded-card bg-accent-sessions text-on-accent shadow-card">
        <div className="px-5 pb-5 pt-4">
          <div className="flex items-baseline justify-between gap-2 font-mono text-xs uppercase tracking-widest">
            <span className="whitespace-nowrap">
              {today} · KW <span className="tabular-nums">{kw}</span>
            </span>
            <span className="whitespace-nowrap tabular-nums">
              Lv {level.level} · {weekCount}/3
            </span>
          </div>
          <h1 className="mt-3 font-display text-3xl font-bold tracking-tight">
            {greeting({ name: settings.userName, seed: greetingSeed })}
          </h1>
          <p className="mt-1 text-sm">
            {lastLabel}.{streak > 0 ? ` ${streak} ${streak === 1 ? "Woche" : "Wochen"} in Serie.` : ""}
          </p>
        </div>
        <Pressable
          onClick={() => router.push("/coach")}
          aria-label="ATLAS öffnen"
          className="block w-full px-5 py-3 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-on-accent"
          style={{ backgroundColor: "rgba(0, 0, 0, 0.16)" }}
        >
          <span className="flex items-center gap-2">
            <AtlasMark size={15} className="shrink-0" />
            <span className="font-mono text-xs uppercase tracking-widest">ATLAS</span>
            <span className="ml-auto font-mono text-xs tabular-nums">
              Mission <Odometer value={Math.round(trainer.mission.pct * 100)} /> %
            </span>
          </span>
          <span className="mt-1 flex items-start justify-between gap-2">
            <span className="min-w-0 text-sm leading-snug">{trainer.directive.text}</span>
            <ChevronRight size={15} className="mt-0.5 shrink-0" aria-hidden />
          </span>
        </Pressable>
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

      {running && (
        <Pressable
          onClick={() => router.push("/workout")}
          className="mb-4 flex w-full items-center justify-between gap-3 rounded-card border border-line bg-surface-1 px-4 py-3 text-left shadow-card"
        >
          <span className="min-w-0 truncate text-sm text-accent-ink">
            Einheit läuft · {running.name}
          </span>
          <span className="flex shrink-0 items-center gap-1 text-sm font-medium text-accent-ink">
            Fortsetzen <ChevronRight size={16} />
          </span>
        </Pressable>
      )}

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
          onStart={start}
          onEdit={() => setEditing(true)}
          onRegenerate={(wish) => compose({ wish })}
          regenerating={composing}
          locked={!!running}
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
          {/* Wegwischen einer Karte gleitet, statt zu springen — Nachbarn
              rücken per Layout-FLIP (transform, GPU) nach. */}
          <AnimatePresence initial={false}>
            {actionCards.map((c) => (
              <motion.div
                key={c.kind + (c.exId ?? "")}
                layout={reduce ? false : true}
                exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.97 }}
                transition={SPRING.panel}
              >
                <CoachCard
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
              </motion.div>
            ))}
          </AnimatePresence>
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
