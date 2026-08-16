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

  return (
    <section
      className={cn(
        "rounded-card border border-line bg-surface-1 px-4 py-3 shadow-card",
        (override || line?.tone === "push") && "border-l-2 border-l-accent-sessions",
      )}
    >
      <p className="flex items-center gap-2">
        <AtlasMark size={13} live={!!override} className="shrink-0 text-fg" />
        <span className="font-mono text-xs uppercase tracking-widest text-accent-2">
          ATLAS
        </span>
      </p>
      <p
        className={cn("mt-1 text-sm leading-snug", quiet ? "text-faint" : "text-fg")}
        aria-hidden={quiet || undefined}
      >
        {override ? override.text : quiet ? "…" : line!.text}
      </p>
      {override?.actionLabel && override.onApply && (
        <Pressable
          onClick={override.onApply}
          className="mt-2 inline-flex min-h-11 items-center rounded-pill bg-surface-2 px-4 text-xs font-medium text-accent-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-ink"
        >
          {override.actionLabel}
        </Pressable>
      )}
    </section>
  );
}
