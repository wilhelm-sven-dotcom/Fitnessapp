"use client";

import { Volume2 } from "lucide-react";
import { beepStart, primeAudio } from "@/lib/beep";
import { Button } from "@/components/ui/Button";
import { Kicker } from "@/components/ui/Kicker";
import { Segment } from "@/components/ui/Segment";
import { Toggle } from "@/components/ui/Toggle";
import { useTraining } from "@/components/providers/TrainingProvider";

/** Gym-Modus: alles, was WÄHREND einer Einheit wirkt (Ansagen, Töne, Wake
 *  Lock, Gewichtsstufe). Musik-Absenkung steht bei Spotify, ATLAS im
 *  Training bei ATLAS — dort, wo man sie sucht. */
export function GymSection() {
  const {
    settings,
    setVoiceCues,
    setCueVolume,
    setWeightStep,
    setBikeWarmup,
    setKeepAwake,
  } = useTraining();

  return (
    <section className="mb-4 rounded-card border-dick border-rand bg-surface-1 p-5">
      <Kicker as="h2" className="mb-4">
        Gym-Modus
      </Kicker>
      <div className="space-y-5">
        <Toggle
          checked={!!settings.voiceCues}
          onChange={setVoiceCues}
          label="Sprach-Ansagen"
          hint="Sagt den Pausen-Countdown und neue Rekorde an — freihändig im Gym. Browser muss Sprachausgabe unterstützen."
        />
        <Toggle
          checked={!!settings.bikeWarmup}
          onChange={setBikeWarmup}
          label="Auf dem Bike aufwärmen"
          hint="Stellt jeder Einheit ein lockeres 3-Minuten-Einrollen voran — nur an Orten, deren Geräteliste ein Bike hat."
        />
        <Toggle
          checked={settings.keepAwake !== false}
          onChange={setKeepAwake}
          label="Display bleibt an"
          hint="Der Bildschirm bleibt wach, solange die App offen ist — kein Sperrbildschirm im Gym, auch zwischen den Übungen."
        />
        <div>
          <p className="text-sm font-medium text-fg">Gewichtsstufe</p>
          <p className="mb-2 mt-0.5 text-xs leading-relaxed text-muted">
            Kleinste Hantelstufe, die du laden kannst — die Vorschläge runden darauf.
          </p>
          <Segment
            label="Gewichtsstufe"
            options={[1.25, 2.5, 5].map((s) => ({
              value: s,
              label: `${String(s).replace(".", ",")} kg`,
            }))}
            value={settings.weightStep ?? 2.5}
            onChange={setWeightStep}
          />
        </div>
        <div>
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-medium text-fg">Signalton-Lautstärke</p>
            <Button
              variant="secondary"
              onClick={() => {
                primeAudio();
                beepStart();
              }}
              className="px-3 py-1.5 text-xs"
            >
              <Volume2 size={14} />
              Probehören
            </Button>
          </div>
          <p className="mb-2 mt-0.5 text-xs leading-relaxed text-muted">
            Countdown-Töne im Aufwärmen und beim Sprungtest — lauter stellen, wenn nebenbei Musik läuft.
          </p>
          <Segment
            label="Signalton-Lautstärke"
            options={[
              { value: 0.5, label: "Leise" },
              { value: 1, label: "Normal" },
              { value: 2, label: "Laut" },
              { value: 3, label: "Max" },
            ]}
            value={settings.cueVolume ?? 1}
            onChange={setCueVolume}
          />
        </div>
      </div>
    </section>
  );
}
