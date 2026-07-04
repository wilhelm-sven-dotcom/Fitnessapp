"use client";

import { useEffect, useState } from "react";

import { purgeCachesAndWorkers } from "@/lib/pwa-reset";
import { repairPersistedData } from "@/lib/sanitize";

/**
 * Root-level error boundary. Unlike `app/error.tsx`, this catches errors thrown in
 * `app/layout.tsx`, the providers, the AppShell, and chunk-load failures — anything
 * above the per-route boundaries. Crucially, when it shows, the normal app tree is
 * replaced, so `ServiceWorkerRegister` (the update machinery) is NOT mounted — the
 * device can't discover a new build on its own. So this boundary self-heals:
 *
 * On the FIRST root crash of a session it (1) repairs the persisted data in place
 * — the usual culprit is a structurally-broken localStorage entry that an old
 * cached build chokes on; cleaning it makes ANY build render again — (2) purges
 * stale code caches + the service worker, then (3) reloads into a clean, current
 * build. A sessionStorage one-shot prevents a reload loop: if it still crashes the
 * box stays put, now showing the real error so it can be reported. It must render
 * its own <html>/<body> (it replaces the whole document) with inline neutral styles.
 */
export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const detail = `${error?.name ?? "Error"}: ${error?.message ?? ""}${error?.digest ? ` [${error.digest}]` : ""}`;

  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error("Root-Fehler:", error);
    let healed = false;
    try {
      healed = !!sessionStorage.getItem("app-crash-heal");
      if (!healed) sessionStorage.setItem("app-crash-heal", "1");
    } catch {
      /* storage unavailable — skip the one-shot, show the box */
    }
    if (healed) return; // a prior heal+reload didn't fix it → let the box surface
    // Repair the data FIRST (fixes the common case even on a stale build), then
    // drop stale code + reload for a clean, current build.
    try {
      repairPersistedData();
    } catch {
      /* never blocks the reload */
    }
    void purgeCachesAndWorkers().finally(() => window.location.reload());
  }, [error]);

  const hardReload = () => {
    try {
      repairPersistedData();
    } catch {
      /* ignore */
    }
    void purgeCachesAndWorkers().finally(() => window.location.reload());
  };

  const copy = () => {
    try {
      void navigator.clipboard?.writeText(detail);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <html lang="de">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0c0e12",
          color: "#e8ecf2",
          fontFamily:
            "system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
          WebkitFontSmoothing: "antialiased",
        }}
      >
        <div style={{ maxWidth: 340, padding: "0 24px", textAlign: "center" }}>
          <div style={{ fontSize: 34, marginBottom: 10 }} aria-hidden>
            ⚠️
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: "0 0 8px" }}>
            Kurz neu laden
          </h1>
          <p style={{ fontSize: 15, lineHeight: 1.5, color: "#8a93a3", margin: "0 0 24px" }}>
            Da ist etwas schiefgelaufen — meist, weil sich die App gerade aktualisiert
            hat. Ein Neuladen behebt es. Deine Daten sind sicher.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <button
              onClick={hardReload}
              style={{
                appearance: "none",
                border: 0,
                borderRadius: 10,
                padding: "13px 16px",
                fontSize: 16,
                fontWeight: 600,
                color: "#0c0e12",
                background: "#ff375f",
                cursor: "pointer",
              }}
            >
              App neu laden
            </button>
            <button
              onClick={() => {
                window.location.href = "/";
              }}
              style={{
                appearance: "none",
                border: "1px solid #222b38",
                borderRadius: 10,
                padding: "13px 16px",
                fontSize: 15,
                fontWeight: 500,
                color: "#e8ecf2",
                background: "transparent",
                cursor: "pointer",
              }}
            >
              Zur Startseite
            </button>
          </div>

          {/* The actual error — so a persistent crash can be reported instead of guessed. */}
          <div style={{ marginTop: 22, textAlign: "left" }}>
            <p
              style={{
                margin: "0 0 6px",
                fontSize: 11,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "#5e6672",
              }}
            >
              Technische Details
            </p>
            <pre
              style={{
                margin: 0,
                maxHeight: 120,
                overflow: "auto",
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                fontSize: 11,
                lineHeight: 1.45,
                color: "#9aa3af",
                background: "#12161c",
                border: "1px solid #222b38",
                borderRadius: 8,
                padding: "10px 12px",
              }}
            >
              {detail}
            </pre>
            <button
              onClick={copy}
              style={{
                appearance: "none",
                marginTop: 8,
                border: "1px solid #222b38",
                borderRadius: 8,
                padding: "8px 12px",
                fontSize: 13,
                fontWeight: 500,
                color: "#e8ecf2",
                background: "transparent",
                cursor: "pointer",
              }}
            >
              {copied ? "Kopiert ✓" : "Fehler kopieren"}
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
