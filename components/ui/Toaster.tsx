"use client";

import { usePathname } from "next/navigation";
import { useSyncExternalStore } from "react";
import { ToastItem } from "@/components/ui/ToastItem";
import { getToasts, subscribeToasts } from "@/lib/toast";

/**
 * Der eine Toast-Viewport — in app/layout.tsx als Geschwister der AppShell
 * gemountet, damit Rückmeldungen auch im Workout (verstecktes Chrome) und im
 * Onboarding ankommen. Sitzt über der BottomNav; auf /workout tiefer, weil
 * dort keine Nav liegt.
 */
export function Toaster() {
  const toasts = useSyncExternalStore(subscribeToasts, getToasts, getToasts);
  const pathname = usePathname();
  const aboveNav = pathname !== "/workout";
  if (toasts.length === 0) return null;
  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 z-50 flex flex-col items-center gap-2 px-5"
      style={{
        bottom: `calc(env(safe-area-inset-bottom) + ${aboveNav ? "5rem" : "1rem"})`,
      }}
    >
      {toasts.map((t) => (
        <ToastItem key={t.id} t={t} />
      ))}
    </div>
  );
}
