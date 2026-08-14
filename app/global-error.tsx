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

  // Dieses Dokument ersetzt den kompletten App-Baum — globals.css und die
  // Theme-Mechanik sind hier NICHT geladen. Deshalb eigene, minimale Styles
  // (München-’72-Neutrals) mit prefers-color-scheme-Variante und sichtbarem
  // Tastatur-Fokus. Rohe Hex sind hier die einzige Möglichkeit — bewusst.
  return (
    <html lang="de">
      <body className="ge-body">
        <style
          dangerouslySetInnerHTML={{
            __html: `
:root { --ge-base:#f2f4f2; --ge-card:#ffffff; --ge-line:#d4d9d4; --ge-fg:#121619; --ge-muted:#4d5a5e; --ge-blau:#0c6a99; }
@media (prefers-color-scheme: dark) {
  :root { --ge-base:#14171a; --ge-card:#1b1f24; --ge-line:#2e343a; --ge-fg:#edf0f2; --ge-muted:#a3adb3; --ge-blau:#4aa9d9; }
}
.ge-body { margin:0; min-height:100vh; display:flex; align-items:center; justify-content:center;
  background:var(--ge-base); color:var(--ge-fg); -webkit-font-smoothing:antialiased;
  font-family:system-ui,-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif; }
.ge-btn { appearance:none; cursor:pointer; border-radius:12px; font:inherit; }
.ge-btn:focus-visible, .ge-btn-quiet:focus-visible { outline:2px solid var(--ge-blau); outline-offset:2px; }
.ge-primary { border:0; padding:13px 16px; font-size:16px; font-weight:600; color:#ffffff; background:var(--ge-blau); }
@media (prefers-color-scheme: dark) { .ge-primary { color:#0e1417; } }
.ge-quiet { border:1px solid var(--ge-line); padding:13px 16px; font-size:15px; font-weight:500; color:var(--ge-fg); background:transparent; }
.ge-small { border:1px solid var(--ge-line); border-radius:8px; margin-top:8px; padding:8px 12px; font-size:13px; font-weight:500; color:var(--ge-fg); background:transparent; }
.ge-btn:active { transform:scale(0.97); }
`,
          }}
        />
        <div style={{ maxWidth: 340, padding: "0 24px", textAlign: "center" }}>
          <svg
            aria-hidden
            width="34"
            height="34"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--ge-blau)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ marginBottom: 10 }}
          >
            <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
            <path d="M12 9v4" />
            <path d="M12 17h.01" />
          </svg>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: "0 0 8px" }}>
            Kurz neu laden
          </h1>
          <p style={{ fontSize: 15, lineHeight: 1.5, color: "var(--ge-muted)", margin: "0 0 24px" }}>
            Da ist etwas schiefgelaufen — meist, weil sich die App gerade aktualisiert
            hat. Ein Neuladen behebt es. Deine Daten sind sicher.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <button onClick={hardReload} className="ge-btn ge-primary">
              App neu laden
            </button>
            <button
              onClick={() => {
                window.location.href = "/";
              }}
              className="ge-btn ge-quiet"
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
                color: "var(--ge-muted)",
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
                color: "var(--ge-muted)",
                background: "var(--ge-card)",
                border: "1px solid var(--ge-line)",
                borderRadius: 8,
                padding: "10px 12px",
              }}
            >
              {detail}
            </pre>
            <button onClick={copy} className="ge-btn ge-small">
              {copied ? "Kopiert ✓" : "Fehler kopieren"}
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
