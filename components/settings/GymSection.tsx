"use client";

import { Volume2 } from "lucide-react";
import { beepStart, primeAudio } from "@/lib/beep";
import { Button } from "@/components/ui/Button";
import { Pressable } from "@/components/ui/pressable";
import { Toggle } from "@/components/ui/Toggle";
import { useTraining } from "@/components/providers/TrainingProvider";

/** Gym-Modus: alles, was WÄHREND einer Einheit wirkt (Ansagen, Töne,
 *  Ducking, Wake Lock, Gewichtsstufe) — 1:1 aus der Settings-Seite extrahiert. */
export function GymSection() {
  const {
    settings,
    setVoiceCues,
    setCueVolume,
    setWeightStep,
    setBikeWarmup,
    setDuckSpotify,
    setCoachMotivation,
    setKeepAwake,
  } = useTraining();

  return (
    <section className="mb-4 rounded-card border border-line-card bg-surface-1 p-5">
      <p className="mb-4 font-mono text-xs uppercase tracking-widest text-muted">
        Gym-Modus
      </p>
      <div className="space-y-5">
        <Toggle
          checked={!!settings.voiceCues}
          onChange={setVoiceCues}
          label="Sprach-Ansagen"
          hint="Sagt Satzpause-Countdown und neue Rekorde an — freihändig im Gym. Browser muss Sprachausgabe unterstützen."
        />
        <Toggle
          checked={settings.duckSpotify !== false}
          onChange={setDuckSpotify}
          label="Musik leiser bei Countdown"
          hint="Senkt Spotify in den letzten Sekunden kurz ab und stellt danach zurück — braucht Premium und ein aktives Gerät."
        />
        <Toggle
          checked={!!settings.bikeWarmup}
          onChange={setBikeWarmup}
          label="Auf dem Bike aufwärmen"
          hint="Stellt jeder Einheit ein lockeres 3-Minuten-Einrollen auf dem Peloton voran (Bike muss im Gym aktiv sein)."
        />
        <Toggle
          checked={settings.coachMotivation !== false}
          onChange={setCoachMotivation}
          label="Coach-Motivation im Training"
          hint="ATLAS spornt dich zwischen den Sätzen kurz an — nur als Text, stört die Musik nie. Jederzeit abschaltbar."
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
          <div className="flex gap-1 rounded-card bg-surface-2 p-1">
            {[1.25, 2.5, 5].map((s) => {
              const active = (settings.weightStep ?? 2.5) === s;
              return (
                <Pressable
                  key={s}
                  onClick={() => setWeightStep(s)}
                  className={
                    "flex-1 rounded-card py-2 text-sm font-medium tabular-nums focus:outline-none " +
                    (active ? "bg-strong text-on-strong" : "text-muted")
                  }
                >
                  {`${s}`.replace(".", ",")} kg
                </Pressable>
              );
            })}
          </div>
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
            Countdown-Töne im Aufwärmen und beim Zünd-Check — lauter stellen, wenn nebenbei Musik läuft.
          </p>
          <div className="flex gap-1 rounded-card bg-surface-2 p-1">
            {[
              { v: 0.5, l: "Leise" },
              { v: 1, l: "Normal" },
              { v: 2, l: "Laut" },
              { v: 3, l: "Max" },
            ].map((o) => {
              const active = (settings.cueVolume ?? 1) === o.v;
              return (
                <Pressable
                  key={o.l}
                  onClick={() => setCueVolume(o.v)}
                  className={
                    "flex-1 rounded-card py-2 text-sm font-medium focus:outline-none " +
                    (active ? "bg-strong text-on-strong" : "text-muted")
                  }
                >
                  {o.l}
                </Pressable>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
