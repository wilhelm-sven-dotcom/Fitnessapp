import type { ActiveSessionState } from "@/lib/active-session";
import { PATTERN_LABEL } from "@/lib/exercises";
import type { ExRecord } from "@/lib/records";
import { restSecFor, TIME } from "@/lib/session-time";
import type { Exercise, SetEntry } from "@/lib/types";

/**
 * Kompaktes Live-Transkript der laufenden Einheit für /api/atlas/set —
 * Plan, ALLE bisherigen Sätze, Tagesform, Zeitstand und der eben beendete
 * Satz. So kann sich ATLAS auf frühere Sätze und Übungen beziehen, statt nur
 * den letzten Moment zu sehen.
 */

/**
 * Längengrenze in Zeichen — dieselbe Zahl kappt auf dem Server
 * (app/api/atlas/set/route.ts). Vorher lag die Grenze hier bei 5200 und dort
 * bei 4500, und gekürzt wurde stumpf am Ende: in langen Einheiten fiel genau
 * die Zeile „AKTUELL“ weg, auf die ATLAS antworten soll. Jetzt bleiben Kopf
 * und der aktuelle Satz immer stehen; gekürzt wird bei den ältesten Übungen.
 */
export const TRANSKRIPT_MAX = 5200;

/**
 * EIN Satz als Text — mit Einheit an JEDER Zahl.
 *
 * Vorher stand hier `80×12` und in der Planzeile `3×8–12`: dasselbe `×`
 * bedeutete einmal Gewicht × Wiederholungen und einmal Sätze × Wiederholungen.
 * Das Modell musste raten und lag regelmäßig falsch — Gewicht und
 * Wiederholungen kamen vertauscht zurück, und bei hohen Wiederholungszahlen
 * (`20×40` = 20 kg, 40 Wdh) gewann die „plausiblere“ Lesart, also 20 Wdh.
 * Deshalb: Einheiten ausschreiben, und `×` steht im ganzen Transkript nur
 * noch zwischen Kilo und Wiederholungen.
 */
function setLine(ex: Exercise, s: SetEntry): string {
  if (ex.unit === "Sek")
    return `${s.reps} s${s.intensity != null ? ` (Intensität ${s.intensity})` : ""}`;
  const rir = s.rir != null ? `, RIR ${s.rir}` : "";
  const hasWeight = s.weight !== "" && s.weight != null && Number(s.weight) > 0;
  return hasWeight ? `${s.weight} kg × ${s.reps} Wdh${rir}` : `${s.reps} Wdh${rir}`;
}

