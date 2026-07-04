"use client";

import { ArrowLeft, BookMarked, Share2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { AtlasMark } from "@/components/trainer/AtlasMark";
import { EmptyState } from "@/components/ui/EmptyState";
import { Reveal } from "@/components/ui/Reveal";
import { Pressable } from "@/components/ui/pressable";
import { useTraining } from "@/components/providers/TrainingProvider";
import { buildIssues, type MagazineIssue } from "@/lib/magazine";
import { renderCoverBlob, shareCoverBlob } from "@/lib/magazine-cover";
import { recordUnit } from "@/lib/records";

/* Das Magazin ist IMMER editorial gesetzt, egal welcher Skin aktiv ist:
   Farb-Tokens bleiben vom Skin (hell/dunkel korrekt), nur die Typo wird
   erzwungen. Wichtig: font-family wird beim Erben nicht neu aufgelöst —
   der Wrapper muss font-sans selbst tragen, damit der Subtree Newsreader
   erbt; font-display/font-mono im Subtree greifen dann automatisch. */
const EDITORIAL_VARS = {
  "--font-display": "var(--font-anton)",
  "--font-body": "var(--font-newsreader)",
  "--font-mono": "var(--font-inter)",
  "--radius-card": "2px",
  "--panel-shadow": "none",
} as React.CSSProperties;

const fmtT = (t: number) => String(t).replace(".", ",");

export default function MagazinPage() {
  const router = useRouter();
  const { log, allLib } = useTraining();
  const issues = useMemo(() => buildIssues(log, allLib), [log, allLib]);
  const [openKey, setOpenKey] = useState<string | null>(null);
  const issue = issues.find((i) => i.monthKey === openKey) ?? null;

  return (
    <div className="font-sans" style={EDITORIAL_VARS}>
      <Pressable
        onClick={() => (issue ? setOpenKey(null) : router.push("/"))}
        className="mb-4 flex items-center gap-1 text-sm text-accent-ink focus:outline-none"
      >
        <ArrowLeft size={16} /> {issue ? "Alle Ausgaben" : "Start"}
      </Pressable>

      {issues.length === 0 ? (
        <EmptyState
          icon={BookMarked}
          title="Ausgabe 01 kommt"
          description="Dein erster Trainingsmonat wird deine erste Magazin-Ausgabe — ATLAS schreibt sie automatisch aus deinen echten Zahlen."
        />
      ) : issue ? (
        <IssueView issue={issue} />
      ) : (
        <Shelf issues={issues} onOpen={setOpenKey} />
      )}
    </div>
  );
}

function Shelf({
  issues,
  onOpen,
}: {
  issues: MagazineIssue[];
  onOpen: (key: string) => void;
}) {
  return (
    <div data-testid="magazine-shelf">
      <div className="flex items-baseline justify-between border-b-2 border-fg pb-2">
        <span className="font-display text-3xl font-normal uppercase leading-none tracking-tight text-fg">
          Training
        </span>
        <span className="font-mono text-xs uppercase tracking-widest text-accent-2">
          Das Magazin
        </span>
      </div>
      <p className="mt-1.5 border-b border-line pb-2 font-mono text-xs uppercase tracking-widest text-faint">
        Von ATLAS · {issues.length} {issues.length === 1 ? "Ausgabe" : "Ausgaben"}
      </p>

      <div className="mt-5 space-y-3">
        {issues.map((it, i) => (
          <Reveal key={it.monthKey} delay={0.04 * i}>
            <Pressable
              onClick={() => onOpen(it.monthKey)}
              aria-label={`Ausgabe ${it.nr} öffnen — ${it.monthLabel}`}
              className="block w-full rounded-card border border-line bg-surface-1 p-4 text-left shadow-card focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-sessions"
            >
              <div className="flex items-baseline justify-between font-mono text-xs uppercase tracking-widest">
                <span className="text-accent-2">Ausgabe {String(it.nr).padStart(2, "0")}</span>
                <span className="text-faint">{it.monthLabel}</span>
              </div>
              <p className="mt-2 font-display text-2xl font-normal uppercase leading-tight text-fg">
                {it.headline}
              </p>
              <p className="mt-2 flex flex-wrap gap-x-3 font-mono text-xs tabular-nums text-muted">
                <span>{it.sessions} EINH.</span>
                <span>{fmtT(it.tonnageT)} T</span>
                <span>
                  {it.prs.length} {it.prs.length === 1 ? "REKORD" : "REKORDE"}
                </span>
                {it.current && <span className="text-accent-ink">IM ENTSTEHEN</span>}
              </p>
            </Pressable>
          </Reveal>
        ))}
      </div>
    </div>
  );
}

function IssueView({ issue }: { issue: MagazineIssue }) {
  const [busy, setBusy] = useState(false);
  const blobRef = useRef<Blob | null>(null);
  const busyRef = useRef(false);

  // Cover VOR dem Tap rendern: fonts.load kann beim Erstaufruf dauern und
  // würde im Tap-Handler die iOS-User-Geste (Share-Sheet) killen.
  useEffect(() => {
    if (issue.current) return;
    let alive = true;
    blobRef.current = null;
    void renderCoverBlob(issue).then((b) => {
      if (alive) blobRef.current = b;
    });
    return () => {
      alive = false;
    };
  }, [issue]);

  const share = async () => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    try {
      const blob = blobRef.current ?? (await renderCoverBlob(issue));
      if (blob) await shareCoverBlob(blob, issue);
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };

  return (
    <article data-testid="magazine-issue">
      <div className="flex items-baseline justify-between border-b-2 border-fg pb-2">
        <span className="font-display text-3xl font-normal uppercase leading-none tracking-tight text-fg">
          Training
        </span>
        <span className="font-mono text-xs uppercase tracking-widest text-accent-2">
          Ausgabe {String(issue.nr).padStart(2, "0")}
        </span>
      </div>
      <div className="mt-1.5 flex items-center justify-between border-b border-line pb-2 font-mono text-xs uppercase tracking-widest">
        <span className="text-accent-2">{issue.monthLabel}</span>
        <span className="text-faint">{issue.current ? "Im Entstehen" : "Abgeschlossen"}</span>
      </div>

      {/* Cover-Zeile — Anton gibt es nur in 400: font-normal, kein Faux-Bold. */}
      <h1 className="mt-6 font-display text-5xl font-normal uppercase leading-none tracking-tight text-fg">
        {issue.headline}
      </h1>
      <p className="mt-3 text-lg italic leading-snug text-muted">{issue.headlineSub}</p>

      <div className="mt-6 grid grid-cols-3 border-y border-line">
        <IssueStat value={String(issue.sessions)} label={issue.sessions === 1 ? "Einheit" : "Einheiten"} className="border-r border-line pr-4" />
        <IssueStat value={fmtT(issue.tonnageT)} unit="t" label="Bewegt" className="border-r border-line px-4" />
        <IssueStat
          value={issue.avgRir != null ? String(issue.avgRir).replace(".", ",") : "–"}
          unit={issue.avgRir != null ? "RIR" : undefined}
          label="Anstrengung Ø"
          className="pl-4"
        />
      </div>

      {issue.topMuscles.length > 0 && (
        <p className="mt-4 flex flex-wrap gap-x-3 gap-y-1 font-mono text-xs uppercase tracking-widest text-muted">
          <span className="text-faint">Schwerpunkt</span>
          {issue.topMuscles.map((m) => (
            <span key={m.muscle}>
              {m.label} <span className="tabular-nums text-fg">{m.sets}</span>
            </span>
          ))}
        </p>
      )}

      <div className="mt-6 border-t border-line pt-5">
        <p className="mb-3 font-mono text-xs uppercase tracking-widest text-accent-2">
          Rekorde des Monats
        </p>
        {issue.prs.length === 0 ? (
          <p className="text-sm text-muted">
            Kein neuer Rekord in diesem Monat — Fundament zählt auch.
          </p>
        ) : (
          <ul>
            {issue.prs.slice(0, 6).map((e, i) => (
              <li
                key={e.exId + i}
                className="flex items-center justify-between gap-3 border-b border-line py-2 first:pt-0 last:border-0 last:pb-0"
              >
                <span className="truncate text-sm font-medium text-fg">{e.name}</span>
                <span className="shrink-0 font-display text-lg font-normal tabular-nums text-accent-ink">
                  {e.value} {recordUnit(e.kind)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Reveal>
        <div className="mt-6 border-t border-line pt-5">
          <p className="mb-2 flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-accent-ink">
            <AtlasMark size={14} className="text-fg" /> Von ATLAS
          </p>
          <div className="space-y-3">
            {issue.column.map((p, i) => (
              <p
                key={i}
                className={
                  i === issue.column.length - 1
                    ? "text-base italic leading-relaxed text-muted"
                    : "text-base leading-relaxed text-fg"
                }
              >
                {p}
              </p>
            ))}
          </div>
        </div>
      </Reveal>

      {issue.current ? (
        <p className="mt-6 border-t border-line pt-4 text-center font-mono text-xs uppercase tracking-widest text-faint">
          Die Zahlen wachsen mit jedem Training
        </p>
      ) : (
        <Pressable
          onClick={() => void share()}
          disabled={busy}
          data-testid="magazine-share"
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-card bg-strong py-3.5 text-sm font-semibold text-on-strong focus:outline-none disabled:opacity-60"
        >
          <Share2 size={16} /> {busy ? "Erstelle Bild…" : "Cover als Bild teilen"}
        </Pressable>
      )}
    </article>
  );
}

function IssueStat({
  value,
  unit,
  label,
  className,
}: {
  value: string;
  unit?: string;
  label: string;
  className?: string;
}) {
  return (
    <div className={`py-3 ${className ?? ""}`}>
      <p className="font-display text-3xl font-normal leading-none tracking-tight text-fg">
        {value}
        {unit && <span className="ml-1 font-mono text-sm text-muted">{unit}</span>}
      </p>
      <p className="mt-1 font-mono text-xs uppercase tracking-widest text-faint">{label}</p>
    </div>
  );
}
