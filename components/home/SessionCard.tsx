"use client";

import { Pencil, RefreshCw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Kicker } from "@/components/ui/Kicker";
import { Phasenband } from "@/components/ui/Phasenband";
import { Pressable } from "@/components/ui/pressable";
import { WishBar } from "@/components/home/WishBar";
import { useTraining } from "@/components/providers/TrainingProvider";
import { effectiveProfile } from "@/lib/athlete";
import { fmtGewicht } from "@/lib/format";
import { tap } from "@/lib/haptics";
import { bandOfPlanned } from "@/lib/phasen/band";
import { presc } from "@/lib/progression";
import { startWeight } from "@/lib/start-weight";
import { muscleOf, MUSCLE_LABEL } from "@/lib/volume";
import { cn } from "@/lib/utils";
import type { DailySession } from "@/lib/session-model";
import type { AtlasFehler } from "@/lib/today-session";
import type { Exercise } from "@/lib/types";

/** Fünf Stufen statt sieben — alles dazwischen geht über das freie Feld. */
const BUDGETS = [20, 30, 45, 60, 90];

/** Warum nur der Basisplan steht — vorher hieß JEDER Ausgang „nicht
 *  erreichbar“, auch das Minuten-Limit, gegen das Weiterklicken nicht hilft. */
const FEHLER_TEXT: Record<AtlasFehler, string> = {
  limit: "Plan: Basisplan — ATLAS ist ausgelastet, in einer Minute nochmal",
  zeit: "Plan: Basisplan — ATLAS brauchte zu lange",
  netz: "Plan: Basisplan — ATLAS war nicht erreichbar",
  aus: "Plan: Basisplan — ATLAS ist nicht eingerichtet",
  abgebrochen: "Plan: Basisplan — ATLAS war nicht erreichbar",
};

/** Ziel-Schema einer Zeile: „4 × 6–10". */
function zielVon(sets: number, lo: number, hi: number, sek: boolean): string {
  return `${sets} × ${lo}${hi > lo ? `–${hi}` : ""}${sek ? " s" : ""}`;
}

/**
 * Die heutige Einheit, einfach: EINE Karte (Filmstreifen + ATLAS-Begründung +
 * Plan-Quelle), Zeit und „Training starten“ — alles auf dem ersten Bildschirm —,
 * darunter die Übungsliste (ihre Farbtupfer sind zugleich die Legende des
 * Bands) und das Umbauen.
 * Früher standen hier drei Karten, die Hauptübung doppelt und Einheit-Nr.
 * und Satzzahl zweimal; was im Training ohnehin wieder kommt (Rekord,
 * Gewichts-Hypothese), steht dort, wo es gebraucht wird.
 */
