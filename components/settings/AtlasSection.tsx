"use client";

import { useEffect, useState } from "react";
import { Toggle } from "@/components/ui/Toggle";
import { useTraining } from "@/components/providers/TrainingProvider";

/**
 * ATLAS-Einstellungen: KI-Komposition + Live-Coaching an/aus, dazu der
 * Server-Key-Status. Ohne Key läuft alles über den deterministischen Fallback.
 */
export function AtlasSection() {
  const { settings, setAiPlanning, setCoachLive } = useTraining();
  const [configured, setConfigured] = useState<boolean | null>(null);

  useEffect(() => {
    let alive = true;
    void fetch("/api/atlas/session")
      .then((r) => r.json())
      .then((d: { configured?: boolean }) => {
        if (alive) setConfigured(d.configured !== false);
      })
      .catch(() => {
        if (alive) setConfigured(null);
      });
    return () => {
      alive = false;
    };
  }, []);

  return (
    <section className="mb-4 rounded-card border border-line bg-surface-1 p-5 shadow-card">
      <p className="mb-1 font-mono text-xs uppercase tracking-widest text-muted">
        ATLAS
      </p>
      <p className="mb-4 text-xs leading-relaxed text-muted">
        {configured === false
          ? "Kein Server-Key hinterlegt — ATLAS nutzt den eingebauten Basis-Planer. Für die KI wird ANTHROPIC_API_KEY serverseitig benötigt."
          : "Komponiert deine Einheiten und coacht dich live durchs Training."}
      </p>

      <div className="space-y-3">
        <Toggle
          label="Einheiten von ATLAS komponieren"
          hint="Jeden Tag frisch aus dem ganzen Katalog, passend zu Bedarf und Tagesform."
          checked={settings.aiPlanning !== false}
          onChange={setAiPlanning}
        />
        <Toggle
          label="Live-Coaching im Training"
          hint="ATLAS reagiert auf deine Sätze und meldet sich in der Pause."
          checked={settings.coachLive !== false}
          onChange={setCoachLive}
        />
      </div>
    </section>
  );
}
