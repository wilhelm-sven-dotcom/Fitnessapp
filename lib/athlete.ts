import type {
  AppSettings,
  BodyMetric,
  Experience,
  InjuryArea,
  TrainingGoal,
} from "@/lib/types";

/**
 * A fully-resolved profile: the user's `athleteProfile` with sensible fallbacks.
 * Defaults are seeded from the values that used to be hardcoded ("Sven", 1,93 m,
 * ~90 kg, erfahren, Aufbau+Optik, Rücken) so behaviour is unchanged until edited.
 */
export interface EffectiveProfile {
  sex?: "m" | "w" | "divers";
  age?: number;
  heightCm: number;
  bodyweightKg: number;
  experience: Experience;
  goals: TrainingGoal[];
  injuries: InjuryArea[];
}

export function effectiveProfile(
  settings: AppSettings,
  body: BodyMetric[] = [],
): EffectiveProfile {
  const p = settings.athleteProfile ?? {};
  const latestBw = [...body].reverse().find((b) => b.weightKg != null)?.weightKg;
  return {
    sex: p.sex,
    age: p.age,
    heightCm: p.heightCm ?? 193,
    bodyweightKg: p.bodyweightKg ?? latestBw ?? 90,
    experience: p.experience ?? "fortgeschritten",
    goals: p.goals && p.goals.length ? p.goals : ["aufbau", "optik"],
    injuries: p.injuries ?? ["rücken"],
  };
}

const EXP_LABEL: Record<Experience, string> = {
  anfänger: "Anfänger",
  fortgeschritten: "fortgeschritten",
  erfahren: "erfahren",
};
const GOAL_LABEL: Record<TrainingGoal, string> = {
  aufbau: "Muskelaufbau",
  optik: "Optik/Definition",
  kraft: "Kraft",
};
export const INJURY_LABEL: Record<InjuryArea, string> = {
  rücken: "unterer Rücken",
  knie: "Knie",
  schulter: "Schulter",
  ellbogen: "Ellbogen",
  handgelenk: "Handgelenk",
};

/** German persona sentence for the coach/builder system prompts — replaces the
 *  formerly hardcoded "Profil: Ziel Muskelaufbau, 1,93 m / ~90 kg, Rücken". */
export function athletePersona(p: EffectiveProfile, name?: string): string {
  const who: string[] = [];
  if (p.sex) who.push(p.sex === "m" ? "männlich" : p.sex === "w" ? "weiblich" : "divers");
  if (p.age) who.push(`${p.age} J`);
  who.push(`${p.heightCm} cm`);
  who.push(`${p.bodyweightKg} kg`);
  const goals = p.goals.map((g) => GOAL_LABEL[g]).join(" + ");
  const lead = name?.trim() ? `Profil von ${name.trim()}: ` : "Profil: ";
  const inj = p.injuries.length
    ? ` Beachte besonders: ${p.injuries
        .map((i) => INJURY_LABEL[i])
        .join(", ")} — schonend, aber progressiv belasten (Aufbau statt Dauer-Tabu).`
    : "";
  return `${lead}${who.join(", ")}; Trainingserfahrung ${EXP_LABEL[p.experience]}; Ziel ${goals}.${inj}`;
}

export interface ProfileKnobs {
  /** Multiplier on weekly volume targets / builder item ceiling. */
  volumeScale: number;
  /** Rep-target shift: negative leans toward strength (lower reps). */
  repBias: number;
  /** Goal leans toward strength (heavier, fewer reps) rather than hypertrophy. */
  strengthLean: boolean;
}

/**
 * Engine knobs derived from experience + goal. Defaults (fortgeschritten,
 * Aufbau/Optik) are neutral (scale 1, no bias) so today's behaviour is preserved.
 */
export function profileKnobs(p: EffectiveProfile): ProfileKnobs {
  const volumeScale =
    p.experience === "anfänger" ? 0.85 : p.experience === "erfahren" ? 1.15 : 1;
  const strengthLean = p.goals.includes("kraft");
  return { volumeScale, repBias: strengthLean ? -1 : 0, strengthLean };
}
