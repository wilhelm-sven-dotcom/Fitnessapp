"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { CheckCircle2, ChevronRight, RefreshCw, ShieldAlert, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { StreakCalendar } from "@/components/progress/StreakCalendar";
import { OrtFrage } from "@/components/home/OrtFrage";
import { SessionCard } from "@/components/home/SessionCard";
import { SessionEditSheet } from "@/components/home/SessionEditSheet";
import { CoachCard } from "@/components/coach/CoachCard";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { Pressable } from "@/components/ui/pressable";
import { Segment } from "@/components/ui/Segment";
import { useTraining } from "@/components/providers/TrainingProvider";
import { athletePersona, effectiveProfile } from "@/lib/athlete";
import { homeChips } from "@/lib/coaching";
import { tap } from "@/lib/haptics";
import { loadActiveState } from "@/lib/active-session";
import { geraeteLabels, ortSignatur } from "@/lib/orte";
import { reqOk } from "@/lib/progression";
import { generateFallbackSession } from "@/lib/session-fallback";
import {
  passeZeitAn,
  resolveDailySession,
  todayKey,
  type DailySession,
  type SessionVariant,
} from "@/lib/session-model";
import { estimateSessionMin } from "@/lib/session-time";
import { fmtPlatteDatum, plattenNummer } from "@/lib/platte";
import { SPRING } from "@/lib/motion";
import { requestAtlasSession, type AtlasFehler } from "@/lib/today-session";
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
    gyms,
    activeGym,
    waehleOrt,
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
  const saetzeGesamt = todaySession?.items.reduce((n, it) => n + it.sets, 0) ?? 0;

  const [editing, setEditing] = useState(false);
  const [composing, setComposing] = useState(false);
  /** Warum die letzte KI-Anfrage nichts lieferte — die Karte sagt es. */
  const [atlasFehler, setAtlasFehler] = useState<AtlasFehler | null>(null);

  // Läuft gerade eine Einheit? Der Live-State lebt gerätelokal (KEYS.active) —
  // hier nur lesen, der Runner verwaltet ihn.
  const [running, setRunning] = useState<{ name: string } | null>(null);
  /** Erst nach dieser Prüfung darf ein Ortswechsel neu komponieren. */
  const [aktivGeprueft, setAktivGeprueft] = useState(false);
  useEffect(() => {
    let alive = true;
    void loadActiveState().then((st) => {
      if (!alive) return;
      setRunning(st ? { name: st.session.name } : null);
      setAktivGeprueft(true);
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
  /** Verzögerte KI-Anfrage (Zeitregler) — wird bei jedem compose neu gesetzt. */
  const atlasTimer = useRef(0);
  /** Die EINE laufende KI-Anfrage; jede neue bricht sie ab. */
  const atlasAbort = useRef<AbortController | null>(null);
  const runningRef = useRef(false);
  runningRef.current = !!running;

  const sessionLocked = !!running || !!todaySession?.completedAt;

  // Trainingsort: die Signatur dieses Renders (Ort-Id + Geräte). compose()
  // stempelt sie auf die Einheit — weicht sie später ab, passt die Einheit
  // nicht mehr zum Ort.
  const mehrereOrte = gyms.length >= 2;
  const ortJetzt = activeGym
    ? { id: activeGym.id, name: activeGym.name, sig: ortSignatur(activeGym) }
    : undefined;

  /** Frisch komponieren: Fallback sofort, ATLAS ersetzt still, wenn möglich.
   *
   *  `budget` MUSS mitgegeben werden, wenn die Zeit gerade umgestellt wurde:
   *  `compose` läuft dann aus der Closure DIESES Renders und sähe in
   *  `settings.timeBudgetMin` noch den alten Wert — die Einheit wäre für die
   *  vorherige Zeit zusammengestellt. Dieselbe Falle gilt für `backSafe`
   *  (Rücken-Schalter, siehe toggleSpare). */
  const compose = (
    opts: {
      wish?: string;
      variant?: SessionVariant;
      budget?: number;
      /** Rückenschonung für DIESE Komposition — der Schalter setzt sie im
       *  selben Klick, die Closure kennt noch den alten Stand. */
      backSafe?: boolean;
      /** Verzögerung NUR für die KI-Anfrage. Der Fallback steht immer sofort —
       *  wer am Zeitregler tippt, soll die neue Einheit augenblicklich sehen
       *  und nicht auf eine Opus-Runde warten, die der nächste Klick ohnehin
       *  verwirft. */
      atlasDelayMs?: number;
    } = {},
  ) => {
    const gen = ++genRef.current;
    const variant = opts.variant ?? "normal";
    const budgetMin = opts.budget ?? settings.timeBudgetMin;
    const backSafe = opts.backSafe ?? backSafeActive;
    const ort = ortJetzt;
    const fallback = generateFallbackSession({
      allLib,
      has,
      log,
      budgetMin,
      backSafe,
      injuries: effectiveProfile(settings, body).injuries,
      variant,
      disabled: disabledExercises,
    });
    setTodaySession({
      ...fallback,
      ...(ort ? { ort } : {}),
      ...(opts.wish ? { wish: opts.wish } : {}),
    });
    setComposing(true);

    // KI abgeschaltet → beim Fallback bleiben (bewusste Nutzer-Entscheidung).
    if (settings.aiPlanning === false) {
      setComposing(false);
      return;
    }
    const readinessLine = todayReadiness
      ? `Tagesform (Check-in): Schlaf ${todayReadiness.sleep}/3, Energie ${todayReadiness.energy}/3, Rücken ${todayReadiness.back}/3.`
      : "";
    const frageAtlas = () => {
      if (genRef.current !== gen) return;
      // Genau EINE Anfrage unterwegs: die vorige wird abgebrochen. Vorher
      // löschte compose() nur den noch nicht gefeuerten Timer — ein bereits
      // laufender fetch hatte gar keinen Handle, also liefen bei jedem
      // weiteren Klick zusätzliche Opus-Runden parallel. Sie haben sich
      // gegenseitig ins Timeout gedrängt und nebenbei das Rate-Limit
      // (10/Minute) aufgebraucht — genau das „erst gut, dann gar nicht“.
      atlasAbort.current?.abort();
      const ctrl = new AbortController();
      atlasAbort.current = ctrl;
      requestAtlasSession(
        {
          allLib,
          has,
          log,
          body,
          cardio,
          exerciseNotes,
          budgetMin,
          wish: opts.wish,
          variant,
          backSafe,
          persona: athletePersona(effectiveProfile(settings, body), settings.userName),
          readinessLine,
          disabled: disabledExercises,
          ort: activeGym
            ? { name: activeGym.name, geraete: geraeteLabels(activeGym.equip) }
            : undefined,
        },
        { signal: ctrl.signal },
      )
        .then((r) => {
          if (genRef.current !== gen) return;
          setComposing(false);
          if ("fehler" in r) {
            // „abgebrochen“ heißt: der Nutzer hat weitergeklickt — kein Fehler.
            setAtlasFehler(r.fehler === "abgebrochen" ? null : r.fehler);
            return;
          }
          setAtlasFehler(null);
          const cur = sessionRef.current;
          // Nur die eigene, unveränderte Fallback-Fassung ersetzen — nie eine
          // editierte oder bereits gestartete Einheit, und nie eine für einen
          // inzwischen gewechselten Ort.
          if (runningRef.current) return;
          if (
            cur &&
            cur.date === r.session.date &&
            cur.source === "fallback" &&
            !cur.edited &&
            cur.ort?.sig === ort?.sig
          ) {
            setTodaySession(ort ? { ...r.session, ort } : r.session);
          }
        })
        .catch(() => {
          // Sicherheitsnetz: requestAtlasSession wirft nicht mehr, aber ein
          // Ladezustand darf unter keinen Umständen hängen bleiben.
          if (genRef.current === gen) setComposing(false);
        });
    };
    window.clearTimeout(atlasTimer.current);
    if (opts.atlasDelayMs) atlasTimer.current = window.setTimeout(frageAtlas, opts.atlasDelayMs);
    else frageAtlas();
  };

  // Beim ersten Öffnen des Tages (oder nach Mitternacht) frisch komponieren —
  // bei mehreren Orten erst, wenn der Ort für heute gewählt ist. Die Wahl
  // setzt `activeGymId` UND `ortTag` im selben Render; der Effekt läuft dann
  // mit frischer Closure (Geräte des gewählten Orts).
  const needsCompose = !todaySession || todaySession.date !== todayKey();
  const [ortTag, setOrtTag] = useState<string | null>(null);
  const frageOffen = mehrereOrte && needsCompose && ortTag !== todayKey();
  useEffect(() => {
    if (needsCompose && !frageOffen) compose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [needsCompose, frageOffen]);
  const waehleHeute = (id: string) => {
    tap();
    waehleOrt(id);
    setOrtTag(todayKey());
  };

  // Passt die Einheit nicht mehr zum Ort (Umschalter, Geräte geändert, Sync)?
  // Unberührt → neu zusammenstellen; ein Pfad für alle Auslöser. Bearbeitet →
  // nur Hinweis, die Eingriffe gehören dem Nutzer. Läuft/erledigt → nichts.
  const veraltet =
    !needsCompose &&
    !!todaySession?.ort &&
    !!ortJetzt &&
    todaySession.ort.sig !== ortJetzt.sig;
  const neuFuerOrt = aktivGeprueft && veraltet && !sessionLocked && !todaySession?.edited;
  useEffect(() => {
    if (neuFuerOrt) compose({ wish: todaySession?.wish, variant: todaySession?.variant });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [neuFuerOrt, ortJetzt?.sig]);
  const fehlendHier = useMemo(() => {
    if (!veraltet || !todaySession) return 0;
    const byId = new Map(allLib.map((e) => [e.id, e]));
    return todaySession.items.filter((it) => {
      const ex = byId.get(it.exerciseId);
      return !!ex && !reqOk(ex, has);
    }).length;
  }, [veraltet, todaySession, allLib, has]);

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
  // Der neue Status geht EXPLIZIT mit: vorher lief compose() per setTimeout
  // aus derselben Render-Closure und plante mit dem ALTEN backSafeActive —
  // der Schalter wirkte erst bei der übernächsten Komposition.
  const toggleSpare = () => {
    tap();
    const next = !backSpareToday;
    setBackSpareToday(next);
    if (!running && todaySession && !todaySession.completedAt)
      compose({ wish: todaySession.wish, backSafe: lastBackRed || next });
  };

  // Rücken: ein Schalter in der Umbau-Zeile; nach roter Ampel steht statt
  // des Schalters der Grund. Bei aktiver Schonung zusätzlich der Weg zum
  // gewichtsfreien Reset.
  const spareEl = (
    <>
      {lastBackRed ? (
        <p className="flex basis-full items-center gap-1.5 font-mono text-xs text-accent-ink">
          <ShieldAlert size={14} aria-hidden /> Rückenschonung aktiv — letzte Einheit „rot“
        </p>
      ) : (
        <Pressable
          onClick={toggleSpare}
          aria-pressed={backSpareToday}
          className={cn(
            "flex items-center gap-1.5 rounded-pill border px-3 py-2 font-mono text-xs font-semibold uppercase tracking-label",
            backSpareToday
              ? "border-transparent bg-accent text-on-accent"
              : "border-line text-muted",
          )}
        >
          <ShieldCheck size={14} aria-hidden /> Rücken schonen
        </Pressable>
      )}
      {backSafeActive && !sessionLocked && (
        <Pressable
          onClick={() => {
            tap();
            compose({ variant: "reset" });
          }}
          className="flex basis-full items-center gap-1 rounded-pill py-1 text-xs font-medium text-accent-ink"
        >
          <ChevronRight size={14} aria-hidden /> Oder: Rücken-Reset — ganz ohne Gewichte
        </Pressable>
      )}
    </>
  );

  const actionCards = coach.filter((c) => c.severity !== "info" || c.action);

  return (
    <div className="relative">
      {/* Kopf: Kicker + Datum, Titel in Kursive, EINE Bestandszeile (Nummer,
          Übungen, Sätze, Minuten). Die Zykluswoche ist hier weg — ohne
          angenommene Entlastungswoche stand dort immer „W1“; die echte Phase
          zeigt Fortschritt. */}
      <header className="mb-4">
        <div className="flex items-baseline justify-between gap-2 font-mono text-3xs font-semibold uppercase text-muted">
          <span>Deine Einheit heute</span>
          <span className="whitespace-nowrap tabular-nums">{plattenDatum}</span>
        </div>
        <h1 className="mt-3 font-display font-bold text-3xl leading-tight text-fg">
          {frageOffen
            ? "Wo trainierst du heute?"
            : (todaySession?.name ?? "Einheit wird zusammengestellt …")}
        </h1>
        {!frageOffen && todaySession && todaySession.items.length > 0 && (
          <p data-testid="heute-bestand" className="mt-2 font-mono text-2xs uppercase tracking-label text-muted">
            Einheit <span className="tabular-nums">{plattenNr}</span> ·{" "}
            <span className="tabular-nums">{todaySession.items.length}</span> Übungen ·{" "}
            <span className="tabular-nums">{saetzeGesamt}</span> Sätze ·{" "}
            <span className="tabular-nums">{estimatedMin}</span> Min
          </p>
        )}
      </header>

      {mehrereOrte && !frageOffen && (
        <Segment
          label="Trainingsort heute"
          options={gyms.map((g) => ({ value: g.id, label: g.name }))}
          value={activeGym?.id}
          onChange={(id) => {
            tap();
            waehleOrt(id);
          }}
          disabled={!!running}
          className="mb-4"
        />
      )}

      {veraltet && !sessionLocked && todaySession?.edited && todaySession.ort && activeGym && (
        <div className="mb-4 rounded-card border border-line-card bg-surface-1 px-4 py-3">
          <p className="text-sm leading-snug text-fg">
            {todaySession.ort.id !== activeGym.id
              ? `Diese Einheit ist für ${todaySession.ort.name} geplant.`
              : `Die Geräte für ${activeGym.name} haben sich geändert.`}
            {fehlendHier > 0 &&
              ` ${fehlendHier} ${fehlendHier === 1 ? "Übung geht" : "Übungen gehen"} hier nicht.`}
          </p>
          <Pressable
            onClick={() => {
              tap();
              compose({ wish: todaySession.wish, variant: todaySession.variant });
            }}
            className="mt-2 rounded-pill py-1 font-mono text-3xs font-semibold uppercase tracking-label text-accent-ink"
          >
            Für {activeGym.name} neu zusammenstellen
          </Pressable>
        </div>
      )}

      {frageOffen && (
        <OrtFrage
          gyms={gyms}
          zuletztId={activeGym?.id}
          allLib={allLib}
          disabled={disabledExercises}
          onWaehle={waehleHeute}
        />
      )}

      {chips.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2">
          {chips.map((c, i) => (
            <Chip key={i} tone={c.tone}>
              {c.text}
            </Chip>
          ))}
        </div>
      )}

      {/* Weg zurück ins Training nur, wenn die Karte ihn nicht schon trägt
          („Training fortsetzen“) — etwa wenn die Einheit gestern Abend
          begann und heute noch die Ortsfrage steht. */}
      {running && (frageOffen || !todaySession || !!todaySession.completedAt) && (
        <Pressable
          onClick={() => router.push("/workout")}
          className="mb-4 flex w-full items-center justify-between gap-3 rounded-card border border-line-card bg-surface-1 px-4 py-3 text-left"
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
      {frageOffen ? null : todaySession?.completedAt ? (
        <Card className="mb-4 p-5">
          <p className="flex items-center gap-2 font-mono text-3xs font-semibold uppercase tracking-label text-muted">
            <CheckCircle2 size={14} className="text-info" /> Heute erledigt
          </p>
          <h2 className="mt-1 font-display font-bold text-2xl text-fg">
            {todaySession.name}
          </h2>
          <p className="mt-1 text-sm text-muted">
            Die Einheit ist gespeichert. Erholung gehört dazu — morgen stellt
            ATLAS die nächste zusammen.
          </p>
          <Pressable
            onClick={() => compose()}
            className="mt-4 flex items-center gap-1.5 rounded-pill border border-strong px-3 py-2 font-mono text-xs font-semibold uppercase tracking-label text-fg focus:outline-none focus-visible:ring-2 focus-visible:ring-fokus"
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
            // Läuft die Einheit schon oder ist sie abgeschlossen, ändert die
            // Zeit nichts mehr — das ist selbsterklärend.
            if (sessionLocked) return;
            if (todaySession.edited) {
              // Bearbeitete Einheit: Umfang anpassen statt neu komponieren.
              // Vorher passierte hier gar nichts — die Zahl wurde gespeichert,
              // der Plan blieb stehen, und die App sagte es nicht.
              setTodaySession(
                passeZeitAn(todaySession, allLib, has, min, {
                  protectCore: backSafeActive,
                }),
              );
              return;
            }
            // Entprellt: wer sich durch die Stufen tippt, löst sonst je Klick
            // eine volle Opus-Runde aus — die Antworten überholen sich und es
            // wirkt, als hinge die App. Der Fallback steht trotzdem sofort,
            // weil compose() ihn synchron setzt.
            compose({ wish: todaySession.wish, budget: min, atlasDelayMs: 1200 });
          }}
          onStart={start}
          onEdit={() => setEditing(true)}
          onRegenerate={(wish) => compose({ wish })}
          regenerating={composing}
          atlasFehler={atlasFehler}
          locked={!!running}
          spareSlot={spareEl}
        />
      ) : (
        <Card className="mb-4 p-5">
          <p className="font-mono text-3xs font-semibold uppercase tracking-label text-muted">
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
