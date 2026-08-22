"use client";

import { PhasenFigur } from "@/components/phasen/PhasenFigur";
import type { Kader, KaderGruppe } from "@/lib/phasen/band";
import { cn } from "@/lib/utils";

/**
 * Das Phasenband — der Filmstreifen der Einheit (Signatur, ersetzt das
 * Etappen-Profil). Jeder Arbeitssatz ein Kader: Breite ∝ Wiederholungen
 * (flex-grow), belichtet = Tintenfüllung (Höhe = Leistung/Rekord) mit
 * eingefrorener Silhouette in Kartonfarbe (nur hero), aktiv = Siegellack-
 * Rahmen + Zoetrop-Figur, offen = Fadenraster + Basislinie (IWF-Farbe der
 * Last, sonst Tinte, 45 %). Gruppen trennt eine Fuge.
 *
 * Motion (Filmtransport): die Füllung KRIECHT NICHT — sie steht hart im
 * Commit-Moment (steps(1)); dieses Band rendert reine Zustände. live/punkt
 * sind konstante Vollbalken (Fokus-Kopf bzw. Kompakt-Anzeigen).
 */

export type PhasenbandGroesse = "hero" | "zeile" | "mini" | "live" | "punkt";

const HOEHE: Record<PhasenbandGroesse, number> = {
  hero: 64,
  zeile: 28,
  mini: 24,
  live: 14,
  punkt: 12,
};

/** Fadenraster wie im Handoff: repeating-linear-gradient als Rasterlinien
 *  (technisches Raster, kein Farbverlauf — die Referenz zeichnet es so). */
const RASTER_BG = {
  backgroundImage:
    "repeating-linear-gradient(to right, var(--line-card) 0, var(--line-card) 0.5px, transparent 0.5px, transparent 9px)," +
    "repeating-linear-gradient(to bottom, var(--line-card) 0, var(--line-card) 0.5px, transparent 0.5px, transparent 9px)",
} as const;

const IWF_VAR: Record<string, string> = {
  rot: "var(--iwf-rot)",
  blau: "var(--iwf-blau)",
  gelb: "var(--iwf-gelb)",
  gruen: "var(--iwf-gruen)",
};

function KaderZelle({
  kader,
  gruppe,
  nummer,
  groesse,
  zoetropOn,
}: {
  kader: Kader;
  gruppe: KaderGruppe;
  nummer: number;
  groesse: PhasenbandGroesse;
  zoetropOn?: boolean;
}) {
  const h = HOEHE[groesse];
  const hero = groesse === "hero";
  const kompakt = groesse === "live" || groesse === "punkt";
  const aktiv = kader.status === "aktiv";
  const belichtet = kader.status === "belichtet";

  // Kompakt (Fokus-Kopf): konstante Vollbalken — nur der Status spricht.
  if (kompakt) {
    return (
      <div
        className={cn(
          "rounded-xs border",
          belichtet
            ? "border-transparent bg-fg"
            : aktiv
              ? "border-transparent bg-accent-sessions"
              : "border-line-card bg-transparent",
        )}
        style={{ flex: `${kader.widthReps} 1 0%`, height: h }}
      />
    );
  }

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-pill border",
        aktiv ? "border-accent-ink" : "border-line-card",
      )}
      style={{
        flex: `${kader.widthReps} 1 0%`,
        height: h,
        ...(belichtet ? undefined : RASTER_BG),
      }}
    >
      {belichtet && (
        <>
          <div
            className="absolute inset-x-0 bottom-0 bg-fg"
            style={{ height: `${Math.round(kader.fillRatio * 100)}%` }}
          />
          {hero && (
            <div className="absolute inset-x-0" style={{ bottom: 2, height: "56%" }}>
              <PhasenFigur figur={gruppe.figur} mode="freeze" color="var(--card)" unten />
            </div>
          )}
        </>
      )}
      {aktiv && hero && (
        <div className="absolute inset-x-0" style={{ bottom: 2, height: "80%" }}>
          <PhasenFigur
            figur={gruppe.figur}
            mode="zoetrop"
            color="var(--accent)"
            zoetropOn={zoetropOn}
            unten
          />
        </div>
      )}
      {!belichtet && !aktiv && (
        <>
          {/* Regions-Tönung des GEPLANTEN Kaders (nur bandOfPlanned setzt
              fillRatio bei „offen“, Höhe = Intensitätsklasse des Musters):
              die farbige Skyline des alten Etappen-Profils, im Rahmen des
              Filmstreifens. Feste Deckung — Fläche, kein Verlauf; das
              Raster darunter und die Kadernummer bleiben lesbar. Statisch:
              die Regel „Füllung nur im Commit“ betrifft die Tinte, nicht
              diese Tönung. */}
          {kader.fillRatio > 0 && (
            <div
              className="absolute inset-x-0 bottom-0"
              style={{
                height: `${Math.round(kader.fillRatio * 100)}%`,
                opacity: 0.38,
                backgroundColor: gruppe.tintVar,
              }}
            />
          )}
          {/* Basislinie: IWF-Scheibenfarbe der (geplanten) Last; ohne Last
              die Regionsfarbe — das tote Einheitsgrau von vorher war nur
              der var(--fg)-Fallback, weil nie eine Farbe ankam. */}
          <div
            className="absolute inset-x-0 bottom-0"
            style={{
              height: 3,
              opacity: 0.7,
              backgroundColor: kader.iwf ? IWF_VAR[kader.iwf] : gruppe.tintVar,
            }}
          />
        </>
      )}
      {hero && (
        <span
          className={cn(
            "absolute font-mono text-5xs tabular-nums",
            aktiv ? "font-semibold text-accent-ink" : "text-muted",
          )}
          style={{ top: 3, left: 4 }}
        >
          {String(nummer).padStart(2, "0")}
        </span>
      )}
    </div>
  );
}

export function Phasenband({
  gruppen,
  groesse = "hero",
  zoetropOn = true,
  className,
}: {
  gruppen: KaderGruppe[];
  groesse?: PhasenbandGroesse;
  /** Zoetrop-Gate für den aktiven Hero-Kader (settings.zoetrope). */
  zoetropOn?: boolean;
  className?: string;
}) {
  const kompakt = groesse === "live" || groesse === "punkt";
  let nummer = 0;
  return (
    <div
      className={cn("flex items-stretch", kompakt ? "gap-0.5" : "gap-1", className)}
      aria-hidden="true"
    >
      {gruppen.map((g, gi) => (
        <div key={g.itemId} className={cn("contents")}>
          {gi > 0 && (
            <div
              className="self-stretch bg-line-card"
              style={{ width: 1, marginTop: kompakt ? 2 : 6, marginBottom: kompakt ? 2 : 6 }}
            />
          )}
          {g.kader.map((k) => {
            nummer += 1;
            return (
              <KaderZelle
                key={k.key}
                kader={k}
                gruppe={g}
                nummer={nummer}
                groesse={groesse}
                zoetropOn={zoetropOn}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}
