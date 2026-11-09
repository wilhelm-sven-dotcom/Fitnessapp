"use client";

import { createContext, useContext } from "react";

/**
 * Ziel des Satz-Docks im Training (SessionRunner ist der Wirt). Die aktive
 * Satzkarte rendert „Satz eintragen“ per Portal hierhin, damit der Knopf
 * immer im Daumenbereich steht.
 *
 * `undefined` = kein Wirt (die Karte rendert den Knopf selbst) ·
 * `null` = Dock gerade anders belegt (Pause läuft) → kein Knopf.
 */
export const DockSlotContext = createContext<HTMLElement | null | undefined>(undefined);

export function useDockSlot(): HTMLElement | null | undefined {
  return useContext(DockSlotContext);
}
