"use client";

import { createContext, useContext } from "react";

/**
 * Platz direkt über der Tab-Leiste (AppShell ist der Wirt). Eine Seite
 * rendert dort per Portal ihre Hauptaktion, z. B. „Training starten“ auf
 * Heute — so steht sie auf jedem iPhone im Daumenbereich. Die AppShell misst
 * Leiste + Platz und gibt dem Inhalt genau so viel Auslauf.
 *
 * `null` = noch nicht bereit (erster Render) oder keine Tab-Leiste.
 */
export const NavSlotContext = createContext<HTMLElement | null>(null);

export function useNavSlot(): HTMLElement | null {
  return useContext(NavSlotContext);
}
