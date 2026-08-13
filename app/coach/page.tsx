"use client";

import { ChevronRight, Dumbbell, KeyRound, Send, Sparkles, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { Pressable } from "@/components/ui/pressable";
import { EmptyState } from "@/components/ui/EmptyState";
import { useTraining } from "@/components/providers/TrainingProvider";
import { AtlasMark } from "@/components/trainer/AtlasMark";
import { athletePersona, effectiveProfile } from "@/lib/athlete";
import { buildBriefing } from "@/lib/briefing";
import { buildCoachContext } from "@/lib/coach-context";
import { isoWeek } from "@/lib/format";
import { resolveDailySession } from "@/lib/session-model";
import { estimateSessionMin } from "@/lib/session-time";
import { KEYS, storage } from "@/lib/storage";
import { trainerContextBlock } from "@/lib/trainer";
import { cn } from "@/lib/utils";

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
    recTpl,
    recList,
    estimatedMin,
    backSafeActive,
    exerciseNotes,
  } = useTraining();

  // Die ECHTE nächste Einheit: heute komponiert (todaySession), sonst die
  // Rotation-Empfehlung — damit Empfehlungen zu dem passen, was der Start zeigt.
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
    return {
      name: recTpl.name,
      focus: recTpl.focus,
      estimatedMin,
      exercises: recList.map(({ ex }) => ({
        name: ex.name,
        sets: ex.pattern === "cardio" ? 0 : ex.sets,
      })),
    };
  }, [todaySession, allLib, has, recTpl, recList, estimatedMin]);

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
      className="flex w-full items-center justify-between gap-2 rounded-card border border-surface-3 bg-surface-1 px-4 py-3 text-left text-sm text-fg shadow-card focus:outline-none focus-visible:ring-2 focus-visible:ring-coach"
    >
      <span className="flex items-center gap-2">
        <Dumbbell size={15} className="shrink-0 text-accent-ink" aria-hidden />
        Zur heutigen Einheit
      </span>
      <ChevronRight size={15} className="shrink-0 text-faint" />
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
    <div>
      {/* Status-Kopf: Mission + Tages-Direktive. */}
      <div className="mb-4 rounded-card border border-line bg-panel p-4 shadow-card">
        <div className="flex items-center gap-2">
          <AtlasMark size={20} live className="text-fg" />
          <h1 className="font-display text-xl font-semibold tracking-tight text-fg">
            ATLAS
          </h1>
          <span className="ml-auto font-mono text-xs tabular-nums text-faint">
            Mission {Math.round(trainer.mission.pct * 100)} %
          </span>
        </div>
        <p className="mt-2 text-sm font-medium leading-snug text-fg">
          {trainer.directive.text}
        </p>
        <p className="mt-0.5 text-xs leading-relaxed text-muted">
          {trainer.directive.reason}
        </p>
      </div>

      {/* Wochen-Rapport: deterministisch sofort, ATLAS-Fassung auf Abruf. */}
      <section className="mb-4 rounded-card border border-surface-3 bg-surface-1 p-4 shadow-card">
        <p className="font-mono text-xs uppercase tracking-widest text-accent-2">
          Wochen-Rapport · KW {isoWeek(new Date())}
        </p>
        <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-fg">
          {rapport || briefing.coachNote}
        </p>
        {!rapport && (
          <Pressable
            onClick={() => void loadRapport()}
            disabled={rapportBusy}
            className="mt-3 flex items-center gap-1.5 rounded-pill bg-surface-2 px-3 py-2 text-xs font-medium text-accent-ink focus:outline-none disabled:opacity-50"
          >
            <Sparkles size={13} />
            {rapportBusy ? "ATLAS schreibt…" : "Ausführlicher Rapport von ATLAS"}
          </Pressable>
        )}
      </section>

      {/* Gespräch. */}
      {loaded && messages.length === 0 ? (
        <div>
          <p className="mb-2 px-1 text-xs text-muted">Frag ATLAS:</p>
          <div className="space-y-2">
            {SUGGESTIONS.map((s) => (
              <Pressable
                key={s}
                onClick={() => send(s)}
                className="flex w-full items-center justify-between gap-2 rounded-card border border-surface-3 bg-surface-1 shadow-card px-4 py-3 text-left text-sm text-fg focus:outline-none"
              >
                {s}
                <Send size={15} className="shrink-0 text-faint" />
              </Pressable>
            ))}
          </div>
          <p className="mb-2 mt-5 px-1 text-xs text-muted">
            Oder direkt konkret — Wunsch rein, startbare Einheit raus:
          </p>
          {buildEl}
        </div>
      ) : (
        <div className="space-y-3">
          {messages.map((m, i) => (
            <div
              key={i}
              className={cn(
                "rounded-card px-4 py-3 text-sm leading-relaxed",
                m.role === "user"
                  ? "ml-8 bg-coach text-on-color"
                  : "mr-4 whitespace-pre-wrap border border-surface-3 bg-surface-1 shadow-card text-fg",
              )}
            >
              {m.content || (busy ? "…" : "")}
            </div>
          ))}
          <div ref={endRef} />
          {!busy && messages.length > 0 && (
            <div className="flex items-center justify-between pt-1">
              {buildEl}
              <Pressable
                onClick={() => persistChat([])}
                aria-label="Verlauf löschen"
                className="ml-2 shrink-0 rounded-full p-2.5 text-faint focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-ink"
              >
                <Trash2 size={15} />
              </Pressable>
            </div>
          )}
        </div>
      )}

      <div className="mt-4 flex items-end gap-2">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void send(input);
            }
          }}
          rows={1}
          placeholder="Frag ATLAS…"
          aria-label="Nachricht an den Coach"
          className="flex-1 resize-none rounded-card bg-surface-2 px-4 py-3 text-sm text-fg placeholder:text-faint focus:outline-none focus-visible:ring-2 focus-visible:ring-coach"
        />
        <Pressable
          onClick={() => void send(input)}
          disabled={busy || !input.trim()}
          aria-label="Senden"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-card bg-strong text-on-strong focus:outline-none disabled:opacity-40"
        >
          <Send size={18} strokeWidth={2.5} />
        </Pressable>
      </div>
    </div>
  );
}
