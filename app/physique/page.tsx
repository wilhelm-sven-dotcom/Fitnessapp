"use client";

import { Camera, ShieldCheck, Star } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { BeforeAfter } from "@/components/progress/BeforeAfter";
import { PhotoImg } from "@/components/progress/PhotoImg";
import { useTraining } from "@/components/providers/TrainingProvider";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { Pressable } from "@/components/ui/pressable";
import { Reveal } from "@/components/ui/Reveal";
import { fmtDateShort } from "@/lib/format";
import { prTimeline } from "@/lib/records";
import { weekStartMon } from "@/lib/volume";
import { cn } from "@/lib/utils";

/** 87.5 → "87,5" (deutsches Komma, wie Readout). */
const fmtKg = (w: number) => String(w).replace(".", ",");

/** "−4,2 kg" mit deutschem Komma; null ohne beide Gewichte. */
function kgDelta(a?: number, b?: number): string | null {
  if (a == null || b == null) return null;
  const d = Math.round((b - a) * 10) / 10;
  return `${d > 0 ? "+" : ""}${fmtKg(d)} kg`;
}

export default function PhysiquePage() {
  const { body, log } = useTraining();
  const router = useRouter();

  // Aufsteigend (Provider sortiert so); Fotos sind die Timeline-Anker.
  const photos = useMemo(() => body.filter((b) => b.photoId), [body]);
  const [beforeIdx, setBeforeIdx] = useState<number | null>(null);
  const [afterIdx, setAfterIdx] = useState<number | null>(null);
  const bIdx = beforeIdx ?? 0;
  const aIdx = afterIdx ?? photos.length - 1;
  const before = photos[bIdx];
  const after = photos[aIdx];

  // Meilensteine je Trainingswoche (Montag-Bucket): Rekorde + Prüfungen.
  const prWeeks = useMemo(() => {
    const m = new Map<number, number>();
    for (const e of prTimeline(log)) {
      const k = weekStartMon(new Date(e.date)).getTime();
      m.set(k, (m.get(k) ?? 0) + 1);
    }
    return m;
  }, [log]);
  const examWeeks = useMemo(
    () =>
      new Set(
        log.filter((s) => s.isExam).map((s) => weekStartMon(new Date(s.date)).getTime()),
      ),
    [log],
  );

  const label = (m: (typeof photos)[number]) =>
    `${fmtDateShort(m.date)}${m.weightKg != null ? ` · ${fmtKg(m.weightKg)} kg` : ""}`;

  const spanWeeks =
    before && after
      ? Math.max(
          1,
          Math.round(
            (new Date(after.date).getTime() - new Date(before.date).getTime()) /
              (7 * 86400000),
          ),
        )
      : 0;
  const delta = before && after ? kgDelta(before.weightKg, after.weightKg) : null;

  return (
    <div>
      <PageHeader
        eyebrow="Körper"
        title="Physique"
        subtitle="Deine Verwandlung — Foto für Foto, mit den Meilensteinen dazwischen."
      />

      {photos.length >= 2 && before?.photoId && after?.photoId ? (
        <Reveal>
          <div className="mb-2">
            <BeforeAfter
              beforeId={before.photoId}
              afterId={after.photoId}
              beforeLabel={label(before)}
              afterLabel={label(after)}
            />
          </div>
          <p className="mb-5 text-center font-mono text-xs tabular-nums text-muted">
            {delta ? `${delta} in ${spanWeeks} Wochen` : `${spanWeeks} Wochen dazwischen`}
          </p>
        </Reveal>
      ) : photos.length === 1 && photos[0].photoId ? (
        <Reveal>
          <PhotoImg id={photos[0].photoId} className="mb-2 w-full rounded-card" />
          <p className="mb-5 text-center text-xs text-muted">
            Erstes Foto gesetzt — ab dem zweiten gibt es den Vorher/Nachher-Regler.
          </p>
        </Reveal>
      ) : (
        <EmptyState
          icon={Camera}
          title="Noch keine Fortschrittsfotos"
          description="Halte deinen Ausgangspunkt fest — künftige Vergleiche machen den Fortschritt sichtbar, den die Waage verschweigt."
          action={
            <Pressable
              onClick={() => router.push("/settings")}
              className="rounded-pill bg-accent-sessions px-5 py-2.5 text-sm font-semibold text-on-accent focus:outline-none"
            >
              Foto hinzufügen
            </Pressable>
          }
        />
      )}

      {body.length > 0 && (
        <Card className="mb-3">
          <p className="mb-3 font-mono text-xs uppercase tracking-widest text-muted">
            Timeline
          </p>
          <div className="space-y-3">
            {[...body].reverse().map((m, ri) => {
              const i = body.length - 1 - ri; // Index im aufsteigenden Array
              const prev = body[i - 1];
              const d = kgDelta(prev?.weightKg, m.weightKg);
              const wk = weekStartMon(new Date(m.date)).getTime();
              const prs = prWeeks.get(wk) ?? 0;
              const exam = examWeeks.has(wk);
              const pIdx = m.photoId ? photos.findIndex((p) => p === m) : -1;
              return (
                <div key={m.date + ri} className="log-row flex items-center gap-3">
                  {m.photoId ? (
                    <PhotoImg id={m.photoId} className="h-16 w-16 shrink-0 rounded-card" />
                  ) : (
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-card bg-surface-2">
                      <span className="font-mono text-xs text-faint">kg</span>
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-fg">
                      {fmtDateShort(m.date)}
                      {m.weightKg != null && (
                        <span className="font-mono tabular-nums"> · {fmtKg(m.weightKg)} kg</span>
                      )}
                      {d && <span className="ml-1 font-mono text-xs text-muted">({d})</span>}
                    </p>
                    {(prs > 0 || exam) && (
                      <p className="mt-0.5 flex flex-wrap items-center gap-2 text-xs">
                        {exam && (
                          <span className="flex items-center gap-1 rounded-pill bg-surface-2 px-2 py-0.5 text-accent-ink">
                            <ShieldCheck size={12} /> Prüfung
                          </span>
                        )}
                        {prs > 0 && (
                          <span className="flex items-center gap-1 rounded-pill bg-surface-2 px-2 py-0.5 text-muted">
                            <Star size={12} className="text-accent-ink" />
                            {prs === 1 ? "1 Rekord" : `${prs} Rekorde`} in der Woche
                          </span>
                        )}
                      </p>
                    )}
                  </div>
                  {pIdx >= 0 && photos.length >= 2 && (
                    <div className="flex shrink-0 gap-1">
                      <Pressable
                        onClick={() => setBeforeIdx(pIdx)}
                        aria-label="Als Vorher-Bild setzen"
                        className={cn(
                          "h-7 w-7 rounded-full font-mono text-xs font-bold focus:outline-none",
                          pIdx === bIdx ? "bg-strong text-on-strong" : "bg-surface-2 text-muted",
                        )}
                      >
                        A
                      </Pressable>
                      <Pressable
                        onClick={() => setAfterIdx(pIdx)}
                        aria-label="Als Nachher-Bild setzen"
                        className={cn(
                          "h-7 w-7 rounded-full font-mono text-xs font-bold focus:outline-none",
                          pIdx === aIdx ? "bg-accent-sessions text-on-accent" : "bg-surface-2 text-muted",
                        )}
                      >
                        B
                      </Pressable>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      )}

      <p className="mt-4 text-center text-xs leading-relaxed text-faint">
        Fotos bleiben auf deinem Gerät — und in deiner privaten Cloud, wenn du
        angemeldet bist. Neue Fotos: Einstellungen → Körperdaten.
      </p>
    </div>
  );
}
