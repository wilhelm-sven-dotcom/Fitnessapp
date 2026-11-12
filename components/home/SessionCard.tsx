"use client";

import { Pencil, RefreshCw } from "lucide-react";
import { useMemo } from "react";
import { BewegungsMini } from "@/components/bewegung/BewegungsMini";
import { GeraetBild } from "@/components/geraete/GeraetBild";
import { PhasenFigur } from "@/components/phasen/PhasenFigur";
import { Kicker } from "@/components/ui/Kicker";
import { Pressable } from "@/components/ui/pressable";
import { Sprechblase } from "@/components/ui/Sprechblase";
import { WishBar } from "@/components/home/WishBar";
import { useTraining } from "@/components/providers/TrainingProvider";
import { effectiveProfile } from "@/lib/athlete";
import { hatBewegung } from "@/lib/bewegung";
import { fmtGewicht } from "@/lib/format";
import { REGION_AUF, REGION_FLAECHE, regionOf } from "@/lib/phasen/band";
import { geraetVon } from "@/lib/geraete";
import { figurFor } from "@/lib/phasen/figuren";
import { presc } from "@/lib/progression";
import { startWeight } from "@/lib/start-weight";
import { muscleOf, MUSCLE_LABEL } from "@/lib/volume";
import type { DailySession } from "@/lib/session-model";
import { ATLAS_MIN_UEBUNGEN, uebungsLage, type AtlasFehler } from "@/lib/today-session";
import type { Exercise } from "@/lib/types";

/** Warum nur der Basisplan steht — vorher hieß JEDER Ausgang „nicht
 *  erreichbar“, auch das Minuten-Limit, gegen das Weiterklicken nicht hilft. */
const FEHLER_TEXT: Record<AtlasFehler, string> = {
  limit: "Plan: Basisplan. ATLAS ist ausgelastet, in einer Minute nochmal",
  zeit: "Plan: Basisplan. ATLAS brauchte zu lange",
  netz: "Plan: Basisplan. ATLAS war nicht erreichbar",
  ueberlastet: "Plan: Basisplan. ATLAS ist gerade überlastet",
  aus: "Plan: Basisplan. ATLAS ist nicht eingerichtet",
  schluessel: "Plan: Basisplan. Der Schlüssel für ATLAS wird nicht angenommen",
  guthaben: "Plan: Basisplan. ATLAS pausiert, das Guthaben im Anthropic-Konto ist aufgebraucht",
  zugang: "Plan: Basisplan. ATLAS braucht den Zugangscode (Einstellungen)",
  // „wenig“ bekommt unten die Zahlen des Orts.
  wenig: "Plan: Basisplan. Für ATLAS sind hier zu wenige Übungen wählbar",
  ablehnung: "Plan: Basisplan. ATLAS hat die Anfrage abgelehnt",
  abgeschnitten: "Plan: Basisplan. Der Plan von ATLAS kam unvollständig an",
  unbrauchbar: "Plan: Basisplan. Der Plan von ATLAS war nicht zu gebrauchen",
  anfrage: "Plan: Basisplan. ATLAS hat die Anfrage nicht angenommen",
  abgebrochen: "Plan: Basisplan. ATLAS war nicht erreichbar",
};

/** Ziel-Schema einer Zeile: „4 × 6–10 Wdh“ bzw. „3 × 30–45 s“. */
function zielVon(sets: number, lo: number, hi: number, sek: boolean): string {
  return `${sets} × ${lo}${hi > lo ? `–${hi}` : ""} ${sek ? "s" : "Wdh"}`;
}