export function SessionCard({
  session,
  allLib,
  budgetMin,
  onBudget,
  onStart,
  onEdit,
  onRegenerate,
  regenerating,
  atlasFehler,
  locked,
  spareSlot,
}: {
  session: DailySession;
  allLib: Exercise[];
  budgetMin: number;
  onBudget: (min: number) => void;
  onStart: () => void;
  onEdit: () => void;
  /** Neu ansetzen, optional mit Wunsch-Text. */
  onRegenerate: (wish?: string) => void;
  regenerating?: boolean;
  /** Grund, warum ATLAS nichts geliefert hat — null = kein Fehler. */
  atlasFehler?: AtlasFehler | null;
  /** Einheit läuft bereits — Umbau gesperrt, Start wird „Fortsetzen". */
  locked?: boolean;
  /** Slot für den „Rücken schonen"-Schalter der Startseite. */
  spareSlot?: React.ReactNode;
}) {
  const { lastPerf, settings, body } = useTraining();
  const byId = useMemo(() => new Map(allLib.map((e) => [e.id, e])), [allLib]);

  // Freie Minutenzahl: lokal getippt, erst beim Verlassen des Feldes
  // übernommen — sonst löst jede Ziffer eine Neukomposition aus. Steht die
  // Zeit auf einer Stufe, bleibt das Feld leer (sonst stünde die Zahl doppelt).
  const freiVon = (min: number) => (BUDGETS.includes(min) ? "" : String(min));
  const [freieZeit, setFreieZeit] = useState(freiVon(budgetMin));
  useEffect(() => setFreieZeit(freiVon(budgetMin)), [budgetMin]);
  const uebernehmeFreieZeit = () => {
    if (!freieZeit.trim()) return;
    const n = Math.round(Number(freieZeit));
    if (!Number.isFinite(n) || n < 10 || n > 180) {
      setFreieZeit(freiVon(budgetMin));
      return;
    }
    if (n !== budgetMin) onBudget(n);
  };

  // Gewichts-Vorschlag je Übung (presc; ohne Historie: Startgewichts-Engine)
  // und der Sprung gegenüber dem letzten Mal.
  const zeilen = useMemo(() => {
    const profile = effectiveProfile(settings, body);
    return session.items.map((it) => {
      const ex = byId.get(it.exerciseId);
      if (!ex) return null;
      const lp = lastPerf(ex.id);
      const startW =
        !lp && ex.weighted
          ? startWeight(ex, profile, { step: settings.weightStep })?.w
          : undefined;
      const p = presc(ex, lp, { step: settings.weightStep, startW });
      const weight = ex.weighted && p.suggestedWeight ? p.suggestedWeight : null;
      const lastTop = lp
        ? Math.max(0, ...lp.sets.filter((s) => !s.warmup).map((s) => Number(s.weight) || 0))
        : 0;
      const plus = weight != null && lastTop > 0 && weight > lastTop ? weight - lastTop : null;
      return {
        it,
        ex,
        weight,
        plus,
        ziel: zielVon(it.sets, it.repLow, it.repHigh, ex.unit === "Sek"),
      };
    });
  }, [session.items, byId, lastPerf, settings, body]);

  // Die Vorschläge färben auch die Basislinien des Bands (IWF-Scheibenfarbe
  // der geplanten Last) — EINE Berechnung für beides.
  const kgByItem = useMemo(() => {
    const m = new Map<string, number>();
    for (const z of zeilen) if (z && z.weight != null) m.set(z.it.id, z.weight);
    return m;
  }, [zeilen]);
  const gruppen = useMemo(
    () => bandOfPlanned(session.items, byId, kgByItem),
    [session.items, byId, kgByItem],
  );
  const tintByItem = useMemo(
    () => new Map(gruppen.map((g) => [g.itemId, g.tintVar])),
    [gruppen],
  );

  const quelle = regenerating
    ? "Plan: Basisplan steht — ATLAS stellt gerade um"
    : session.source === "atlas"
      ? "Plan: von ATLAS zusammengestellt"
      : settings.aiPlanning === false
        ? "Plan: Basisplan (KI abgeschaltet)"
        : FEHLER_TEXT[atlasFehler ?? "netz"];

  return (
    <div className="mb-4 space-y-4">
      {/* Die Einheit auf einen Blick: Filmstreifen + Warum. */}
      <Card className="p-4">
        <Phasenband gruppen={gruppen} groesse="hero" zoetropOn={settings.zoetrope !== false} />
        {session.briefing && (
          <p className="mt-3 font-display text-base leading-relaxed text-fg">
            {session.briefing}
          </p>
        )}
        <Kicker className="mt-3 border-t border-line-card pt-2.5 font-medium tracking-gesperrt">
          {quelle}
          {session.edited ? " · angepasst" : ""}
        </Kicker>
      </Card>

      {/* Zeitbudget — steuert Komposition und Auto-Anpassung. Neben den
          Stufen ein freies Feld: 43 oder 53 Minuten sind echte Zeitfenster,
          und ATLAS bekommt die Zahl ohnehin als Zahl. */}
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="mr-1 font-mono text-3xs font-semibold uppercase tracking-gesperrt-2 text-muted">
          Zeit
        </span>
        {BUDGETS.map((b) => (
          <Pressable
            key={b}
            onClick={() => onBudget(b)}
            aria-label={`Zeitbudget ${b} Minuten`}
            aria-pressed={budgetMin === b}
            className={cn(
              "rounded-pill px-3 py-2 font-mono text-xs font-medium tabular-nums",
              budgetMin === b
                ? "bg-strong text-on-strong"
                : "border border-line bg-transparent text-muted",
            )}
          >
            {b}
          </Pressable>
        ))}
        <input
          type="number"
          inputMode="numeric"
          min={10}
          max={180}
          value={freieZeit}
          onChange={(e) => setFreieZeit(e.target.value)}
          onFocus={(e) => e.currentTarget.select()}
          onBlur={uebernehmeFreieZeit}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur();
          }}
          aria-label="Zeitbudget frei eingeben, Minuten"
          placeholder="frei"
          className={cn(
            "w-16 rounded-pill border bg-transparent px-2 py-2 text-center font-mono text-xs font-medium tabular-nums focus:outline-none focus-visible:ring-2 focus-visible:ring-cyanotypie",
            BUDGETS.includes(budgetMin) ? "border-line text-muted" : "border-strong text-fg",
          )}
        />
      </div>

      {/* Der große CTA + Hinweis, was zuerst kommt. */}
      <div>
        <Button
          data-testid="start"
          onClick={() => {
            tap();
            onStart();
          }}
          size="lg"
          full
          className="tracking-gesperrt-3"
        >
          {locked ? "Training fortsetzen" : "Training starten"}
        </Button>
        <p className="mt-2 text-center font-mono text-4xs font-medium uppercase tracking-gesperrt-2 text-muted">
          {locked ? "Die Einheit läuft" : "Zuerst: Aufwärmen"}
        </p>
      </div>

      {/* Übungsliste: Hairline-Zeilen, Farbtupfer = Region im Band. */}
      <ol>
        {zeilen.map((z, i) => {
          if (!z) return null;
          const m = muscleOf(z.ex);
          return (
            <li
              key={z.it.id}
              data-exercise-id={z.ex.id}
              className={cn(
                "border-t border-line py-2.5",
                i === zeilen.length - 1 && "border-b",
              )}
            >
              <div className="flex items-baseline justify-between gap-3">
                <div className="flex min-w-0 items-baseline gap-2">
                  <span
                    aria-hidden
                    className="inline-block h-2 w-2 shrink-0 rounded-xs"
                    style={{ backgroundColor: tintByItem.get(z.it.id), opacity: 0.8 }}
                  />
                  <div className="min-w-0">
                    <p className="font-display text-lg italic leading-snug text-fg">{z.ex.name}</p>
                    <p className="mt-0.5 font-mono text-3xs font-medium uppercase tracking-gesperrt text-muted">
                      <span className="tabular-nums">{z.ziel}</span> · {MUSCLE_LABEL[m.primary]}
                    </p>
                  </div>
                </div>
                {z.weight != null && (
                  <p className="shrink-0 text-right font-mono tabular-nums">
                    {z.plus != null && (
                      <span className="mr-1.5 text-2xs font-semibold text-cyanotypie">
                        +{fmtGewicht(z.plus)}
                      </span>
                    )}
                    <span className="text-lg font-semibold text-fg">{fmtGewicht(z.weight)}</span>
                    <span className="ml-1 text-3xs font-medium uppercase tracking-gesperrt text-muted">
                      kg
                    </span>
                  </p>
                )}
              </div>
              {z.it.why && (
                <p className="mt-1 pl-4 font-display text-sm leading-snug text-muted">
                  {z.it.why}
                </p>
              )}
            </li>
          );
        })}
      </ol>

      {/* Umbauen — eine Zeile, darunter der Wunsch an ATLAS. */}
      {!locked && (
        <div className="space-y-2 border-t border-line pt-3">
          <div className="flex flex-wrap items-center gap-2">
            <Pressable
              onClick={onEdit}
              className="flex items-center gap-1.5 rounded-pill border border-strong px-3 py-2 font-mono text-xs font-semibold uppercase tracking-gesperrt-2 text-fg"
            >
              <Pencil size={14} aria-hidden /> Bearbeiten
            </Pressable>
            <Pressable
              onClick={() => onRegenerate()}
              // Nicht gesperrt: eine neue Anfrage bricht die laufende ab
              // (app/page.tsx, atlasAbort), es kann sich nichts stauen.
              className="flex items-center gap-1.5 rounded-pill border border-strong px-3 py-2 font-mono text-xs font-semibold uppercase tracking-gesperrt-2 text-fg"
            >
              <RefreshCw size={14} aria-hidden className={regenerating ? "opacity-50" : undefined} />
              {regenerating ? "ATLAS ordnet an …" : "Neu ansetzen"}
            </Pressable>
            {spareSlot}
          </div>
          <WishBar onSubmit={(wish) => onRegenerate(wish)} />
        </div>
      )}
    </div>
  );
}
