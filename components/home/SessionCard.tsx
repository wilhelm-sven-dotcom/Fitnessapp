"use client";

import { Pencil, RefreshCw } from "lucide-react";
import { useMemo } from "react";
import { PhasenFigur } from "@/components/phasen/PhasenFigur";
import { Card } from "@/components/ui/Card";
import { Kicker } from "@/components/ui/Kicker";
import { Phasenband } from "@/components/ui/Phasenband";
import { Pressable } from "@/components/ui/pressable";
import { WishBar } from "@/components/home/WishBar";
import { useTraining } from "@/components/providers/TrainingProvider";
import { effectiveProfile } from "@/lib/athlete";
import { fmtGewicht } from "@/lib/format";
import { bandOfPlanned, REGION_VAR, regionOf } from "@/lib/phasen/band";
import { figurFor } from "@/lib/phasen/figuren";
import { presc } from "@/lib/progression";
import { startWeight } from "@/lib/start-weight";
import { muscleOf, MUSCLE_LABEL } from "@/lib/volume";
import type { DailySession } from "@/lib/session-model";
import type { AtlasFehler } from "@/lib/today-session";
import type { Exercise } from "@/lib/types";

/** Warum nur der Basisplan steht — vorher hieß JEDER Ausgang „nicht
 *  erreichbar“, auch das Minuten-Limit, gegen das Weiterklicken nicht hilft. */
const FEHLER_TEXT: Record<AtlasFehler, string> = {
  limit: "Plan: Basisplan — ATLAS ist ausgelastet, in einer Minute nochmal",
  zeit: "Plan: Basisplan — ATLAS brauchte zu lange",
  netz: "Plan: Basisplan — ATLAS war nicht erreichbar",
  aus: "Plan: Basisplan — ATLAS ist nicht eingerichtet",
  abgebrochen: "Plan: Basisplan — ATLAS war nicht erreichbar",
};

/** Ziel-Schema einer Zeile: „4 × 6–10 Wdh“ bzw. „3 × 30–45 s“. */
function zielVon(sets: number, lo: number, hi: number, sek: boolean): string {
  return `${sets} × ${lo}${hi > lo ? `–${hi}` : ""} ${sek ? "s" : "Wdh"}`;
}

/**
 * Die heutige Einheit: EINE Karte (Phasenband + ATLAS-Begründung +
 * Plan-Quelle), darunter die Übungen als Zeilen (Regionsmarke, Figur, Name,
 * Schema · Muskel in der Regionsfarbe, Gewicht) und das Umbauen. Zeit und
 * „Training starten“ stehen im Dock über der Tab-Leiste (StartDock).
 */
export function SessionCard({
  session,
  allLib,
  onEdit,
  onRegenerate,
  regenerating,
  atlasFehler,
  locked,
  spareSlot,
}: {
  session: DailySession;
  allLib: Exercise[];
  onEdit: () => void;
  /** Neu ansetzen, optional mit Wunsch-Text. */
  onRegenerate: (wish?: string) => void;
  regenerating?: boolean;
  /** Grund, warum ATLAS nichts geliefert hat — null = kein Fehler. */
  atlasFehler?: AtlasFehler | null;
  /** Einheit läuft bereits — Umbau gesperrt. */
  locked?: boolean;
  /** Slot für den „Rücken schonen"-Schalter der Startseite. */
  spareSlot?: React.ReactNode;
}) {
  const { lastPerf, settings, body } = useTraining();
  const byId = useMemo(() => new Map(allLib.map((e) => [e.id, e])), [allLib]);

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

  const quelle = regenerating
    ? "Plan: Basisplan steht — ATLAS stellt gerade um"
    : session.source === "atlas"
      ? "Plan: von ATLAS zusammengestellt"
      : settings.aiPlanning === false
        ? "Plan: Basisplan (KI abgeschaltet)"
        : FEHLER_TEXT[atlasFehler ?? "netz"];

  return (
    <div className="mb-4 space-y-3">
      {/* Die Einheit auf einen Blick: Phasenband + Warum + Plan-Quelle. */}
      <Card>
        <Phasenband gruppen={gruppen} groesse="hero" zoetropOn={settings.zoetrope !== false} />
        {session.briefing && (
          <p className="mt-3 text-base leading-relaxed text-fg">{session.briefing}</p>
        )}
        <Kicker className="mt-3 border-t border-line-card pt-2.5">
          {quelle}
          {session.edited ? " · angepasst" : ""}
        </Kicker>
      </Card>

      {/* Übungen: Regionsmarke + Figur, Schema · Muskel in der Regionsfarbe
          (die Marke ist zugleich die Legende des Bands), Gewicht rechts. */}
      <ol className="overflow-hidden rounded-card bg-surface-1">
        {zeilen.map((z, i) => {
          if (!z) return null;
          const m = muscleOf(z.ex);
          const farbe = REGION_VAR[regionOf(z.ex)];
          return (
            <li
              key={z.it.id}
              data-exercise-id={z.ex.id}
              className={i > 0 ? "border-t border-line-card" : undefined}
            >
              <div className="flex items-center gap-3 px-4 py-3">
                <span
                  aria-hidden
                  className="h-10 w-1 shrink-0 rounded-pill"
                  style={{ backgroundColor: farbe }}
                />
                <span aria-hidden className="w-8 shrink-0">
                  <PhasenFigur figur={figurFor(z.ex)} color={farbe} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-base font-semibold leading-snug text-fg">{z.ex.name}</p>
                  <p className="mt-0.5 text-sm tabular-nums" style={{ color: farbe }}>
                    {z.ziel} · {MUSCLE_LABEL[m.primary]}
                  </p>
                </div>
                {z.weight != null && (
                  <p className="shrink-0 text-right tabular-nums">
                    {z.plus != null && (
                      <span className="mr-1.5 text-sm font-semibold text-info">
                        +{fmtGewicht(z.plus)}
                      </span>
                    )}
                    <span className="text-lg font-bold text-fg">{fmtGewicht(z.weight)}</span>
                    <span className="ml-0.5 text-sm text-muted">kg</span>
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ol>
      <p className="px-1 text-sm text-muted">
        {locked ? "Die Einheit läuft." : "Zuerst kommt das Aufwärmen."}
      </p>

      {/* Umbauen — eine Zeile, darunter der Wunsch an ATLAS. */}
      {!locked && (
        <div className="space-y-2.5 pt-1">
          <div className="flex flex-wrap items-center gap-2">
            <Pressable
              onClick={onEdit}
              className="flex min-h-11 items-center gap-2 rounded-pill bg-surface-1 px-4 text-sm font-semibold text-fg focus:outline-none focus-visible:ring-2 focus-visible:ring-fokus"
            >
              <Pencil size={16} aria-hidden /> Bearbeiten
            </Pressable>
            <Pressable
              onClick={() => onRegenerate()}
              // Nicht gesperrt: eine neue Anfrage bricht die laufende ab
              // (app/page.tsx, atlasAbort), es kann sich nichts stauen.
              className="flex min-h-11 items-center gap-2 rounded-pill bg-surface-1 px-4 text-sm font-semibold text-fg focus:outline-none focus-visible:ring-2 focus-visible:ring-fokus"
            >
              <RefreshCw size={16} aria-hidden className={regenerating ? "opacity-50" : undefined} />
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
