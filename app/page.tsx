"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { CheckCircle2, ChevronRight, RefreshCw, ShieldAlert, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { StreakCalendar } from "@/components/progress/StreakCalendar";
import { SessionCard } from "@/components/home/SessionCard";
import { SessionEditSheet } from "@/components/home/SessionEditSheet";
import { CoachCard } from "@/components/coach/CoachCard";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { Pressable } from "@/components/ui/pressable";
import { useTraining } from "@/components/providers/TrainingProvider";
import { athletePersona, effectiveProfile } from "@/lib/athlete";
import { homeChips } from "@/lib/coaching";
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
import { phaseState } from "@/lib/periodization";
import { fmtPlatteDatum, plattenNummer } from "@/lib/platte";
import { SPRING } from "@/lib/motion";
import { requestAtlasSession } from "@/lib/today-session";
import { cn } from "@/lib/utils";

export default function HomePage() {
  const router = useRouter();
  const reduce = useReducedMotion();
  const {
    todaySession,
    setTodaySession,
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
    disabledExercises,
  } = useTraining();

  const has = useMemo(
    () => (k: string) => (equip as string[]).includes(k),
    [equip],
  );
  const chips = homeChips({ daysAgo, weekCount });
  const now = new Date();
  // Kopf: laufende Einheiten-Nummer (abgeleitet, nie persistiert), Datum,
  // Zykluswoche aus der Periodisierung.
  const plattenNr = plattenNummer(log);
  const plattenDatum = fmtPlatteDatum(now);
  const zyklusWoche = phaseState(settings).cycleWeek;
  const saetzeGesamt = todaySession?.items.reduce((n, it) => n + it.sets, 0) ?? 0;

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
      disabled: disabledExercises,
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
      disabled: disabledExercises,
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
      {/* Kopf der heutigen Einheit — Nummer und Datum, Titel in Kursive,
          Bestandszeile (die Wortmarke trägt der App-Header). ATLAS spricht
          in seiner eigenen Karte in der SessionCard. */}
      <header className="mb-5">
        <div className="flex items-baseline justify-between gap-2 font-mono text-3xs font-semibold uppercase tracking-gesperrt-3 text-muted">
          <span>Deine Einheit heute</span>
          <span className="whitespace-nowrap tabular-nums">Zyklus · W{zyklusWoche}</span>
        </div>
        <p className="mt-4 font-mono text-3xs font-medium uppercase tracking-gesperrt-3 text-muted">
          Einheit <span className="tabular-nums">{plattenNr}</span> · {plattenDatum}
        </p>
        <h1 className="mt-1.5 font-display text-3xl italic leading-tight text-fg">
          {todaySession?.name ?? "Einheit wird zusammengestellt …"}
        </h1>
        {todaySession && todaySession.items.length > 0 && (
          <p className="mt-2 font-mono text-2xs uppercase tracking-gesperrt text-muted">
            <span className="tabular-nums">{todaySession.items.length}</span> Übungen ·{" "}
            <span className="tabular-nums">{saetzeGesamt}</span> Sätze · ca.{" "}
            <span className="tabular-nums">{estimatedMin}</span> Min
          </p>
        )}
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
        <Card className="mb-4 p-5">
          <p className="flex items-center gap-2 font-mono text-3xs font-semibold uppercase tracking-gesperrt text-muted">
            <CheckCircle2 size={14} className="text-cyanotypie" /> Heute erledigt
          </p>
          <h2 className="mt-1 font-display text-2xl italic text-fg">
            {todaySession.name}
          </h2>
          <p className="mt-1 text-sm text-muted">
            Die Einheit ist gespeichert. Erholung gehört dazu — morgen stellt
            ATLAS die nächste zusammen.
          </p>
          <Pressable
            onClick={() => compose()}
            className="mt-4 flex items-center gap-1.5 rounded-pill border border-strong px-3 py-2 font-mono text-xs font-semibold uppercase tracking-gesperrt-2 text-fg focus:outline-none focus-visible:ring-2 focus-visible:ring-cyanotypie"
          >
            <RefreshCw size={13} /> Noch eine Einheit
          </Pressable>
        </Card>
      ) : todaySession && todaySession.items.length > 0 ? (
        <SessionCard
          session={todaySession}
          allLib={allLib}
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
          direktive={trainer.directive.text}
        />
      ) : (
        <Card className="mb-4 p-5">
          <p className="font-mono text-3xs font-semibold uppercase tracking-gesperrt text-muted">
            Trainingsplan
          </p>
          <p className="mt-2 text-sm text-muted">ATLAS stellt die Einheit zusammen …</p>
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
