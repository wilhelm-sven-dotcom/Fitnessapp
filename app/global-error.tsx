"use client";

import { useEffect } from "react";

/**
 * Root-level error boundary. Unlike `app/error.tsx`, this catches errors thrown in
 * `app/layout.tsx`, the providers, the AppShell, and chunk-load failures — anything
 * above the per-route boundaries. Without it the user sees the raw default Next.js
 * "Application error" screen with no way back. It must render its own <html>/<body>
 * (it replaces the whole document) and can't rely on the app's CSS/skin, so styles
 * are inline and neutral.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error("Root-Fehler:", error);
  }, [error]);

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
        <div style={{ maxWidth: 320, padding: "0 24px", textAlign: "center" }}>
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
              onClick={() => {
                // Prefer the framework reset; fall back to a hard reload (which
                // fetches the fresh build and clears any stale-chunk state).
                try {
                  reset();
                } catch {
                  /* ignore */
                }
                window.location.reload();
              }}
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
        </div>
      </body>
    </html>
  );
}
