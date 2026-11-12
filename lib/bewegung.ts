/**
 * Bewegungsbilder (`public/bewegung/`): je Übung bzw. Aufwärmübung eine Datei
 * mit vier Phasen nebeneinander (Start, zwei Zwischenschritte, Umkehrpunkt),
 * geschnitten aus den ChatGPT-Rastern (siehe README dort). Die App spielt sie
 * als Bewegung ab (`components/bewegung/BewegungsBild.tsx`). Übungen ohne
 * Bild zeigen weiter die Phasenfigur.
 *
 * Kennung = Übungs-Id aus `lib/exercises.ts` bzw. Drill-Id aus `lib/warmup.ts`.
 * Neues Bild: Dateien ablegen und die Kennung hier eintragen.
 */
const MIT_BEWEGUNG: ReadonlySet<string> = new Set([
  // Zuhause (Z)
  "goblet",
  "walking_lunge",
  "rdl_db",
  "bench_db",
  "ohp_stand",
  "pullup",
  "curl",
  "lateral",
  "crunch",
  "calf_raise_bw",
  // Zuhause, Teil 1: Beine und Hüfte (Z12 bis Z34; Z17, Z19, Z22 fehlen noch)
  "squat_bw",
  "squat_bar",
  "front_squat",
  "squat_db",
  "box_squat",
  "bss",
  "stepup",
  "split_squat",
  "cossack",
  "pistol_box",
  "glutebridge",
  "hip_thrust",
  "deadlift",
  "rdl_bar",
  "kb_swing",
  "good_morning",
  "rdl_single",
  "sumo_deadlift",
  "calf_raise_db",
  "calf_single",
  // Zuhause, Teil 2: Drücken (Z35 bis Z48)
  "floorpress",
  "pushup",
  "dips",
  "bench_bar",
  "bench_incline",
  "incline_db",
  "db_fly",
  "pushup_deficit",
  "ohp_seat",
  "pike_pushup",
  "ohp_bar",
  "arnold_press",
  "push_press",
  "ohp_kb",
  // Zuhause, Teil 3: Ziehen und Arme (Z49 bis Z71; Z60 fehlt noch)
  "row1",
  "ringrow",
  "band_row",
  "row_bar",
  "chest_row_db",
  "kb_row",
  "renegade_row",
  "shrug_db",
  "chinup",
  "band_pulldown",
  "pullup_negative",
  "pullover_db",
  "hammer_curl",
  "tri_oh",
  "incline_curl",
  "concentration_curl",
  "curl_bar",
  "skull_crusher",
  "diamond_pushup",
  "bench_dips",
  "wrist_curl",
  "reverse_curl",
  // Zuhause, Teil 4: Schultern und Rumpf (Z72 bis Z90; Z88 fehlt noch)
  "face_pull",
  "band_lateral",
  "reverse_fly_db",
  "front_raise",
  "upright_row",
  "rear_delt_row",
  "plank",
  "sideplank",
  "suitcase",
  "hollow_hold",
  "hanging_knee_raise",
  "db_chop",
  "around_world",
  "wipers",
  "reverse_crunch",
  "russian_twist",
  "superman",
  "farmer_carry",
  // Studio (S)
  "leg_press",
  "hack_squat",
  "leg_extension",
  "leg_curl",
  "back_ext",
  "chest_press_machine",
  "pec_deck",
  "reverse_fly_machine",
  "shoulder_press_machine",
  "row_machine",
  "calf_seated",
  "pull_through",
  "cable_fly",
  "cable_row",
  "lat_pulldown",
  "straight_arm_pulldown",
  "cable_curl",
  "pushdown",
  "tri_cable_oh",
  "cable_lateral",
  "face_pull_cable",
  "cable_chop",
  // Aufwärmen (A)
  "bike_easy",
  "jumping_jacks",
  "march_high",
  "cat_cow",
  "hip_circles",
  "ankle_rocks",
  "thoracic_open",
  "shoulder_circles",
  "worlds_greatest",
  "squat_pry",
  "leg_swings",
  "hip_flexor_dyn",
  "arm_crossswings",
  "glute_bridge",
  "gb_march",
  "bird_dog",
  "dead_bug",
  "side_plank_dip",
  "scap_pushup",
  "band_pullapart",
  "wall_slides",
  "side_steps",
  "pogo_calf",
  "pallof",
]);

/**
 * Bewegungen im Kreis (Kurbel, Hüfte, Arme, Hantel um den Kopf): Phase 4 geht wieder in Phase 1
 * über, also Folge 1-2-3-4 statt hin und zurück. Hin und zurück liefe die
 * Kurbel rückwärts.
 */
const IM_KREIS: ReadonlySet<string> = new Set(["bike_easy", "hip_circles", "shoulder_circles", "around_world"]);

/**
 * Katalog-Übungen, die genau so aussehen wie eine Aufwärmübung mit Bild, und
 * deren Bild mitnutzen (Katalog-Id → Bild-Id). Nur bei wirklich gleicher
 * Bewegung und gleicher Ausrüstung eintragen.
 */
const GLEICH_WIE: Readonly<Record<string, string>> = {
  birddog: "bird_dog",
  deadbug: "dead_bug",
};

/** Id der Bilddatei zu einer Übung (eigene Id oder die Übung mit gleicher Bewegung). */
const bildId = (id: string): string => GLEICH_WIE[id] ?? id;

/** Hochzählen, wenn ein Bild ersetzt wird: der Service Worker cacht die URL
 *  dauerhaft, erst ein neuer `?v=` holt die neue Datei. */
const BEWEGUNG_STAND = 1;

/** Gibt es zu dieser Übung ein Bewegungsbild? */
export function hatBewegung(id: string | null | undefined): boolean {
  return !!id && MIT_BEWEGUNG.has(bildId(id));
}

/** Läuft die Bewegung im Kreis (1-2-3-4) statt hin und zurück (1-2-3-4-3-2)? */
export function imKreis(id: string | null | undefined): boolean {
  return hatBewegung(id) && IM_KREIS.has(bildId(id as string));
}

/** URL des Bewegungsbilds oder null. `klein` = Phasen je 360 × 240 (Kachel
 *  auf der Trainingskarte), sonst je 720 × 480. */
export function bewegungUrl(id: string | null | undefined, klein = false): string | null {
  if (!hatBewegung(id)) return null;
  return `/bewegung/${bildId(id as string)}${klein ? "-klein" : ""}.webp?v=${BEWEGUNG_STAND}`;
}

/** Alle Kennungen mit Bild (für Tests und Prüfskripte). */
export const BEWEGUNGEN: readonly string[] = [...MIT_BEWEGUNG];
/** Kennungen, die im Kreis laufen (für Tests). */
export const KREISE: readonly string[] = [...IM_KREIS];
/** Katalog-Übungen, die das Bild einer gleichen Bewegung mitnutzen (für Tests). */
export const GLEICHE_BEWEGUNGEN: Readonly<Record<string, string>> = GLEICH_WIE;
