"use client";

import { Pencil, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Phasenband } from "@/components/ui/Phasenband";
import { PhasenFigur } from "@/components/phasen/PhasenFigur";
import { Pressable } from "@/components/ui/pressable";
import { WishBar } from "@/components/home/WishBar";
import { useTraining } from "@/components/providers/TrainingProvider";
import { effectiveProfile } from "@/lib/athlete";
import { tap } from "@/lib/haptics";
import { bandOfPlanned } from "@/lib/phasen/band";
import { figurFor } from "@/lib/phasen/figuren";
import { plattenNummer } from "@/lib/platte";
import { presc } from "@/lib/progression";
import { bestForExercise, recordUnit } from "@/lib/records";
import { startWeight } from "@/lib/start-weight";
import { muscleOf, MUSCLE_LABEL } from "@/lib/volume";
import { cn } from "@/lib/utils";
import type { DailySession } from "@/lib/session-model";
import type { AtlasFehler } from "@/lib/today-session";
import type { Exercise } from "@/lib/types";

const BUDGETS = [20, 25, 30, 45, 60, 75, 90];

/** Warum nur der Basisplan steht — vorher hieß JEDER Ausgang „nicht
 *  erreichbar“, auch das Minuten-Limit, gegen das Weiterklicken nicht hilft. */
const FEHLER_TEXT: Record<AtlasFehler, string> = {
  limit: "Plan: Basisplan — ATLAS ist ausgelastet, in einer Minute nochmal",
  zeit: "Plan: Basisplan — ATLAS brauchte zu lange",
  netz: "Plan: Basisplan — ATLAS war nicht erreichbar",
  aus: "Plan: Basisplan — ATLAS ist nicht eingerichtet",
  abgebrochen: "Plan: Basisplan — ATLAS war nicht erreichbar",
};

