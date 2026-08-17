import type { ActiveSessionState } from "@/lib/active-session";
import { PATTERN_LABEL } from "@/lib/exercises";
import type { ExRecord } from "@/lib/records";
import { TIME } from "@/lib/session-time";
import type { Exercise, SetEntry } from "@/lib/types";

/**
 * Kompaktes Live-Transkript der laufenden Einheit für /api/atlas/set —
 * Plan, ALLE bisherigen Sätze, Tagesform, Zeitstand und der eben beendete
 * Satz. So kann sich ATLAS auf frühere Sätze und Übungen beziehen, statt nur
 * den letzten Moment zu sehen. Hart auf ~4000 Zeichen gekappt.
 */

const MAX_CHARS = 4000;

function setLine(ex: Exercise, s: SetEntry): string {
  if (ex.unit === "Sek") return `${s.reps}s${s.intensity != null ? ` Int${s.intensity}` : ""}`;
  const w = s.weight !== "" && s.weight != null ? `${s.weight}×` : "";
  return `${w}${s.reps}${s.rir != null ? ` RIR${s.rir}` : ""}`;
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
    openSec += open * (workSec + TIME.restSec);
  }

  const head: string[] = [
    `Studie: ${s.name}${s.focus ? ` (${s.focus})` : ""}${s.variant && s.variant !== "normal" ? ` · Variante ${s.variant}` : ""}.`,
    `Zeit: läuft seit ${startedMin} Min, noch ~${Math.round(openSec / 60)} Min offen, Ziel ${opts.budgetMin} Min.`,
  ];
  if (state.readiness)
    head.push(
      `Tagesform (Check-in): Schlaf ${state.readiness.sleep}/3, Energie ${state.readiness.energy}/3, Rücken ${state.readiness.back}/3.`,
    );
  if (state.backSafe) head.push("Rückenschonung aktiv — keine belasteten Beugen/Hinges.");

  const items: string[] = ["Plan & bisheriger Verlauf:"];
  s.items.forEach((it, i) => {
    const ex = byId.get(it.exerciseId);
    if (!ex) return;
    const sets = state.entries[it.id] ?? [];
    const work = sets.filter((x) => !x.warmup);
    const doneStr = work
      .filter((x) => x.reps !== "" && x.reps != null)
      .map((x) => setLine(ex, x))
      .join(", ");
    const open = work.filter((x) => x.reps === "" || x.reps == null).length;
    const marker = it.id === itemId ? " ← AKTUELLE ÜBUNG" : "";
    const rec = opts.records.get(ex.id);
    const note = opts.exerciseNotes[ex.id];
    const parts = [
      `${i + 1}. ${ex.name} (${PATTERN_LABEL[ex.pattern]}) — geplant ${it.sets}×${it.repLow}–${it.repHigh}${ex.unit === "Sek" ? " s" : ""}.`,
      doneStr ? `Sätze: ${doneStr}.` : "Noch kein Satz.",
      open > 0 ? `Offen: ${open}.` : "Fertig.",
      rec ? `Bestwert: ${rec.label}.` : "",
      note ? `Hilfsmittel: ${note} (assistierte/leichtere Ausführung).` : "",
    ]
      .filter(Boolean)
      .join(" ");
    items.push(parts + marker);
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

  let out = [...head, "", ...items, "", ...tail].join("\n");
  if (out.length > MAX_CHARS) out = out.slice(0, MAX_CHARS);
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
    `Studie: ${s.name}${s.focus ? ` (${s.focus})` : ""}${s.variant && s.variant !== "normal" ? ` · Variante ${s.variant}` : ""}.`,
    `Ergebnis: ${opts.summary.sets} Arbeitssätze, ${Math.round(opts.summary.tonnage)} kg bewegt, ${opts.summary.prs} neue Bestwerte. Wochensätze ${opts.summary.weekSets}/${opts.summary.weekTarget}.`,
  ];
  if (state.readiness)
    lines.push(
      `Tagesform war: Schlaf ${state.readiness.sleep}/3, Energie ${state.readiness.energy}/3, Rücken ${state.readiness.back}/3.`,
    );
  if (state.backTraffic)
    lines.push(`Rücken-Ampel nach der Studie: ${state.backTraffic}.`);
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
  if (out.length > 3000) out = out.slice(0, 3000);
  return out;
}
