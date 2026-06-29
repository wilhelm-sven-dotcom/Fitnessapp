"use client";

import { AlertTriangle } from "lucide-react";
import { useRouter } from "next/navigation";

/** Route-level safety net: any render error in /plan degrades to a friendly
 *  in-app message (with retry) instead of the full-page Next.js error screen. */
export default function PlanError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const router = useRouter();
  return (
    <div className="py-12 text-center">
      <AlertTriangle size={28} className="mx-auto mb-3 text-accent-ink" />
      <h2 className="font-display text-2xl font-bold tracking-tight text-fg">
        Plan nicht ladbar
      </h2>
      <p className="mx-auto mt-2 max-w-xs text-sm text-muted">
        Da ist gerade etwas schiefgelaufen. Versuch es nochmal — deine Daten sind sicher.
      </p>
      <div className="mt-5 flex justify-center gap-2">
        <button
          onClick={() => reset()}
          className="rounded-pill bg-accent-sessions px-5 py-2.5 text-sm font-semibold text-on-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-sessions"
        >
          Nochmal versuchen
        </button>
        <button
          onClick={() => router.push("/")}
          className="rounded-pill bg-surface-2 px-5 py-2.5 text-sm font-medium text-fg focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-sessions"
        >
          Zur Startseite
        </button>
      </div>
    </div>
  );
}
