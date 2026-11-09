"use client";

import { useEffect, useState } from "react";
import { Kicker } from "@/components/ui/Kicker";
import { Toggle } from "@/components/ui/Toggle";
import { useTraining } from "@/components/providers/TrainingProvider";

/**
 * ATLAS-Einstellungen: KI-Komposition und ATLAS im Training an/aus, dazu der
 * Server-Key-Status. Ohne Key läuft alles über den deterministischen Fallback.
 * „Im Training“ war früher zweimal da (Zuspruch im Gym-Modus, Live-Coaching
 * hier) — für den Nutzer ist das EINE Frage: redet ATLAS im Training mit?
 */
export function AtlasSection() {
  const { settings, setAiPlanning, setAtlasImTraining } = useTraining();
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
    <section className="mb-4 rounded-card border border-line-card bg-surface-1 p-5">
      <Kicker as="h2" className="mb-1">
        ATLAS
      </Kicker>
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
          label="ATLAS im Training"
          hint="Kurzer Zuspruch zwischen den Sätzen und eine Reaktion auf jeden Satz in der Pause — nur als Text, die Musik bleibt."
          checked={settings.coachLive !== false && settings.coachMotivation !== false}
          onChange={setAtlasImTraining}
        />
      </div>
    </section>
  );
}
