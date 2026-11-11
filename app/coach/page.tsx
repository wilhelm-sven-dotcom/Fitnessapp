"use client";

import { ChevronRight, Dumbbell, RotateCw, Sparkles, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { AtlasEingabe } from "@/components/coach/AtlasEingabe";
import { useNavSlot } from "@/components/layout/NavSlot";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Pressable } from "@/components/ui/pressable";
import { EmptyState } from "@/components/ui/EmptyState";
import { useTraining } from "@/components/providers/TrainingProvider";
import { AtlasMark } from "@/components/trainer/AtlasMark";
import { ProtokollBubble } from "@/components/coach/ProtokollBubble";
import { plattenNummer } from "@/lib/platte";
import { athletePersona, effectiveProfile } from "@/lib/athlete";
import { atlasStrom, geraeteDatum } from "@/lib/atlas/client";
import { ATLAS_FEHLER_TEXT, type AtlasFehlerArt } from "@/lib/atlas/fehler";
import { buildBriefing } from "@/lib/briefing";
import { buildCoachContext, lageBlock } from "@/lib/coach-context";
import { fatigueState } from "@/lib/fatigue";
import { isoWeek } from "@/lib/format";
import { resolveDailySession } from "@/lib/session-model";
import { estimateSessionMin } from "@/lib/session-time";
import { KEYS, storage } from "@/lib/storage";
import { toast } from "@/lib/toast";
import { trainerContextBlock, weekKeyOf } from "@/lib/trainer";

interface Msg {
  role: "user" | "assistant";
  content: string;
}

const CHAT_CAP = 40;

const SUGGESTIONS = [
  "Wie läuft meine Mission?",
  "Warum sieht meine heutige Einheit so aus?",
  "Worauf soll ich diese Woche achten?",
];

/**
 * ATLAS' Zimmer: Status + Direktive oben, der Wochen-Rapport auf Abruf, und
 * darunter das Gespräch — der Verlauf überlebt Navigation und Geräte
 * (KEYS.chat, auf 40 Nachrichten gekappt).
 */
