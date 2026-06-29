"use client";

import { useTraining } from "@/components/providers/TrainingProvider";
import { Pressable } from "@/components/ui/pressable";
import { effectiveProfile, INJURY_LABEL } from "@/lib/athlete";
import type { Experience, InjuryArea, TrainingGoal } from "@/lib/types";

const SEX: { v: "m" | "w" | "divers"; label: string }[] = [
  { v: "m", label: "Mann" },
  { v: "w", label: "Frau" },
  { v: "divers", label: "Divers" },
];
const EXP: { v: Experience; label: string }[] = [
  { v: "anfänger", label: "Anfänger" },
  { v: "fortgeschritten", label: "Fortgeschr." },
  { v: "erfahren", label: "Erfahren" },
];
const GOALS: { v: TrainingGoal; label: string }[] = [
  { v: "aufbau", label: "Muskelaufbau" },
  { v: "optik", label: "Optik/Definition" },
  { v: "kraft", label: "Kraft" },
];
const INJURIES: InjuryArea[] = ["rücken", "knie", "schulter", "ellbogen", "handgelenk"];

const segBtn = (active: boolean) =>
  "flex-1 rounded-lg py-2 text-sm font-medium tabular-nums focus:outline-none " +
  (active ? "bg-strong text-on-strong" : "text-muted");
const pill = (active: boolean) =>
  "rounded-full px-3 py-1.5 text-sm font-medium focus:outline-none " +
  (active ? "bg-strong text-on-strong" : "bg-surface-2 text-muted");

/** Editable athlete profile — drives the coach/builder prompts and the engine. */
export function ProfileSection() {
  const { settings, setAthleteProfile, body } = useTraining();
  const p = settings.athleteProfile ?? {};
  const eff = effectiveProfile(settings, body);

  const toggle = <T,>(arr: T[], v: T): T[] =>
    arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v];

  return (
    <section className="mb-4 rounded-card border border-surface-3 bg-surface-1 shadow-card p-5">
      <p className="mb-1 font-mono text-xs uppercase tracking-widest text-muted">
        Profil · über mich
      </p>
      <p className="mb-4 text-xs leading-relaxed text-muted">
        Je mehr du angibst, desto genauer planen Coach und App für dich. Leere
        Felder nutzen sinnvolle Standardwerte.
      </p>

      <div className="space-y-4">
        <div>
          <p className="mb-1.5 text-sm font-medium text-fg">Geschlecht</p>
          <div className="flex gap-1 rounded-xl bg-surface-2 p-1">
            {SEX.map((s) => (
              <Pressable
                key={s.v}
                onClick={() => setAthleteProfile({ sex: s.v })}
                className={segBtn(p.sex === s.v)}
              >
                {s.label}
              </Pressable>
            ))}
          </div>
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
              className="w-24 rounded-xl bg-surface-2 px-3 py-2 text-center font-mono tabular-nums text-fg placeholder:text-faint focus:outline-none focus:ring-2 focus:ring-accent-sessions"
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
              className="w-24 rounded-xl bg-surface-2 px-3 py-2 text-center font-mono tabular-nums text-fg placeholder:text-faint focus:outline-none focus:ring-2 focus:ring-accent-sessions"
            />
          </label>
          <p className="text-xs leading-relaxed text-muted">
            Gewicht kommt aus deinen Körperdaten unten ({eff.bodyweightKg} kg) — für
            relative Kraft und Recomp.
          </p>
        </div>

        <div>
          <p className="mb-1.5 text-sm font-medium text-fg">Trainingserfahrung</p>
          <div className="flex gap-1 rounded-xl bg-surface-2 p-1">
            {EXP.map((x) => (
              <Pressable
                key={x.v}
                onClick={() => setAthleteProfile({ experience: x.v })}
                className={segBtn((p.experience ?? eff.experience) === x.v)}
              >
                {x.label}
              </Pressable>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-1.5 text-sm font-medium text-fg">Ziel</p>
          <div className="flex flex-wrap gap-2">
            {GOALS.map((g) => {
              const cur = p.goals ?? eff.goals;
              return (
                <Pressable
                  key={g.v}
                  onClick={() => setAthleteProfile({ goals: toggle(cur, g.v) })}
                  className={pill(cur.includes(g.v))}
                >
                  {g.label}
                </Pressable>
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
                <Pressable
                  key={i}
                  onClick={() => setAthleteProfile({ injuries: toggle(cur, i) })}
                  className={pill(cur.includes(i))}
                >
                  {INJURY_LABEL[i]}
                </Pressable>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
