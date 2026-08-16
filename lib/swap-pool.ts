import { reqOk } from "@/lib/progression";
import type { DailySession } from "@/lib/session-model";
import type { Exercise } from "@/lib/types";

/**
 * Geteilte Pool-POLITIK für Übungs-Tausch/-Ergänzung — genutzt vom
 * SessionEditSheet (Planung + „Einheit umbauen") und vom Schnell-Tausch in der
 * Trainings-Bühne. 1:1 aus dem Edit-Sheet extrahiert, Verhalten unverändert.
 */

/** Tausch-/Hinzufüge-Katalog: ohne Cardio, ohne fehlendes Equipment, ohne vom
 *  Nutzer deaktivierte Übungen (GEPLANTE Items bleiben — nur neue Vorschläge
 *  respektieren die Liste). */
export function swapCatalog(
  allLib: Exercise[],
  has: (k: string) => boolean,
  disabled: readonly string[],
): Exercise[] {
  const blocked = new Set(disabled);
  return allLib.filter(
    (e) => e.pattern !== "cardio" && reqOk(e, has) && !blocked.has(e.id),
  );
}

/** Tausch-Pool für EIN Item: gleiches Muster zuerst (naheliegende
 *  Alternativen), danach der ganze Rest — freie Wahl statt Muster-Korsett.
 *  Bereits verplante Übungen fallen raus, die aktuelle bleibt (Haken). */
export function swapPoolFor(
  session: DailySession,
  itemId: string,
  allLib: Exercise[],
  has: (k: string) => boolean,
  disabled: readonly string[],
): Exercise[] {
  const available = swapCatalog(allLib, has, disabled);
  const usedIds = new Set(session.items.map((it) => it.exerciseId));
  const curId = session.items.find((it) => it.id === itemId)?.exerciseId;
  const cur = allLib.find((e) => e.id === curId);
  const rest = available.filter((e) => !usedIds.has(e.id) || e.id === cur?.id);
  if (!cur) return rest;
  return [
    ...rest.filter((e) => e.pattern === cur.pattern),
    ...rest.filter((e) => e.pattern !== cur.pattern),
  ];
}

/** Ergänzungs-Pool: Katalog minus bereits verplante Übungen. */
export function addPoolFor(
  session: DailySession,
  allLib: Exercise[],
  has: (k: string) => boolean,
  disabled: readonly string[],
): Exercise[] {
  const usedIds = new Set(session.items.map((it) => it.exerciseId));
  return swapCatalog(allLib, has, disabled).filter((e) => !usedIds.has(e.id));
}
