"use client";

import { useEffect, useState } from "react";

/** Live-Offline-Status (navigator.onLine + Events) — ein YouTube-iframe
 *  rendert offline nur einen leeren Block, also fallen Konsumenten dann auf
 *  ihre Offline-Darstellung zurück. */
export function useOffline(): boolean {
  const [offline, setOffline] = useState(false);
  useEffect(() => {
    const update = () =>
      setOffline(typeof navigator !== "undefined" && navigator.onLine === false);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);
  return offline;
}
