import type { Pattern, Template } from "@/lib/types";

/**
 * Guided warm-up drills — all bodyweight, back-friendly (no loaded flexion).
 * `warmupFor` assembles a short, focus-appropriate routine from the template's
 * movement patterns. Pure and unit-testable.
 */
export interface WarmupDrill {
  id: string;
  name: string;
  cue: string;
  durationSec: number;
  kind: "mobility" | "activation";
  /** Figure key in `FIG` to animate. Defaults to the drill `id` when omitted. */
  figure?: string;
}

const D = {
  cat_cow: {
    id: "cat_cow",
    name: "Katze-Kuh",
    cue: "Im Vierfüßler Wirbelsäule sanft runden und strecken, im Atemrhythmus.",
    durationSec: 40,
    kind: "mobility",
  },
  dead_bug: {
    id: "dead_bug",
    figure: "deadbug",
    name: "Dead Bug",
    cue: "Auf dem Rücken, unterer Rücken bleibt am Boden, Arm und Bein gegengleich absenken.",
    durationSec: 30,
    kind: "activation",
  },
  hip_circles: {
    id: "hip_circles",
    name: "Hüftkreisen",
    cue: "Im Stand große, langsame Kreise mit der Hüfte — je Richtung.",
    durationSec: 30,
    kind: "mobility",
  },
  glute_bridge: {
    id: "glute_bridge",
    figure: "glutebridge",
    name: "Glute Bridge",
    cue: "Auf dem Rücken, Füße auf, Hüfte hoch, oben den Po fest anspannen.",
    durationSec: 30,
    kind: "activation",
  },
  ankle_rocks: {
    id: "ankle_rocks",
    name: "Sprunggelenk mobilisieren",
    cue: "Knie über die Zehen nach vorne schieben, Ferse bleibt am Boden. Pro Seite.",
    durationSec: 25,
    kind: "mobility",
  },
  shoulder_circles: {
    id: "shoulder_circles",
    name: "Schulterkreisen",
    cue: "Große Kreise rückwärts, Schultern locker, Nacken entspannt.",
    durationSec: 25,
    kind: "mobility",
  },
  thoracic_open: {
    id: "thoracic_open",
    name: "Brustwirbelsäule öffnen",
    cue: "Im Vierfüßler eine Hand hinter den Kopf, Ellbogen zur Decke drehen. Pro Seite.",
    durationSec: 30,
    kind: "mobility",
  },
  bird_dog: {
    id: "bird_dog",
    figure: "birddog",
    name: "Bird Dog",
    cue: "Gegenüberliegende Hand und Bein strecken, Rumpf ruhig, Becken stabil.",
    durationSec: 30,
    kind: "activation",
  },
  bike_easy: {
    id: "bike_easy",
    name: "Locker einrollen (Bike)",
    cue: "3 Minuten locker auf dem Peloton, niedriger Widerstand — Kreislauf und Beine wach machen.",
    durationSec: 180,
    kind: "activation",
  },
} satisfies Record<string, WarmupDrill>;

const LOWER: Pattern[] = ["squat", "lunge", "hinge"];
const UPPER: Pattern[] = ["hpush", "vpush", "hpull", "vpull", "lateral", "arm"];

/**
 * Build a ~3-minute, back-friendly warm-up tailored to the session's patterns.
 * Prepends an easy bike spin when the session is cardio or `opts.bike` is set
 * (the "auf dem Bike aufwärmen" preference).
 */
export function warmupFor(tpl: Template, opts: { bike?: boolean } = {}): WarmupDrill[] {
  const slots = new Set(tpl.slots);
  const has = (ps: Pattern[]) => ps.some((p) => slots.has(p));

  const out: WarmupDrill[] = [D.cat_cow, D.dead_bug]; // always: spine + gentle back activation
  if (has(LOWER)) out.push(D.hip_circles, D.glute_bridge, D.ankle_rocks);
  if (has(UPPER)) out.push(D.shoulder_circles, D.thoracic_open);
  if (!out.includes(D.glute_bridge)) out.push(D.bird_dog); // ensure a posterior-chain activation

  if (opts.bike || slots.has("cardio")) out.unshift(D.bike_easy);

  return out.slice(0, 6);
}

export function warmupTotalMin(drills: WarmupDrill[]): number {
  return Math.max(1, Math.round(drills.reduce((s, d) => s + d.durationSec, 0) / 60));
}
