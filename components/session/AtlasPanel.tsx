"use client";

import { useEffect, useMemo, useRef } from "react";
import { AtlasMark } from "@/components/trainer/AtlasMark";
import { Pressable } from "@/components/ui/pressable";
import { liveLine, motivationLine } from "@/lib/trainer";
import type { ExRecord } from "@/lib/records";
import type { ReadinessScale } from "@/lib/readiness";
import { isFilled } from "@/lib/stats";
import { speak } from "@/lib/voice";
import { cn } from "@/lib/utils";
import type { PlannedExercise } from "@/lib/session-model";
import type { Exercise, LastPerf, Prescription, SetEntry } from "@/lib/types";

/**
 * ATLAS' fester Platz im Training: begrüßt jede Übung mit ihrem Intro (aus
 * der Komposition — null Latenz), reagiert danach deterministisch auf jeden
 * Satz (Rekordjagd, RIR, Schattenrennen, Ansporn). Die KI-Reaktion streamt
 * ab Phase 6 in genau dieses Panel.
 */
export function AtlasPanel({
  ex,
  item,
  sets,
  presc,
  record,
  readiness,
  lastPerf,
  isExam,
  motivateOn,
  voiceOn,
  override,
}: {
  ex: Exercise;
  item: PlannedExercise;
  sets: SetEntry[];
  presc: Prescription;
  record: ExRecord | null;
  readiness: ReadinessScale;
  lastPerf: LastPerf | null;
  isExam: boolean;
  motivateOn: boolean;
  voiceOn: boolean;
  /** KI-Reaktion (gesprochen vom Runner) — ersetzt die deterministische Zeile,
   *  optional mit übernehmbarem Eingriff. */
  override?: { text: string; actionLabel?: string; onApply?: () => void } | null;
}) {
  const done = sets.filter((s) => !s.warmup && isFilled(s)).length;

  const line = useMemo(() => {
    if (ex.pattern === "cardio") return null;
    // Startgewichts-Vorschlag hat Vorrang vor dem Intro: ohne Historie ist
    // „Start mit X kg" die eine Information, die der Nutzer JETZT braucht —
    // das Intro (immer gesetzt) würde sie sonst dauerhaft verdecken.
    if (
      done === 0 &&
      !isExam &&
      presc.reason === "start" &&
      presc.suggestedWeight != null
    ) {
      const live = liveLine({ ex, sets, presc, record, readiness, lastPerf });
      if (live) return live;
    }
    // Vor dem ersten Arbeitssatz spricht das Übungs-Intro der Komposition.
    if (done === 0 && item.intro) {
      return { text: item.intro, tone: "ok" as const, kind: "intro" as const };
    }
    const live = isExam
      ? null
      : liveLine({ ex, sets, presc, record, readiness, lastPerf });
    if (live && (live.kind === "record" || live.kind === "chase" || live.kind === "shadow" || live.kind === "rir"))
      return live;
    if (motivateOn) {
      const mot = motivationLine({ ex, sets });
      if (mot) return mot;
    }
    return live;
  }, [ex, sets, presc, record, readiness, lastPerf, isExam, motivateOn, done, item.intro]);

  // Sprachausgabe: Intro einmal pro Übung, Reaktionen einmal je Satz-Stand.
  const spokenRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!voiceOn || !line) return;
    const speakable =
      line.kind === "intro" ||
      line.kind === "chase" ||
      line.kind === "rir" ||
      line.kind === "shadow";
    if (!speakable) return;
    const key = `${item.id}:${done}:${line.text}`;
    if (spokenRef.current.has(key)) return;
    spokenRef.current.add(key);
    speak(line.text);
  }, [line, voiceOn, item.id, done]);

  // Cardio hat keine Satz-Reaktionen — dort bleibt das Panel weg. Sonst steht
  // es IMMER (stille Momente zeigen „…"), damit die Bühne nicht springt.
  if (ex.pattern === "cardio" && !override) return null;
  const quiet = !override && !line;

  // Antreiben („Noch einer.“) und eigene Ansagen stehen in einer Sonnen-Blase,
  // sonst weiß. Die Blase ist IMMER da (stille Momente zeigen „…“).
  const laut = !!override || line?.tone === "push";
  return (
    <section className="flex items-start gap-2.5">
      <span
        aria-hidden
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-pill border-dick border-rand bg-sonne font-display text-base font-extrabold text-sonne-auf"
      >
        A
      </span>
      <div
        className={cn(
          "min-w-0 flex-1 rounded-card rounded-bl-xs border-dick border-rand px-3.5 py-2.5",
          laut ? "bg-sonne text-sonne-auf" : "bg-surface-1 text-fg",
        )}
      >
        <p className="flex items-center gap-1.5">
          <AtlasMark size={12} live={!!override} className={cn("shrink-0", laut ? "" : "text-muted")} />
          <span className={cn("text-3xs font-bold", laut ? "" : "text-muted")}>ATLAS</span>
        </p>
        <p
          className={cn(
            "mt-0.5 text-base font-semibold leading-snug",
            quiet && "font-normal text-faint",
          )}
          aria-hidden={quiet || undefined}
        >
          {override ? override.text : quiet ? "…" : line!.text}
        </p>
        {override?.actionLabel && override.onApply && (
          <Pressable
            onClick={override.onApply}
            className="mt-2 inline-flex min-h-11 items-center rounded-pill border-dick border-rand bg-strong px-4 font-display text-sm font-extrabold text-on-strong focus:outline-none focus-visible:ring-2 focus-visible:ring-fokus"
          >
            {override.actionLabel}
          </Pressable>
        )}
      </div>
    </section>
  );
}
