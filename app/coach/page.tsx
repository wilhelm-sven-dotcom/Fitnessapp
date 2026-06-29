"use client";

import { ArrowLeft, KeyRound, Send, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import { Pressable } from "@/components/ui/pressable";
import { EmptyState } from "@/components/ui/EmptyState";
import { Reveal } from "@/components/ui/Reveal";
import { useTraining } from "@/components/providers/TrainingProvider";
import { athletePersona, effectiveProfile } from "@/lib/athlete";
import { buildCoachContext } from "@/lib/coach-context";
import { cn } from "@/lib/utils";

interface Msg {
  role: "user" | "assistant";
  content: string;
}

const SUGGESTIONS = [
  "Wie war meine Woche?",
  "Worauf soll ich die nächste Einheit achten?",
  "Mein unterer Rücken zwickt — was tun?",
];
const RECAP_PROMPT =
  "Gib mir ein kurzes Wochen-Recap: 2–3 Sätze, was gut lief, plus 1–2 konkrete Fokus-Punkte für nächste Woche.";

export default function CoachPage() {
  const router = useRouter();
  const { log, allLib, body, cardio, settings } = useTraining();
  const context = useMemo(
    () => buildCoachContext({ log, allLib, body, cardio }),
    [log, allLib, body, cardio],
  );
  const persona = useMemo(
    () => athletePersona(effectiveProfile(settings, body), settings.userName),
    [settings, body],
  );

  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [notConfigured, setNotConfigured] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  const send = async (text: string) => {
    const userText = text.trim();
    if (!userText || busy) return;
    setInput("");
    const base = [...messages, { role: "user", content: userText } as Msg];
    setMessages([...base, { role: "assistant", content: "" }]);
    setBusy(true);
    try {
      const res = await fetch("/api/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: base, context, persona }),
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

  if (notConfigured) {
    return (
      <div>
        <BackRow onBack={() => router.push("/")} />
        <EmptyState
          icon={KeyRound}
          title="Coach noch nicht eingerichtet"
          description={
            <>
              Damit der KI-Coach antwortet, muss in Vercel der Schlüssel
              <span className="font-mono"> ANTHROPIC_API_KEY </span>
              hinterlegt sein. Danach läuft alles serverseitig — dein Schlüssel
              bleibt geheim.
            </>
          }
        />
      </div>
    );
  }

  return (
    <div>
      <BackRow onBack={() => router.push("/")} />
      <div className="mb-5 flex items-center gap-2">
        <Sparkles size={22} className="text-accent-coverage" />
        <h2 className="text-2xl font-semibold tracking-tight">Coach</h2>
      </div>

      {messages.length === 0 ? (
        <Reveal>
          <Pressable
            onClick={() => send(RECAP_PROMPT)}
            className="mb-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-accent-coverage py-3.5 text-base font-semibold text-on-strong focus:outline-none"
          >
            <Sparkles size={18} strokeWidth={2.5} /> Wochen-Recap
          </Pressable>
          <p className="mb-2 px-1 text-xs text-muted">Oder frag direkt:</p>
          <div className="space-y-2">
            {SUGGESTIONS.map((s) => (
              <Pressable
                key={s}
                onClick={() => send(s)}
                className="flex w-full items-center justify-between gap-2 rounded-2xl border border-surface-3 bg-surface-1 shadow-card px-4 py-3 text-left text-sm text-fg focus:outline-none"
              >
                {s}
                <Send size={15} className="shrink-0 text-faint" />
              </Pressable>
            ))}
          </div>
        </Reveal>
      ) : (
        <div className="space-y-3">
          {messages.map((m, i) => (
            <div
              key={i}
              className={cn(
                "rounded-2xl px-4 py-3 text-sm leading-relaxed",
                m.role === "user"
                  ? "ml-8 bg-accent-coverage text-on-strong"
                  : "mr-4 whitespace-pre-wrap border border-surface-3 bg-surface-1 shadow-card text-fg",
              )}
            >
              {m.content || (busy ? "…" : "")}
            </div>
          ))}
          <div ref={endRef} />
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
          placeholder="Frag deinen Coach…"
          className="flex-1 resize-none rounded-2xl bg-surface-2 px-4 py-3 text-sm text-fg placeholder:text-faint focus:outline-none focus:ring-2 focus:ring-accent-coverage"
        />
        <Pressable
          onClick={() => void send(input)}
          disabled={busy || !input.trim()}
          aria-label="Senden"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-strong text-on-strong focus:outline-none disabled:opacity-40"
        >
          <Send size={18} strokeWidth={2.5} />
        </Pressable>
      </div>
    </div>
  );
}

function BackRow({ onBack }: { onBack: () => void }) {
  return (
    <Pressable
      onClick={onBack}
      className="mb-4 flex items-center gap-1 rounded-md px-1 py-1 text-sm text-muted focus:outline-none"
    >
      <ArrowLeft size={18} /> Zurück
    </Pressable>
  );
}
