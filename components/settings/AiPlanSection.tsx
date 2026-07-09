"use client";

import { Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { Pressable } from "@/components/ui/pressable";
import { Toggle } from "@/components/ui/Toggle";
import { useTraining } from "@/components/providers/TrainingProvider";

/**
 * Einstellungen → ATLAS-KI: Status des Server-Schlüssels, Schalter für die
 * wöchentliche KI-Planung und ein manueller „Jetzt planen"-Anstoß.
 */
export function AiPlanSection() {
  const {
    settings,
    setAiPlanning,
    setCoachLive,
    aiPlan,
    aiPlanActive,
    aiPlanLoading,
    refreshWeekPlan,
  } = useTraining();
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [lastResult, setLastResult] = useState<"ok" | "fail" | null>(null);

  useEffect(() => {
    let active = true;
    void fetch("/api/coach/week")
      .then((r) => r.json())
      .then((d: { configured?: boolean }) => {
        if (active) setConfigured(!!d.configured);
      })
      .catch(() => {
        if (active) setConfigured(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const plan = async () => {
    setLastResult(null);
    const ok = await refreshWeekPlan();
    setLastResult(ok ? "ok" : "fail");
  };

  return (
    <section className="mb-4 rounded-card border border-surface-3 bg-surface-1 shadow-card p-5">
      <p className="mb-4 flex items-center gap-1.5 font-mono text-xs uppercase tracking-widest text-muted">
        <Sparkles size={13} className="text-accent-ink" /> ATLAS-KI
      </p>
      <div className="space-y-5">
        <Toggle
          checked={settings.aiPlanning !== false}
          onChange={setAiPlanning}
          label="Wochenplanung durch ATLAS"
          hint="ATLAS plant A/B/C jede Woche neu per Claude-KI — Übungen, Sätze und Schwerpunkte aus deinem Verlauf. Offline oder ohne Schlüssel plant das Regelwerk."
        />
        <Toggle
          checked={settings.coachLive !== false}
          onChange={setCoachLive}
          label="Ringecke im Training"
          hint="An wichtigen Momenten (letzter Satz, Rekordnähe, RIR 0–1) sieht ATLAS die Live-Session und gibt in der Pause EINE taktische Ansage — mit übernehmbarem Vorschlag."
        />
        <div>
          <p className="text-sm font-medium text-fg">
            {configured === null
              ? "Prüfe Server-Schlüssel…"
              : configured
                ? "Server-Schlüssel eingerichtet ✓"
                : "Server-Schlüssel fehlt"}
          </p>
          <p className="mb-2 mt-0.5 text-xs leading-relaxed text-muted">
            {configured
              ? aiPlanActive
                ? "Der Plan dieser Woche ist aktiv — Details im Plan-Tab."
                : "Bereit — der nächste Wochenplan wird automatisch geholt."
              : "In Vercel unter Environment Variables den Schlüssel ANTHROPIC_API_KEY hinterlegen (console.anthropic.com), dann neu deployen."}
          </p>
          <Pressable
            onClick={() => void plan()}
            disabled={aiPlanLoading || configured === false || settings.aiPlanning === false}
            className="rounded-pill bg-surface-2 px-4 py-2 text-sm font-medium text-fg focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-sessions disabled:opacity-50"
          >
            {aiPlanLoading ? "ATLAS plant…" : aiPlan ? "Woche neu planen" : "Jetzt planen"}
          </Pressable>
          {lastResult === "ok" && (
            <p className="mt-2 text-xs text-status-in">Plan aktualisiert.</p>
          )}
          {lastResult === "fail" && (
            <p className="mt-2 text-xs text-muted">
              Kein Plan bekommen — Schlüssel, Verbindung oder später nochmal.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
