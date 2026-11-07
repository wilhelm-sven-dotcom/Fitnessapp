"use client";

import { useTraining } from "@/components/providers/TrainingProvider";
import { ChipToggle } from "@/components/ui/ChipToggle";
import { Kicker } from "@/components/ui/Kicker";
import { Segment } from "@/components/ui/Segment";
import { effectiveProfile, INJURY_LABEL } from "@/lib/athlete";
import type { Experience, InjuryArea, TrainingGoal } from "@/lib/types";

const SEX: { v: "m" | "w" | "divers"; label: string }[] = [
  { v: "m", label: "Mann" },
  { v: "w", label: "Frau" },
  { v: "divers", label: "Divers" },
];
const EXP: { v: Experience; label: string }[] = [
  { v: "anfänger", label: "Anfänger" },
  { v: "fortgeschritten", label: "Mittel" },
  { v: "erfahren", label: "Erfahren" },
];
const GOALS: { v: TrainingGoal; label: string }[] = [
  { v: "aufbau", label: "Muskelaufbau" },
  { v: "optik", label: "Optik" },
  { v: "kraft", label: "Kraft" },
];
const INJURIES: InjuryArea[] = ["rücken", "knie", "schulter", "ellbogen", "handgelenk"];

const zahlFeld =
  "w-24 rounded-pill border border-line bg-transparent px-3 py-2 text-center font-mono text-base tabular-nums text-fg placeholder:text-faint focus:outline-none focus-visible:ring-2 focus-visible:ring-fokus";

/** Editable athlete profile — drives the coach/builder prompts and the engine. */
export function ProfileSection() {
  const { settings, setAthleteProfile, body } = useTraining();
  const p = settings.athleteProfile ?? {};
  const eff = effectiveProfile(settings, body);

  const toggle = <T,>(arr: T[], v: T): T[] =>
    arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v];

  return (
    <section className="mb-4 rounded-card border border-line-card bg-surface-1 p-5">
      <Kicker as="h2" className="mb-1">
        Profil · über mich
      </Kicker>
      <p className="mb-4 text-xs leading-relaxed text-muted">
        Je mehr du angibst, desto genauer plant ATLAS für dich. Leere
        Felder nutzen sinnvolle Standardwerte.
      </p>

      <div className="space-y-4">
        <div>
          <p className="mb-1.5 text-sm font-medium text-fg">Geschlecht</p>
          <Segment
            label="Geschlecht"
            options={SEX.map((s) => ({ value: s.v, label: s.label }))}
            value={p.sex}
            onChange={(v) => setAthleteProfile({ sex: v })}
          />
        </div>

        <div className="space-y-2">
          <label className="flex items-center justify-between gap-3">
            <span className="text-sm text-muted">Alter</span>
            <input
              type="number"
              inputMode="numeric"
              value={p.age ?? ""}
              placeholder="Jahre"
              onChange={(e) =>
                setAthleteProfile({ age: e.target.value ? Number(e.target.value) : undefined })
              }
              className={zahlFeld}
            />
          </label>
          <label className="flex items-center justify-between gap-3">
            <span className="text-sm text-muted">Größe (cm)</span>
            <input
              type="number"
              inputMode="numeric"
              value={p.heightCm ?? ""}
              placeholder={String(eff.heightCm)}
              onChange={(e) =>
                setAthleteProfile({ heightCm: e.target.value ? Number(e.target.value) : undefined })
              }
              className={zahlFeld}
            />
          </label>
          <p className="text-xs leading-relaxed text-muted">
            Gewicht kommt aus deinen Körperdaten ({eff.bodyweightKg} kg) — erfassen
            unter Fortschritt → Körper.
          </p>
        </div>

        <div>
          <p className="mb-1.5 text-sm font-medium text-fg">Trainingserfahrung</p>
          <Segment
            label="Trainingserfahrung"
            options={EXP.map((x) => ({ value: x.v, label: x.label }))}
            value={p.experience ?? eff.experience}
            onChange={(v) => setAthleteProfile({ experience: v })}
          />
        </div>

        <div>
          <p className="mb-1.5 text-sm font-medium text-fg">Ziel</p>
          <div className="flex flex-wrap gap-2">
            {GOALS.map((g) => {
              const cur = p.goals ?? eff.goals;
              return (
                <ChipToggle
                  key={g.v}
                  onClick={() => setAthleteProfile({ goals: toggle(cur, g.v) })}
                  active={cur.includes(g.v)}
                >
                  {g.label}
                </ChipToggle>
              );
            })}
          </div>
        </div>

        <div>
          <p className="mb-1.5 text-sm font-medium text-fg">Schonen / Verletzungen</p>
          <div className="flex flex-wrap gap-2">
            {INJURIES.map((i) => {
              const cur = p.injuries ?? eff.injuries;
              return (
                <ChipToggle
                  key={i}
                  onClick={() => setAthleteProfile({ injuries: toggle(cur, i) })}
                  active={cur.includes(i)}
                >
                  {INJURY_LABEL[i]}
                </ChipToggle>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
