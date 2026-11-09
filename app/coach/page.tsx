"use client";

import { ChevronRight, Dumbbell, KeyRound, Sparkles, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { AtlasEingabe } from "@/components/coach/AtlasEingabe";
import { useNavSlot } from "@/components/layout/NavSlot";
import { Card } from "@/components/ui/Card";
import { Pressable } from "@/components/ui/pressable";
import { EmptyState } from "@/components/ui/EmptyState";
import { useTraining } from "@/components/providers/TrainingProvider";
import { AtlasMark } from "@/components/trainer/AtlasMark";
import { ProtokollBubble } from "@/components/coach/ProtokollBubble";
import { plattenNummer } from "@/lib/platte";
import { athletePersona, effectiveProfile } from "@/lib/athlete";
import { buildBriefing } from "@/lib/briefing";
import { buildCoachContext } from "@/lib/coach-context";
import { isoWeek } from "@/lib/format";
import { resolveDailySession } from "@/lib/session-model";
import { estimateSessionMin } from "@/lib/session-time";
import { KEYS, storage } from "@/lib/storage";
import { trainerContextBlock } from "@/lib/trainer";

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
      buildCoachContext({ log, allLib, body, cardio, exerciseNotes, nextSession }) +
      "\n\nATLAS-Status:\n" +
      trainerContextBlock(trainer) +
      (backSafeActive
        ? "\nHeute aktiv: Rücken-Schonmodus — die geplante Einheit ist bereits rückenschonend aufgelöst."
        : ""),
    [log, allLib, body, cardio, exerciseNotes, trainer, nextSession, backSafeActive],
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
  const [rapport, setRapport] = useState("");
  const [rapportBusy, setRapportBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  // Verlauf laden/persistieren — überlebt Navigation und synct mit.
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
              typeof x.content === "string",
          ),
        );
      setLoaded(true);
    });
    return () => {
      alive = false;
    };
  }, []);
  const persistChat = (next: Msg[]) => {
    const capped = next.slice(-CHAT_CAP);
    setMessages(capped);
    void storage.setJSON(KEYS.chat, capped);
  };

  const send = async (text: string) => {
    const userText = text.trim();
    if (!userText || busy) return;
    setInput("");
    const base = [...messages, { role: "user", content: userText } as Msg];
    setMessages([...base, { role: "assistant", content: "" }]);
    setBusy(true);
    try {
      const res = await fetch("/api/atlas/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: base.slice(-12), context, persona }),
      });
      if (res.headers.get("content-type")?.includes("application/json")) {
        const j = (await res.json()) as { configured?: boolean };
        if (j.configured === false) {
          setNotConfigured(true);
          setMessages(messages);
          return;
        }
      }
      const reader = res.body?.getReader();
      if (!reader) throw new Error("no stream");
      const dec = new TextDecoder();
      let acc = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += dec.decode(value, { stream: true });
        setMessages((prev) => {
          const copy = prev.slice();
          copy[copy.length - 1] = { role: "assistant", content: acc };
          return copy;
        });
        endRef.current?.scrollIntoView({ block: "end" });
      }
      persistChat([...base, { role: "assistant", content: acc }]);
    } catch {
      setMessages((prev) => {
        const copy = prev.slice();
        copy[copy.length - 1] = {
          role: "assistant",
          content: "Es hat gerade nicht geklappt. Versuch es nochmal.",
        };
        return copy;
      });
    } finally {
      setBusy(false);
      endRef.current?.scrollIntoView({ block: "end" });
    }
  };

  const loadRapport = async () => {
    if (rapportBusy) return;
    setRapportBusy(true);
    setRapport("");
    try {
      const res = await fetch("/api/atlas/briefing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ facts: briefing.facts, persona }),
      });
      if (res.headers.get("content-type")?.includes("application/json")) {
        const j = (await res.json().catch(() => null)) as { configured?: boolean } | null;
        if (j?.configured === false) setNotConfigured(true);
        return;
      }
      const reader = res.body?.getReader();
      if (!reader) return;
      const dec = new TextDecoder();
      let acc = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += dec.decode(value, { stream: true });
        setRapport(acc);
      }
    } catch {
      setRapport("");
    } finally {
      setRapportBusy(false);
    }
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
          icon={KeyRound}
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
        {!rapport && (
          <Pressable
            onClick={() => void loadRapport()}
            disabled={rapportBusy}
            className="mt-3 flex min-h-11 items-center gap-2 rounded-pill border-dick border-rand bg-surface-1 px-4 font-display text-sm font-extrabold text-fg focus:outline-none focus-visible:ring-2 focus-visible:ring-fokus disabled:opacity-50"
          >
            <Sparkles size={16} aria-hidden />
            {rapportBusy ? "ATLAS schreibt …" : "Ausführlicher Rückblick"}
          </Pressable>
        )}
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
