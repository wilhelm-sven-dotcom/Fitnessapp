"use client";

import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { FatigueCard } from "@/components/progress/FatigueCard";
import { AtlasMark } from "@/components/trainer/AtlasMark";
import { PhaseCard } from "@/components/progress/PhaseCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { Reveal } from "@/components/ui/Reveal";
import { Pressable } from "@/components/ui/pressable";
import { useTraining } from "@/components/providers/TrainingProvider";
import { athletePersona, effectiveProfile } from "@/lib/athlete";
import { buildBriefing } from "@/lib/briefing";
import { recordUnit } from "@/lib/records";
import { Newspaper } from "lucide-react";

type State = "loading" | "streaming" | "fallback";

function Stat({ value, unit, label }: { value: string; unit?: string; label: string }) {
  return (
    <div className="flex-1">
      <p className="font-display text-3xl font-bold leading-none tracking-tight text-fg">
        {value}
        {unit && <span className="ml-0.5 font-mono text-sm font-normal text-muted">{unit}</span>}
      </p>
      <p className="mt-1 font-mono text-xs uppercase tracking-widest text-faint">{label}</p>
    </div>
  );
}

export default function BriefingPage() {
  const router = useRouter();
  const { log, cardio, body, allLib, settings, mission, exerciseNotes } = useTraining();
  const b = useMemo(
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
  const persona = useMemo(
    () => athletePersona(effectiveProfile(settings, body), settings.userName),
    [settings, body],
  );

  const [editorial, setEditorial] = useState("");
  const [state, setState] = useState<State>("loading");
  const ranRef = useRef(false);

  useEffect(() => {
    if (ranRef.current) return; // fetch once; survives StrictMode's double-invoke
    ranRef.current = true;
    if (!log.length) {
      setState("fallback");
      return;
    }
    (async () => {
      try {
        const res = await fetch("/api/briefing", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ facts: b.facts, persona }),
        });
        if (res.headers.get("content-type")?.includes("application/json")) {
          setState("fallback");
          return;
        }
        const reader = res.body?.getReader();
        if (!reader) {
          setState("fallback");
          return;
        }
        const dec = new TextDecoder();
        let acc = "";
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          acc += dec.decode(value, { stream: true });
          if (acc.includes("__ERROR__")) {
            setState("fallback");
            return;
          }
          setEditorial(acc);
          setState("streaming");
        }
        if (!acc.trim()) setState("fallback");
      } catch {
        setState("fallback");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const today = new Date().toLocaleDateString("de-DE", { day: "numeric", month: "long" });
  const paragraphs = (state === "fallback" ? b.coachNote : editorial)
    .split(/\n+/)
    .map((p) => p.trim())
    .filter(Boolean);

  return (
    <div>
      <Pressable
        onClick={() => router.push("/")}
        className="mb-4 flex items-center gap-1 text-sm text-accent-ink focus:outline-none"
      >
        <ArrowLeft size={16} /> Start
      </Pressable>

      {log.length === 0 ? (
        <EmptyState
          icon={Newspaper}
          title="Noch keine Ausgabe"
          description="Trainier ein paar Einheiten — dann schreibt ATLAS hier deinen wöchentlichen Rapport aus deinen echten Daten."
        />
      ) : (
        <>
          {/* Masthead */}
          <div className="flex items-baseline justify-between border-b-2 border-fg pb-2">
            <span className="flex items-center gap-2 font-display text-2xl font-bold uppercase leading-none tracking-tight text-fg">
              <AtlasMark size={20} className="text-fg" />
              ATLAS-Rapport
            </span>
          </div>
          <div className="mt-1.5 flex items-center justify-between border-b border-line pb-2 font-mono text-xs uppercase tracking-widest text-accent-2">
            <span>Ausgabe · KW {b.kw}</span>
            <span className="text-faint">{today}</span>
          </div>

          {/* By the numbers */}
          <div className="mt-5 flex gap-4">
            <Stat value={`${b.weekCount}/3`} label="Einheiten" />
            <Stat value={String(b.volT).replace(".", ",")} unit="t" label="Volumen" />
            <Stat value={`${b.coverage.hit}/${b.coverage.total}`} label="Muskeln" />
          </div>

          {/* Coach editorial column */}
          <Reveal>
            <div className="mt-6 border-t border-line pt-5">
              <p className="mb-2 font-mono text-xs uppercase tracking-widest text-accent-ink">
                Von ATLAS
              </p>
              {state === "loading" ? (
                <p className="font-body text-base italic leading-relaxed text-faint">
                  ATLAS liest deine Woche…
                </p>
              ) : (
                <div className="space-y-3">
                  {paragraphs.map((p, i) => (
                    <p key={i} className="font-body text-base leading-relaxed text-fg">
                      {p}
                    </p>
                  ))}
                </div>
              )}
            </div>
          </Reveal>

          {/* Records of the week */}
          <div className="mt-6 border-t border-line pt-5">
            <p className="mb-3 font-mono text-xs uppercase tracking-widest text-accent-2">
              Rekorde der Woche
            </p>
            {b.prs.length === 0 ? (
              <p className="text-sm text-muted">
                Diese Woche kein neuer Rekord — bleib dran, der nächste kommt.
              </p>
            ) : (
              <ul>
                {b.prs.slice(0, 5).map((e, i) => (
                  <li
                    key={e.exId + i}
                    className="flex items-center justify-between gap-3 border-b border-line py-2 first:pt-0 last:border-0 last:pb-0"
                  >
                    <span className="truncate text-sm font-medium text-fg">{e.name}</span>
                    <span className="shrink-0 font-display text-lg font-semibold tabular-nums text-accent-ink">
                      {e.value} {recordUnit(e.kind)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Load + phase (reused instruments) */}
          <div className="mt-6">
            <FatigueCard log={log} cardio={cardio} />
            <PhaseCard log={log} cardio={cardio} settings={settings} />
          </div>
        </>
      )}
    </div>
  );
}