export function buildSessionTranscript(opts: {
  state: ActiveSessionState;
  allLib: Exercise[];
  /** Item-Id + Satz-Index des eben beendeten Satzes. */
  itemId: string;
  setIdx: number;
  records: Map<string, ExRecord>;
  exerciseNotes: Record<string, string>;
  budgetMin: number;
}): string {
  const { state, itemId, setIdx } = opts;
  const s = state.session;
  const byId = new Map(opts.allLib.map((e) => [e.id, e]));

  const startedMin = Math.max(
    0,
    Math.round((Date.now() - new Date(state.startedAt).getTime()) / 60000),
  );
  let openSec = 0;
  for (const it of s.items) {
    const ex = byId.get(it.exerciseId);
    if (!ex || ex.pattern === "cardio") continue;
    const open = (state.entries[it.id] ?? []).filter(
      (x) => !x.warmup && (x.reps === "" || x.reps == null),
    ).length;
    const workSec = ex.unit === "Sek" ? TIME.timedSetSec : TIME.repSetSec;
    openSec += open * (workSec + restSecFor(ex));
  }

  const head: string[] = [
    `Einheit: ${s.name}${s.focus ? ` (${s.focus})` : ""}${s.variant && s.variant !== "normal" ? ` · Variante ${s.variant}` : ""}.`,
    `Zeit: läuft seit ${startedMin} Min, noch ~${Math.round(openSec / 60)} Min offen, Ziel ${opts.budgetMin} Min.`,
  ];
  if (state.readiness)
    head.push(
      `Tagesform (Check-in): Schlaf ${state.readiness.sleep}/3, Energie ${state.readiness.energy}/3, Rücken ${state.readiness.back}/3.`,
    );
  if (state.backSafe) head.push("Rückenschonung aktiv — keine belasteten Beugen/Hinges.");

  /** Je Übung die volle Zeile und eine Kurzfassung für den Fall, dass es eng wird. */
  const items: { voll: string; kurz: string; aktuell: boolean }[] = [];
  s.items.forEach((it, i) => {
    const ex = byId.get(it.exerciseId);
    if (!ex) return;
    const sets = state.entries[it.id] ?? [];
    const work = sets.filter((x) => !x.warmup);
    const done = work.filter((x) => x.reps !== "" && x.reps != null);
    const doneStr = done.map((x) => setLine(ex, x)).join(", ");
    const open = work.length - done.length;
    const aktuell = it.id === itemId;
    const marker = aktuell ? " ← AKTUELLE ÜBUNG" : "";
    const rec = opts.records.get(ex.id);
    const note = opts.exerciseNotes[ex.id];
    const parts = [
      // „Sätze à …“ statt „3×8–12“: das × ist für Kilo × Wiederholungen
      // reserviert, sonst steht es im selben Text für zweierlei.
      `${i + 1}. ${ex.name} (${PATTERN_LABEL[ex.pattern]}) — geplant ${it.sets} Sätze à ${it.repLow}–${it.repHigh}${ex.unit === "Sek" ? " s" : " Wdh"}.`,
      doneStr ? `Geschaffte Sätze: ${doneStr}.` : "Noch kein Satz.",
      open > 0 ? `Offen: ${open}.` : "Fertig.",
      // Der Rekord-Text der Oberfläche („82,5 × 8“) trägt keine Einheiten —
      // fürs Modell ausschreiben, sonst gilt die Regel oben nur halb.
      rec
        ? `Bestwert: ${rec.kind === "weight" ? `${rec.label.replace(" × ", " kg × ")} Wdh` : rec.label}.`
        : "",
      note ? `Hilfsmittel: ${note} (assistierte/leichtere Ausführung).` : "",
    ]
      .filter(Boolean)
      .join(" ");
    const letzter = done[done.length - 1];
    items.push({
      voll: parts + marker,
      kurz: `${i + 1}. ${ex.name}: ${done.length} von ${it.sets} Sätzen${letzter ? `, zuletzt ${setLine(ex, letzter)}` : ""}.${marker}`,
      aktuell,
    });
  });

  const cur = state.entries[itemId]?.[setIdx];
  const curItem = s.items.find((it) => it.id === itemId);
  const curEx = curItem ? byId.get(curItem.exerciseId) : undefined;
  const tail: string[] = [];
  if (cur && curEx) {
    const work = (state.entries[itemId] ?? []).filter((x) => !x.warmup);
    const no = (state.entries[itemId] ?? [])
      .slice(0, setIdx + 1)
      .filter((x) => !x.warmup).length;
    tail.push(
      `AKTUELL: Eben Satz ${no}/${work.length} von ${curEx.name} beendet — ${setLine(curEx, cur)}.`,
    );
  }

  // Zusammensetzen und, wenn nötig, von vorn nach hinten eindampfen: erst
  // Kurzfassungen für die ältesten Übungen, dann ganz weglassen. Kopf, die
  // aktuelle Übung und „AKTUELL“ bleiben immer.
  const zeilen = items.map((x) => x.voll);
  let ausgelassen = 0;
  const baue = () =>
    [
      ...head,
      "",
      "Plan & bisheriger Verlauf:",
      ...(ausgelassen > 0
        ? [`(${ausgelassen} frühere ${ausgelassen === 1 ? "Übung" : "Übungen"} ausgelassen)`]
        : []),
      ...zeilen.filter((z) => z !== ""),
      "",
      ...tail,
    ].join("\n");
  for (let i = 0; i < items.length && baue().length > TRANSKRIPT_MAX; i++) {
    if (!items[i].aktuell) zeilen[i] = items[i].kurz;
  }
  for (let i = 0; i < items.length && baue().length > TRANSKRIPT_MAX; i++) {
    if (items[i].aktuell) continue;
    zeilen[i] = "";
    ausgelassen++;
  }
  let out = baue();
  if (out.length > TRANSKRIPT_MAX) {
    // Äußerster Fall (eine einzige, riesige Übung): die Mitte kappen, das Ende
    // mit „AKTUELL“ behalten.
    const ende = `\n\n${tail.join("\n")}`;
    out = out.slice(0, Math.max(0, TRANSKRIPT_MAX - ende.length)) + ende;
  }
  return out;
}

/** Fakten fürs Abschluss-Debrief (gestreamt) — kompakt, keine Prosa. */
export function buildDebriefFacts(opts: {
  state: ActiveSessionState;
  allLib: Exercise[];
  summary: { sets: number; tonnage: number; prs: number; weekSets: number; weekTarget: number };
}): string {
  const { state } = opts;
  const s = state.session;
  const byId = new Map(opts.allLib.map((e) => [e.id, e]));
  const lines: string[] = [
    `Einheit: ${s.name}${s.focus ? ` (${s.focus})` : ""}${s.variant && s.variant !== "normal" ? ` · Variante ${s.variant}` : ""}.`,
    `Ergebnis: ${opts.summary.sets} Arbeitssätze, ${Math.round(opts.summary.tonnage)} kg bewegt, ${opts.summary.prs} neue Bestwerte. Wochensätze ${opts.summary.weekSets}/${opts.summary.weekTarget}.`,
  ];
  if (state.readiness)
    lines.push(
      `Tagesform war: Schlaf ${state.readiness.sleep}/3, Energie ${state.readiness.energy}/3, Rücken ${state.readiness.back}/3.`,
    );
  if (state.backTraffic)
    lines.push(`Rücken-Ampel nach der Einheit: ${state.backTraffic}.`);
  if (state.note) lines.push(`Notiz des Athleten: „${state.note.slice(0, 200)}”.`);
  lines.push("Sätze im Detail:");
  s.items.forEach((it, i) => {
    const ex = byId.get(it.exerciseId);
    if (!ex) return;
    const done = (state.entries[it.id] ?? [])
      .filter((x) => !x.warmup && x.reps !== "" && x.reps != null)
      .map((x) => setLine(ex, x))
      .join(", ");
    if (done) lines.push(`${i + 1}. ${ex.name}: ${done}.`);
  });
  let out = lines.join("\n");
  // Server-Grenze: 3500 Zeichen (app/api/atlas/debrief/route.ts).
  if (out.length > 3000) out = out.slice(0, 3000);
  return out;
}
