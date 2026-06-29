"use client";

import { AlertTriangle } from "lucide-react";
import { useRouter } from "next/navigation";

/** App-wide safety net: a render error on any page shows a friendly message
 *  (with retry) inside the app shell instead of a white "Application error". */
export default function AppError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const router = useRouter();
  return (
    <div className="py-12 text-center">
      <AlertTriangle size={28} className="mx-auto mb-3 text-accent-ink" />
      <h2 className="font-display text-2xl font-bold tracking-tight text-fg">
        Etwas ist schiefgelaufen
      </h2>
      <p className="mx-auto mt-2 max-w-xs text-sm text-muted">
        Diese Ansicht konnte nicht geladen werden. Versuch es nochmal — deine Daten sind sicher.
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
