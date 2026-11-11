"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Sheet } from "@/components/ui/sheet";
import type { ActiveSessionState } from "@/lib/active-session";

/**
 * Eine Einheit, die vor mehr als sechs Stunden begann und in der schon Sätze
 * stehen. Früher wurde sie beim nächsten Öffnen still gelöscht. Jetzt
 * entscheidet der Nutzer: in den Verlauf speichern oder verwerfen. Solange
 * die Karte steht, startet keine neue Einheit (sie würde die alte
 * überschreiben).
 */
export function OffeneEinheit({
  state,
  busy,
  onSpeichern,
  onVerwerfen,
}: {
  state: ActiveSessionState;
  busy: boolean;
  onSpeichern: () => void;
  onVerwerfen: () => void;
}) {
  const [frage, setFrage] = useState(false);
  const start = new Date(state.startedAt);
  const wann = `${start.toLocaleDateString("de-DE", { weekday: "long" })}, ${start.toLocaleTimeString(
    "de-DE",
    { hour: "2-digit", minute: "2-digit" },
  )} Uhr`;
  const saetze = Object.values(state.entries).reduce(
    (n, liste) => n + liste.filter((x) => !x.warmup && x.reps !== "" && x.reps != null).length,
    0,
  );
  const stehen = saetze === 1 ? "Ein Satz steht" : `${saetze} Sätze stehen`;

  return (
    <>
      <Card className="mb-4 p-5" role="region" aria-label="Offene Einheit">
        <p className="text-3xs font-bold text-muted">Offene Einheit</p>
        <h2 className="mt-1 font-display text-2xl font-extrabold text-fg">{state.session.name}</h2>
        <p className="mt-1 text-sm text-muted">
          Begonnen am {wann}. {stehen} drin, gespeichert ist noch nichts.
        </p>
        <div className="mt-4 flex gap-2">
          <Button variant="strong" className="flex-1" disabled={busy} onClick={onSpeichern}>
            Speichern
          </Button>
          <Button variant="danger" className="flex-1" disabled={busy} onClick={() => setFrage(true)}>
            Verwerfen
          </Button>
        </div>
      </Card>

      <Sheet open={frage} onClose={() => setFrage(false)} title="Einheit verwerfen?">
        <p className="mb-4 text-sm leading-relaxed text-muted">
          {saetze === 1 ? "Der eingetragene Satz geht" : `Die ${saetze} eingetragenen Sätze gehen`}{" "}
          verloren.
        </p>
        <div className="flex flex-col gap-2 pb-2">
          <Button
            variant="danger"
            full
            onClick={() => {
              setFrage(false);
              onVerwerfen();
            }}
          >
            Verwerfen
          </Button>
          <Button variant="ghost" full onClick={() => setFrage(false)}>
            Abbrechen
          </Button>
        </div>
      </Sheet>
    </>
  );
}
