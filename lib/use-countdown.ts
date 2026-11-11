"use client";

import { useEffect, useState } from "react";

/** Restsekunden bis `endsAt` (Epoch-ms), aufgerundet, nie negativ. */
const rest = (endsAt: number | null) =>
  endsAt == null ? 0 : Math.max(0, Math.ceil((endsAt - Date.now()) / 1000));

/**
 * Countdown aus der Uhr: gibt die Restsekunden bis `endsAt` zurück und rendert
 * nur, wenn sich die Sekunde ändert. Weil die Restzeit aus `Date.now()` kommt,
 * stimmt sie auch, nachdem das iPhone gesperrt oder die App im Hintergrund war
 * (Timer schlafen dort) — beim Zurückkommen wird sofort nachgerechnet.
 */
export function useCountdown(endsAt: number | null): number {
  const [left, setLeft] = useState(() => rest(endsAt));

  useEffect(() => {
    const tick = () => setLeft(rest(endsAt));
    tick();
    if (endsAt == null) return;
    // 4 Hz: die Anzeige springt höchstens 250 ms nach der echten Sekunde um;
    // gleiche Werte lösen keinen Render aus.
    const id = window.setInterval(tick, 250);
    document.addEventListener("visibilitychange", tick);
    window.addEventListener("focus", tick);
    window.addEventListener("pageshow", tick);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", tick);
      window.removeEventListener("focus", tick);
      window.removeEventListener("pageshow", tick);
    };
  }, [endsAt]);

  return left;
}