/**
 * Die heutige Einheit „spotter“: EINE Karte mit Rand und hartem Schatten
 * (Name der Einheit, die Übungen als Zeilen mit Nummer-Kachel in der
 * Regionsfarbe, Figur, Schema · Muskel, Gewicht; unten die Plan-Quelle),
 * darunter ATLAS’ Begründung als Sprechblase und das Umbauen. Zeit und
 * „Los geht’s“ stehen im Dock über der Tab-Leiste (StartDock).
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
  const { lastPerf, settings, body, weightStep, has, disabledExercises } = useTraining();
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
          ? startWeight(ex, profile, { step: weightStep })?.w
          : undefined;
      const p = presc(ex, lp, { step: weightStep, startW });
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
  }, [session.items, byId, lastPerf, settings, body, weightStep]);

  // ATLAS plant erst ab fünf wählbaren Übungen. Die Meldung sagt, woran es
  // liegt: im Katalog ausgeblendet oder zu wenige Geräte am Ort.
  const wenigText = useMemo(() => {
    const { aktiv, ausgeblendet } = uebungsLage(allLib, has, disabledExercises);
    const n = aktiv === 1 ? "ist nur 1 Übung" : `sind nur ${aktiv} Übungen`;
    return ausgeblendet > 0
      ? `Plan: Basisplan. ATLAS braucht mindestens ${ATLAS_MIN_UEBUNGEN} Übungen, hier ${n} aktiv. ${ausgeblendet} sind im Katalog ausgeblendet`
      : `Plan: Basisplan. ATLAS braucht mindestens ${ATLAS_MIN_UEBUNGEN} Übungen, mit den Geräten hier ${n} möglich (Einstellungen → Orte & Geräte)`;
  }, [allLib, has, disabledExercises]);

  const quelle = regenerating
    ? "Plan: Basisplan steht — ATLAS stellt gerade um"
    : session.source === "atlas"
      ? "Plan: von ATLAS zusammengestellt"
      : settings.aiPlanning === false
        ? "Plan: Basisplan (KI abgeschaltet)"
        : atlasFehler === "wenig"
          ? wenigText
          : FEHLER_TEXT[atlasFehler ?? "netz"];

  return (
    <div className="mb-4 space-y-3">
      {/* Übungen: Nummer als Kachel in der Regionsfarbe, Figur in Tinte,
          Schema · Muskel, Gewicht rechts. */}
      <section className="overflow-hidden rounded-card border-dick border-rand bg-surface-1 shadow-hart">
        <div className="flex items-baseline justify-between gap-3 px-4 pb-1 pt-3.5">
          <h2 className="min-w-0 font-display text-lg font-extrabold leading-tight text-fg">
            {session.name}
          </h2>
        </div>
      <ol>
        {zeilen.map((z, i) => {
          if (!z) return null;
          const m = muscleOf(z.ex);
          const region = regionOf(z.ex);
          return (
            <li
              key={z.it.id}
              data-exercise-id={z.ex.id}
              className={i > 0 ? "border-t-2 border-dashed border-line-card" : undefined}
            >
              <div className="flex items-center gap-3 px-4 py-3">
                <span
                  aria-hidden
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-kachel border-dick border-rand font-display text-sm font-extrabold tabular-nums"
                  style={{ backgroundColor: REGION_FLAECHE[region], color: REGION_AUF[region] }}
                >
                  {i + 1}
                </span>
                {geraetVon(z.ex) ? (
                  <span
                    aria-hidden
                    className="h-8 w-11 shrink-0 overflow-hidden rounded-xs border-2 border-rand bg-surface-1"
                  >
                    <GeraetBild geraet={geraetVon(z.ex)!} dekorativ klein />
                  </span>
                ) : hatBewegung(z.ex.id) ? (
                  <BewegungsMini id={z.ex.id} />
                ) : (
                  <span aria-hidden className="w-11 shrink-0 px-1.5">
                    <PhasenFigur figur={figurFor(z.ex)} color="var(--fg)" />
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-base font-semibold leading-snug text-fg">{z.ex.name}</p>
                  <p className="mt-0.5 text-sm tabular-nums text-muted">
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
        <Kicker className="border-t-2 border-dashed border-line-card px-4 py-2.5 text-3xs">
          {quelle}
          {session.edited ? " · angepasst" : ""}
        </Kicker>
      </section>

      {/* ATLAS sagt, warum heute diese Einheit — als Sprechblase. */}
      {session.briefing && <Sprechblase>{session.briefing}</Sprechblase>}

      <p className="px-1 text-sm text-muted">
        {locked ? "Die Einheit läuft." : "Zuerst kommt das Aufwärmen."}
      </p>

      {/* Umbauen — eine Zeile, darunter der Wunsch an ATLAS. */}
      {!locked && (
        <div className="space-y-2.5 pt-1">
          <div className="flex flex-wrap items-center gap-2">
            <Pressable
              onClick={onEdit}
              className="flex min-h-11 items-center gap-2 rounded-pill border-dick border-rand bg-surface-1 px-4 font-display text-sm font-extrabold text-fg focus:outline-none focus-visible:ring-2 focus-visible:ring-fokus"
            >
              <Pencil size={16} aria-hidden /> Bearbeiten
            </Pressable>
            <Pressable
              onClick={() => onRegenerate()}
              // Nicht gesperrt: eine neue Anfrage bricht die laufende ab
              // (app/page.tsx, atlasAbort), es kann sich nichts stauen.
              className="flex min-h-11 items-center gap-2 rounded-pill border-dick border-rand bg-surface-1 px-4 font-display text-sm font-extrabold text-fg focus:outline-none focus-visible:ring-2 focus-visible:ring-fokus"
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
