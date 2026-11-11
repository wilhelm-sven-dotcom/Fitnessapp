"use client";

import { usePathname } from "next/navigation";
import { useSyncExternalStore } from "react";
import { ToastItem } from "@/components/ui/ToastItem";
import { getToasts, subscribeToasts } from "@/lib/toast";

/**
 * Der eine Toast-Viewport — in app/layout.tsx als Geschwister der AppShell
 * gemountet, damit Rückmeldungen auch im Training (ohne Kopf und Leiste) und
 * im Onboarding ankommen.
 *
 * Wo er sitzt:
 *  · sonst über der Tab-Leiste samt Dock (`--nav-h` misst die AppShell).
 *    Vorher stand er fest 5rem über dem Rand und lag auf Heute über
 *    „Los geht’s“.
 *  · im Training OBEN unter dem Kopf. Unten liegt dort das Dock mit „Satz
 *    eintragen“ — eine Meldung darüber verdeckte genau den Knopf, den man als
 *    Nächstes braucht.
 *
 * Der Bereich ist immer im DOM (auch leer): Screenreader sagen nur an, was in
 * einen schon vorhandenen Live-Bereich hineinkommt. Fehler sind zusätzlich
 * `role="alert"` (ToastItem).
 */
export function Toaster() {
  const toasts = useSyncExternalStore(subscribeToasts, getToasts, getToasts);
  const pathname = usePathname();
  const imTraining = pathname === "/workout";
  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 z-50 flex flex-col items-center gap-2 px-5"
      style={
        imTraining
          ? { top: "calc(env(safe-area-inset-top) + 6.5rem)" }
          : { bottom: "calc(var(--nav-h, 5rem) + 0.75rem)" }
      }
    >
      {toasts.map((t) => (
        <ToastItem key={t.id} t={t} />
      ))}
    </div>
  );
}
