"use client";

import { useEffect } from "react";

/**
 * Hält das Display wach, solange `active` ist (Screen Wake Lock API — iOS
 * 16.4+, Android, Desktop). iOS gibt den Lock beim Sperren/App-Wechsel frei,
 * deshalb wird er bei `visibilitychange` still neu angefordert. Ohne
 * API-Unterstützung oder bei Ablehnung: leiser No-op. Der Zustand wird als
 * `data-wake-lock` auf <html> gespiegelt (unsichtbar; Diagnose + Tests).
 */
interface WakeLockSentinelLike {
  release: () => Promise<void>;
  addEventListener: (type: "release", cb: () => void) => void;
}

export function useWakeLock(active: boolean) {
  useEffect(() => {
    const nav = navigator as Navigator & {
      wakeLock?: { request: (type: "screen") => Promise<WakeLockSentinelLike> };
    };
    if (!active || !nav.wakeLock) return;

    let on = true;
    let lock: WakeLockSentinelLike | null = null;
    const mark = (held: boolean) =>
      document.documentElement.toggleAttribute("data-wake-lock", held);

    const acquire = async () => {
      try {
        const l = await nav.wakeLock!.request("screen");
        if (!on) {
          void l.release().catch(() => {});
          return;
        }
        lock = l;
        mark(true);
        // Das System kann den Lock jederzeit entziehen (Sperren, Batterie).
        l.addEventListener("release", () => {
          if (lock === l) {
            lock = null;
            mark(false);
          }
        });
      } catch {
        /* abgelehnt (z. B. Energiesparmodus) — Training läuft normal weiter */
      }
    };

    void acquire();
    const onVis = () => {
      if (on && document.visibilityState === "visible" && !lock) void acquire();
    };
    document.addEventListener("visibilitychange", onVis);

    return () => {
      on = false;
      document.removeEventListener("visibilitychange", onVis);
      mark(false);
      void lock?.release().catch(() => {});
      lock = null;
    };
  }, [active]);
}
