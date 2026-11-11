"use client";

import { bewegungUrl } from "@/lib/bewegung";
import { cn } from "@/lib/utils";

/**
 * Eine Übung als Bewegung: vier Phasen aus EINER Datei, hart nacheinander in
 * der Folge 1-2-3-4-3-2 (CSS `.bewegung` in globals.css, kein JS-Timer). Eine
 * Datei statt vier, damit beim Phasenwechsel nichts nachlädt und nichts
 * flackert.
 *
 * `steht` hält Phase 1 (Figuren-Schalter aus, Übung erledigt); bei
 * reduzierter Bewegung hält das Stylesheet sie. Füllt seine Box, die das
 * Format der Bilder hat (`aspect-bild`). Ohne Bild rendert nichts, dann zeigt
 * der Aufrufer die Phasenfigur.
 */
export function BewegungsBild({
  id,
  klein,
  steht,
  titel,
  className,
}: {
  /** Übungs- bzw. Drill-Id. */
  id: string;
  /** Kleine Datei (Kachel auf der Trainingskarte). */
  klein?: boolean;
  /** Nicht bewegen, Phase 1 zeigen. */
  steht?: boolean;
  /** Text für Screenreader; ohne Titel ist das Bild Schmuck. */
  titel?: string;
  className?: string;
}) {
  const url = bewegungUrl(id, klein);
  if (!url) return null;
  return (
    <div
      role={titel ? "img" : undefined}
      aria-label={titel}
      aria-hidden={titel ? undefined : true}
      className={cn("bewegung h-full w-full", steht && "bewegung-steht", className)}
      style={{ backgroundImage: `url("${url}")` }}
    />
  );
}
