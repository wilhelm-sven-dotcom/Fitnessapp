import { createHash, timingSafeEqual } from "node:crypto";
import { ZUGANG_KOPF } from "@/lib/atlas/fehler";

/**
 * Zuschaltbarer Schutz der bezahlten ATLAS-Routen. Ist in Vercel die Variable
 * `ATLAS_ZUGANGSCODE` gesetzt, nimmt der Server nur Anfragen an, die den Code
 * in der Kopfzeile `x-atlas-code` mitschicken; der Nutzer trägt ihn einmal in
 * den Einstellungen ein. Ohne die Variable bleibt alles offen wie bisher.
 *
 * Wozu: Die Adresse der App ist öffentlich. Wer sie kennt, konnte bisher auf
 * Kosten des hinterlegten Schlüssels Anfragen stellen; das Limit je Minute
 * gilt nur je Server-Instanz.
 */

export type ZugangStatus = "frei" | "ok" | "noetig" | "falsch";

const fingerabdruck = (s: string) => createHash("sha256").update(s).digest();

export function zugangStatus(req: Request): ZugangStatus {
  const soll = process.env.ATLAS_ZUGANGSCODE?.trim();
  if (!soll) return "frei";
  const ist = req.headers.get(ZUGANG_KOPF)?.trim();
  if (!ist) return "noetig";
  // Über Fingerabdrücke vergleichen: gleiche Länge, gleiche Dauer.
  return timingSafeEqual(fingerabdruck(ist), fingerabdruck(soll)) ? "ok" : "falsch";
}

export const zugangErlaubt = (s: ZugangStatus) => s === "frei" || s === "ok";