export default function CoachPage() {
  const router = useRouter();
  const navSlot = useNavSlot();
  const {
    log,
    allLib,
    has,
    body,
    cardio,
    settings,
    trainer,
    mission,
    todaySession,
    backSafeActive,
    exerciseNotes,
    phase,
    deloadActive,
  } = useTraining();

  // Die ECHTE nächste Einheit: heute komponiert (todaySession). Ohne sie
  // (Ort noch nicht gewählt, oder erledigt) gibt es keine — früher stand hier
  // die A/B/C-Rotation, die immer „Ganzkörper A“ hieß.
  const nextSession = useMemo(() => {
    if (todaySession && !todaySession.completedAt && todaySession.items.length) {
      const resolved = resolveDailySession(todaySession, allLib, has);
      return {
        name: todaySession.name,
        focus: todaySession.focus,
        estimatedMin: estimateSessionMin(resolved),
        exercises: resolved.map(({ ex }) => ({
          name: ex.name,
          sets: ex.pattern === "cardio" ? 0 : ex.sets,
        })),
      };
    }
    return undefined;
  }, [todaySession, allLib, has]);

  const context = useMemo(
    () =>
      [
        buildCoachContext({ log, allLib, body, cardio, exerciseNotes, nextSession }),
        lageBlock({ phase, deloadActive, fatigue: fatigueState(log, cardio) }),
        `ATLAS-Status:\n${trainerContextBlock(trainer)}`,
        backSafeActive
          ? "Heute aktiv: Rückenschonung. Die geplante Einheit ist schon rückenschonend zusammengestellt."
          : "",
      ]
        .filter(Boolean)
        .join("\n\n"),
    [log, allLib, body, cardio, exerciseNotes, trainer, nextSession, backSafeActive, phase, deloadActive],
  );
  const persona = useMemo(
    () => athletePersona(effectiveProfile(settings, body), settings.userName),
    [settings, body],
  );

  const briefing = useMemo(
    () =>
      buildBriefing({
        log,
        cardio,
        body,
        allLib,
        settings,
        exerciseNotes,
        missionReview: mission?.lastReview,
      }),
    [log, cardio, body, allLib, settings, exerciseNotes, mission],
  );

  const [messages, setMessages] = useState<Msg[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [notConfigured, setNotConfigured] = useState(false);
  /** Warum die letzte Frage ohne Antwort blieb (nur in diesem Fenster bekannt). */
  const [fehler, setFehler] = useState<AtlasFehlerArt | null>(null);
  const [rapport, setRapport] = useState("");
  const [rapportBusy, setRapportBusy] = useState(false);
  const [rapportFehler, setRapportFehler] = useState<AtlasFehlerArt | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  /** Die eine laufende Anfrage; beim Verlassen der Seite wird sie abgebrochen. */
  const laeuft = useRef<AbortController | null>(null);
  useEffect(() => () => laeuft.current?.abort(), []);
  const woche = weekKeyOf(new Date());

  // Verlauf und Wochen-Rückblick laden — beides überlebt Navigation und synct mit.
  useEffect(() => {
    let alive = true;
    void storage.getJSON<Msg[]>(KEYS.chat, []).then((m) => {
      if (!alive) return;
      if (Array.isArray(m))
        setMessages(
          m.filter(
            (x) =>
              x &&
              (x.role === "user" || x.role === "assistant") &&
              typeof x.content === "string" &&
              x.content.trim() !== "",
          ),
        );
      setLoaded(true);
    });
    // Der Rückblick dieser Kalenderwoche wird einmal geschrieben und bleibt.
    // Vorher war er nach jedem Seitenwechsel weg und kostete eine neue Anfrage.
    void storage
      .getJSON<{ woche?: unknown; text?: unknown } | null>(KEYS.rapport, null)
      .then((r) => {
        if (alive && r && r.woche === woche && typeof r.text === "string") setRapport(r.text);
      });
    return () => {
      alive = false;
    };
  }, [woche]);
  const persistChat = (next: Msg[]) => {
    const capped = next.slice(-CHAT_CAP);
    setMessages(capped);
    void storage.setJSON(KEYS.chat, capped);
  };

  /** Steht am Ende eine Frage ohne Antwort? Dann bietet die Seite „Erneut
   *  senden“ an — auch nach einem Neuladen. */
  const offeneFrage =
    !busy && messages.length > 0 && messages[messages.length - 1].role === "user"
      ? messages[messages.length - 1].content
      : null;

  const send = async (text: string, erneut = false) => {
    const userText = text.trim();
    if (!userText || busy) return;
    if (!erneut) setInput("");
    setFehler(null);
    // „Erneut senden“: die Frage steht schon als letzte Nachricht da.
    const base: Msg[] = erneut ? messages : [...messages, { role: "user", content: userText }];
    setMessages([...base, { role: "assistant", content: "" }]);
    setBusy(true);
    const ctrl = new AbortController();
    laeuft.current = ctrl;
    const erg = await atlasStrom(
      "/api/atlas/chat",
      { messages: base.slice(-12), context, persona, datum: geraeteDatum() },
      {
        signal: ctrl.signal,
        beiText: (bisher) => {
          setMessages([...base, { role: "assistant", content: bisher }]);
          endRef.current?.scrollIntoView({ block: "end" });
        },
      },
    );
    if (ctrl.signal.aborted) return; // Seite verlassen
    setBusy(false);
    const antwort = erg.text.trim();
    if (erg.ok && antwort) {
      persistChat([...base, { role: "assistant", content: antwort }]);
    } else if (!erg.ok && erg.fehler === "abgeschnitten" && antwort) {
      // Zu lang geworden: der Text bis dahin ist brauchbar und bleibt.
      persistChat([...base, { role: "assistant", content: antwort }]);
      toast(ATLAS_FEHLER_TEXT.abgeschnitten);
    } else if (!erg.ok && erg.fehler === "aus") {
      setNotConfigured(true);
      setMessages(messages);
    } else {
      // Keine Antwort: die Frage bleibt stehen, in den Verlauf kommt kein
      // Fehlersatz. Früher stand dort „Es hat gerade nicht geklappt“ oder ein
      // halber Text samt Fehlerzeile, und beides ging als Antwort mit in die
      // nächste Anfrage.
      persistChat(base);
      setFehler(erg.ok ? "unbrauchbar" : erg.fehler);
    }
    endRef.current?.scrollIntoView({ block: "end" });
  };

  const loadRapport = async () => {
    if (rapportBusy) return;
    setRapportBusy(true);
    setRapportFehler(null);
    const vorher = rapport;
    setRapport("");
    const erg = await atlasStrom(
      "/api/atlas/briefing",
      { facts: briefing.facts, persona, datum: geraeteDatum() },
      { beiText: setRapport },
    );
    setRapportBusy(false);
    const text = erg.text.trim();
    if (erg.ok && text) {
      setRapport(text);
      void storage.setJSON(KEYS.rapport, { woche, text });
      return;
    }
    // Ein halber Rückblick ist keiner: zurück zum bisherigen Stand.
    setRapport(vorher);
    if (!erg.ok && erg.fehler === "aus") setNotConfigured(true);
    else if (!erg.ok && erg.fehler !== "abgebrochen") setRapportFehler(erg.fehler);
    else if (erg.ok) setRapportFehler("unbrauchbar");
  };

  const buildEl = (
    <Pressable
      onClick={() => router.push("/")}
      className="flex min-h-12 w-full items-center justify-between gap-2 rounded-card border-dick border-rand bg-surface-1 px-4 py-3 text-left text-base font-semibold text-fg focus:outline-none focus-visible:ring-2 focus-visible:ring-fokus"
    >
      <span className="flex items-center gap-2.5">
        <Dumbbell size={18} className="shrink-0" aria-hidden />
        Zur heutigen Einheit
      </span>
      <ChevronRight size={18} className="shrink-0 text-muted" aria-hidden />
    </Pressable>
  );

  if (notConfigured) {
    return (
      <div>
        <EmptyState
          bild="atlas-aus"
          title="ATLAS noch nicht eingerichtet"
          description={
            <>
              Damit die KI antwortet, muss serverseitig der Schlüssel
              <span className="font-mono"> ANTHROPIC_API_KEY </span>
              hinterlegt sein. Komposition und Coaching laufen bis dahin über
              den eingebauten Basis-Planer.
            </>
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Status-Kopf: ATLAS + Tages-Direktive. */}
      <Card>
        <div className="flex items-center gap-2">
          <AtlasMark size={18} live className="shrink-0 text-fg" />
          <h1 className="font-display text-lg font-extrabold text-fg">ATLAS · dein Trainingspartner</h1>
        </div>
        <p className="mt-0.5 text-sm tabular-nums text-muted">
          Einheit {plattenNummer(log)} · Mission {Math.round(trainer.mission.pct * 100)} %
        </p>
        <p className="mt-2.5 font-display text-xl font-extrabold leading-snug text-fg">{trainer.directive.text}</p>
        <p className="mt-1 text-sm leading-relaxed text-muted">{trainer.directive.reason}</p>
      </Card>

      {/* Wochen-Rapport: deterministisch sofort, ATLAS-Fassung auf Abruf. */}
      <Card>
        <p className="text-3xs font-bold text-muted">
          Wochen-Rückblick · KW {isoWeek(new Date())}
        </p>
        <p className="mt-2 whitespace-pre-wrap text-base leading-relaxed text-fg">
          {rapport || briefing.coachNote}
        </p>
        {rapportFehler && (
          <p role="alert" className="mt-2 text-sm text-gefahr">
            {ATLAS_FEHLER_TEXT[rapportFehler]}
          </p>
        )}
        <Pressable
          onClick={() => void loadRapport()}
          disabled={rapportBusy}
          className="mt-3 flex min-h-11 items-center gap-2 rounded-pill border-dick border-rand bg-surface-1 px-4 font-display text-sm font-extrabold text-fg focus:outline-none focus-visible:ring-2 focus-visible:ring-fokus disabled:opacity-50"
        >
          <Sparkles size={16} aria-hidden />
          {rapportBusy ? "ATLAS schreibt …" : rapport ? "Neu schreiben" : "Ausführlicher Rückblick"}
        </Pressable>
      </Card>

      {/* Gespräch — die Fragen stehen als Chips über dem Feld im Dock. */}
      {loaded && messages.length === 0 ? (
        <div>
          <p className="mb-2 px-1 text-sm text-muted">
            Oder direkt konkret: Wunsch rein, fertige Einheit raus.
          </p>
          {buildEl}
        </div>
      ) : (
        <div className="space-y-3">
          {messages.map((m, i) =>
            m.role === "user" ? (
              <div
                key={i}
                className="ml-10 rounded-card rounded-br-xs border-dick border-rand bg-strong px-4 py-3 text-base font-semibold leading-snug text-on-strong"
              >
                {m.content}
              </div>
            ) : (
              <ProtokollBubble key={i} text={m.content} busy={busy && i === messages.length - 1} />
            ),
          )}
          {/* Frage ohne Antwort: sagen, warum, und den zweiten Versuch anbieten. */}
          {offeneFrage && (
            <div
              role="alert"
              className="flex items-center justify-between gap-3 rounded-inner border-dick border-rand bg-surface-2 px-4 py-3"
            >
              <p className="min-w-0 text-sm leading-snug text-fg">
                {fehler ? ATLAS_FEHLER_TEXT[fehler] : "Auf diese Frage kam keine Antwort."}
              </p>
              <Button
                variant="secondary"
                className="shrink-0"
                onClick={() => void send(offeneFrage, true)}
              >
                <RotateCw size={16} aria-hidden /> Erneut senden
              </Button>
            </div>
          )}
          {/* Scroll-Ziel mit Abstand zum Dock (Höhe aus der AppShell). */}
          <div ref={endRef} style={{ scrollMarginBottom: "calc(var(--nav-h, 0px) + 16px)" }} />
          {!busy && messages.length > 0 && (
            <div className="flex items-center justify-between gap-2 pt-1">
              {buildEl}
              <Pressable
                onClick={() => persistChat([])}
                aria-label="Verlauf löschen"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-pill text-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-fokus"
              >
                <Trash2 size={18} />
              </Pressable>
            </div>
          )}
        </div>
      )}

      <AtlasEingabe
        slot={navSlot}
        value={input}
        onChange={setInput}
        onSend={(t) => void send(t)}
        busy={busy}
        vorschlaege={loaded && messages.length === 0 ? SUGGESTIONS : []}
      />
    </div>
  );
}