const fmtKg = (n: number) =>
  n.toLocaleString("de-DE", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

/** Ziel-Schema einer Zeile: „4 × 6–10". */
function zielVon(sets: number, lo: number, hi: number, sek: boolean): string {
  return `${sets} × ${lo}${hi > lo ? `–${hi}` : ""}${sek ? " s" : ""}`;
}

/**
 * Die heutige Einheit als Kartenfolge (Handoff Heute.dc): Marey-Karte der
 * Hauptübung (Chronofotografie + Gewichts-Vorschlag), ATLAS-Karte,
 * Phasenband-Karte, Übungsliste als Hairline-Zeilen, Stempel-CTA.
 * Alles Wichtige steht hier — kein Springen.
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
  direktive,
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
  /** Slot für den „Rücken schonen"-Toggle der Startseite. */
  spareSlot?: React.ReactNode;
  /** ATLAS-Direktive des Tages — Zeile in der ATLAS-Karte, führt zu /coach. */
  direktive?: string;
}) {
  const router = useRouter();
  const { lastPerf, log, settings, body } = useTraining();
  const byId = useMemo(() => new Map(allLib.map((e) => [e.id, e])), [allLib]);

  // Freie Minutenzahl: lokal getippt, erst beim Verlassen des Feldes
  // übernommen — sonst löst jede Ziffer eine Neukomposition aus.
  const [freieZeit, setFreieZeit] = useState(String(budgetMin));
  useEffect(() => setFreieZeit(String(budgetMin)), [budgetMin]);
  const uebernehmeFreieZeit = () => {
    const n = Math.round(Number(freieZeit));
    if (!Number.isFinite(n) || n < 10 || n > 180) {
      setFreieZeit(String(budgetMin));
      return;
    }
    if (n !== budgetMin) onBudget(n);
  };

  // Signatur: die heutige Einheit als Phasenband (ein Feld je Arbeitssatz).
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
      const weight =
        ex.weighted && p.suggestedWeight ? p.suggestedWeight : null;
      return { it, ex, weight, ziel: zielVon(it.sets, it.repLow, it.repHigh, ex.unit === "Sek") };
    });
  }, [session.items, byId, lastPerf, settings, body]);

  // Die Gewichtsvorschläge der Übungsliste färben auch die Basislinien des
  // Bands (IWF-Scheibenfarbe der geplanten Last) — EINE Berechnung für beide.
  const kgByItem = useMemo(() => {
    const m = new Map<string, number>();
    for (const z of zeilen) if (z && z.weight != null) m.set(z.it.id, z.weight);
    return m;
  }, [zeilen]);

  const gruppen = useMemo(
    () => bandOfPlanned(session.items, byId, kgByItem),
    [session.items, byId, kgByItem],
  );
  const kaderZahl = useMemo(
    () => gruppen.reduce((n, g) => n + g.kader.length, 0),
    [gruppen],
  );

  // Gewichts-Vorschrift je Übung (presc; ohne Historie: Startgewichts-Engine).
  // Marey-Karte: die Hauptübung (erstes Item) mit Hypothese + Rekord.
  const marey = useMemo(() => {
    const zeile = zeilen[0];
    if (!zeile) return null;
    const { ex, weight } = zeile;
    const lp = lastPerf(ex.id);
    const lastTop = lp
      ? Math.max(
          0,
          ...lp.sets
            .filter((s: { warmup?: boolean }) => !s.warmup)
            .map((s: { weight: string }) => Number(s.weight) || 0),
        )
      : 0;
    const delta = weight != null && lastTop > 0 ? weight - lastTop : null;
    const best = bestForExercise(log, ex.id);
    const figur = figurFor(ex);
    const hypothese =
      weight == null
        ? `Vorschlag · ${zeile.ziel}`
        : delta != null && delta > 0
          ? `Vorschlag +${fmtKg(delta)} kg · ${zeile.ziel}`
          : delta != null && delta === 0
            ? `Vorschlag halten · ${zeile.ziel}`
            : lp
              ? `Vorschlag ${fmtKg(weight)} kg · ${zeile.ziel}`
              : `Aufwärmen · ${zeile.ziel}`;
    return {
      ex,
      figur,
      weight,
      hypothese,
      rekord: best
        ? `Rekord ${best.kind === "weight" ? fmtKg(best.best) : `${best.best} ${recordUnit(best.kind)}`}`
        : null,
    };
  }, [zeilen, lastPerf, log]);

  const plattenNr = plattenNummer(log);

  return (
    <div className="mb-4 space-y-3">
      {/* Marey-Karte: die Hauptübung als Chronofotografie. */}
      {marey && (
        <Card>
          <div className="flex justify-between font-mono text-3xs font-medium uppercase tracking-gesperrt text-muted">
            <span>
              Hauptübung · Phase {marey.figur.phases.length}/{marey.figur.phases.length}
            </span>
            <span>Marey</span>
          </div>
          <div className="mt-2.5">
            <PhasenFigur figur={marey.figur} mode="marey" color="var(--accent)" raster />
          </div>
          <div className="mt-2.5 flex items-baseline justify-between gap-3">
            <p className="min-w-0 truncate font-display text-2xl italic text-fg">
              {marey.ex.name}
            </p>
            {marey.weight != null && (
              <p className="shrink-0 font-mono text-readout font-bold leading-none tabular-nums text-fg">
                {fmtKg(marey.weight)}
                <span className="ml-1 align-middle text-2xs font-medium tracking-widest">
                  KG
                </span>
              </p>
            )}
          </div>
          <div className="mt-2.5 flex flex-wrap justify-between gap-x-2 gap-y-1 font-mono text-3xs font-medium uppercase tracking-gesperrt">
            <span className="text-cyanotypie">{marey.hypothese}</span>
            {marey.rekord && <span className="text-messing">{marey.rekord}</span>}
          </div>
        </Card>
      )}

      {/* ATLAS-Karte: Begründung + Direktive des Coaches. */}
      {(session.briefing || direktive) && (
        <Card>
          <div className="flex justify-between font-mono text-3xs font-medium uppercase tracking-gesperrt text-muted">
            <span>ATLAS · Ansage</span>
            <span className="tabular-nums">Einheit {plattenNr}</span>
          </div>
          {session.briefing && (
            <p className="mt-2 font-display text-base leading-relaxed text-fg">
              {session.briefing}
            </p>
          )}
          {direktive && (
            <Pressable
              onClick={() => router.push("/coach")}
              className="mt-2.5 flex w-full items-baseline justify-between gap-2 border-t border-line-card pt-2.5 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-cyanotypie"
            >
              <span className="min-w-0 font-mono text-xs leading-snug text-fg">
                {direktive}
              </span>
              <span aria-hidden className="shrink-0 font-mono text-xs text-muted">
                →
              </span>
            </Pressable>
          )}
        </Card>
      )}

      {/* Phasenband-Karte: der Filmstreifen der geplanten Sätze. */}
      <Card>
        <div className="flex justify-between font-mono text-3xs font-medium uppercase tracking-gesperrt text-muted">
          <span>
            Übersicht · <span className="tabular-nums">{kaderZahl}</span> Sätze
          </span>
        </div>
        <Phasenband
          gruppen={gruppen}
          groesse="hero"
          zoetropOn={settings.zoetrope !== false}
          className="mt-2.5"
        />
        {gruppen.length > 1 && (
          // Umbrechen statt abschneiden — „KLIM…“ liest niemand. Der Tupfer
          // trägt die Regionsfarbe der Tönung: Namen und Legende in EINER Zeile.
          <div className="mt-2 flex flex-wrap gap-x-2.5 gap-y-1 font-mono text-5xs uppercase tracking-gesperrt text-muted">
            {gruppen.map((g) => (
              <span key={g.itemId} className="inline-flex items-baseline gap-1">
                <span
                  aria-hidden
                  className="inline-block h-1.5 w-1.5 shrink-0 self-center rounded-xs"
                  style={{ backgroundColor: g.tintVar, opacity: 0.7 }}
                />
                {g.label} ×{g.kader.length}
              </span>
            ))}
          </div>
        )}
      </Card>

      {/* Übungsliste: Hairline-Zeilen auf dem Grund — vollständig, mit Warum. */}
      <div>
        <p className="mb-1 font-mono text-3xs font-medium uppercase tracking-gesperrt text-muted">
          {regenerating
            ? "Plan: Basisplan steht — ATLAS stellt gerade um"
            : session.source === "atlas"
              ? "Plan: von ATLAS zusammengestellt"
              : session.source === "manuell"
                ? "Plan: von dir gebaut"
                : settings.aiPlanning === false
                  ? "Plan: Basisplan (KI abgeschaltet)"
                  : FEHLER_TEXT[atlasFehler ?? "netz"]}
          {session.edited ? " · angepasst" : ""}
        </p>
        <ol>
          {zeilen.map((z, i) => {
            if (!z) return null;
            const m = muscleOf(z.ex);
            return (
              <li
                key={z.it.id}
                className={cn(
                  "border-t border-line py-2.5",
                  i === zeilen.length - 1 && "border-b",
                )}
              >
                <div className="flex items-baseline justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-display text-lg italic text-fg">
                      {z.ex.name}
                    </p>
                    <p className="mt-0.5 font-mono text-3xs font-medium uppercase tracking-gesperrt text-muted">
                      <span className="tabular-nums">{z.ziel}</span> ·{" "}
                      {MUSCLE_LABEL[m.primary]}
                    </p>
                  </div>
                  {z.weight != null && (
                    <p className="shrink-0 font-mono text-lg font-semibold tabular-nums text-fg">
                      {fmtKg(z.weight)}
                      <span className="ml-1 text-3xs font-medium tracking-widest">KG</span>
                    </p>
                  )}
                </div>
                {z.it.why && (
                  <p className="mt-1 font-display text-sm leading-snug text-muted">
                    {z.it.why}
                  </p>
                )}
              </li>
            );
          })}
        </ol>
      </div>

      {/* Zeitbudget — steuert Komposition und Auto-Anpassung. Neben den
          Stufen ein freies Feld: 43 oder 53 Minuten sind echte Zeitfenster,
          und ATLAS bekommt die Zahl ohnehin als Zahl. */}
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="mr-1 font-mono text-3xs font-medium uppercase tracking-gesperrt text-muted">
          Zeit
        </span>
        {BUDGETS.map((b) => (
          <Pressable
            key={b}
            onClick={() => onBudget(b)}
            aria-label={`Zeitbudget ${b} Minuten`}
            aria-pressed={budgetMin === b}
            className={cn(
              "rounded-pill px-3 py-2 font-mono text-xs font-medium tabular-nums focus:outline-none focus-visible:ring-2 focus-visible:ring-cyanotypie",
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
            BUDGETS.includes(budgetMin)
              ? "border-line text-muted"
              : "border-strong text-fg",
          )}
        />
      </div>

      {spareSlot && <div>{spareSlot}</div>}

      {/* Der große CTA + Hinweis, was zuerst kommt. */}
      <div>
        <Button
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
          Zuerst: Aufwärmen
        </p>
      </div>

      {!locked && (
        <div className="space-y-2 border-t border-line pt-3">
          <div className="flex items-center gap-2">
            <Pressable
              onClick={onEdit}
              className="flex items-center gap-1.5 rounded-pill border border-strong px-3 py-2 font-mono text-xs font-semibold uppercase tracking-gesperrt-2 text-fg focus:outline-none focus-visible:ring-2 focus-visible:ring-cyanotypie"
            >
              <Pencil size={13} /> Bearbeiten
            </Pressable>
            <Pressable
              onClick={() => onRegenerate()}
              // Nicht mehr gesperrt: eine neue Anfrage bricht die laufende
              // ab (app/page.tsx, atlasAbort), es kann sich also nichts
              // stauen. Der Text sagt weiterhin, dass ATLAS arbeitet.
              className="flex items-center gap-1.5 rounded-pill border border-strong px-3 py-2 font-mono text-xs font-semibold uppercase tracking-gesperrt-2 text-fg focus:outline-none focus-visible:ring-2 focus-visible:ring-cyanotypie"
            >
              <RefreshCw size={13} className={regenerating ? "opacity-50" : undefined} />
              {regenerating ? "ATLAS ordnet an …" : "Neu ansetzen"}
            </Pressable>
          </div>
          <WishBar onSubmit={(wish) => onRegenerate(wish)} />
        </div>
      )}
    </div>
  );
}
