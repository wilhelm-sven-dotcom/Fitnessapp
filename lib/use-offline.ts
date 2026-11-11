"use client";

import { useEffect, useState } from "react";

/**
 * Ist das Gerät ohne Netz? Die App läuft dann weiter (Service Worker), aber
 * ATLAS antwortet nicht und die Cloud bekommt Änderungen erst später — das
 * soll der Nutzer sehen, statt sich über fehlende ATLAS-Sätze zu wundern.
 *
 * `navigator.onLine` kennt nur „verbunden“ oder „nicht verbunden“; ein
 * verbundenes WLAN ohne Internet bleibt „online“. Der Hinweis ist darum eine
 * Untergrenze: steht er da, ist das Gerät sicher ohne Netz.
 */
export function useOffline(): boolean {
  const [offline, setOffline] = useState(false);
  useEffect(() => {
    const lies = () => setOffline(navigator.onLine === false);
    lies();
    window.addEventListener("online", lies);
    window.addEventListener("offline", lies);
    return () => {
      window.removeEventListener("online", lies);
      window.removeEventListener("offline", lies);
    };
  }, []);
  return offline;
}
