import type { Exercise, ResolvedSlot } from "@/lib/types";
import { poolFor, stressesInjury } from "@/lib/progression";
import { fitToBudget } from "@/lib/session-time";

/**
 * DAS eine Trainings-Modell der App: eine täglich frisch komponierte Einheit.
 * Ersetzt A/B/C-Templates, eigene Tage und den KI-Wochenplan. Quelle ist
 * entweder ATLAS (KI), der deterministische Fallback-Generator oder der
 * Nutzer selbst („manuell").
 */

/** Eine geplante Übung in der Tages-Einheit. `id` ist die stabile
 *  Instanz-Kennung des Slots — geloggte Sätze hängen an IHR, nicht an der
 *  Übungs-Id. So überlebt ein Übungstausch die bereits geloggten Sätze und
 *  dieselbe Übung kann zweimal in einer Einheit vorkommen. */
export interface PlannedExercise {
  id: string;
  exerciseId: string;
  sets: number;
  repLow: number;
  repHigh: number;
  /** ATLAS: Warum diese Übung heute in der Einheit ist (≤ 140 Zeichen). */
  why: string;
  /** ATLAS: Coach-Ansage beim Start der Übung (≤ 200 Zeichen). */
  intro: string;
}

export type SessionSource = "atlas" | "fallback" | "manuell";
export type SessionVariant = "normal" | "reset" | "exam";

/** Für welchen Trainingsort die Einheit komponiert wurde. `sig` (Ort-Id +
 *  Geräte, lib/orte.ts `ortSignatur`) erkennt Ortswechsel UND geänderte
 *  Geräte — dann passt die Einheit nicht mehr und Heute stellt neu zusammen. */
export interface SessionOrt {
  id: string;
  name: string;
  sig: string;
}

export interface DailySession {
  /** Stabil pro Komposition (z. B. "today-2026-08-08-1"). */
  id: string;
  /** Kalendertag "YYYY-MM-DD" — eine neue Session pro Tag. */
  date: string;
  name: string;
  focus: string;
  /** ATLAS-Briefing: Warum diese Einheit heute so aussieht (2–3 Sätze). */
  briefing: string;
  items: PlannedExercise[];
  source: SessionSource;
  /** Optionaler Nutzer-Wunsch, der in die Komposition einging. */
  wish?: string;
  variant?: SessionVariant;
  createdAt: string;
  /** Gesetzt, sobald die Einheit gespeichert wurde — Heute zeigt dann Ruhe. */
  completedAt?: string;
  /** Nutzer hat manuell eingegriffen — eine später eintreffende KI-Antwort
   *  darf diese Fassung nicht mehr ersetzen. */
  edited?: boolean;
  /** Trainingsort der Komposition (fehlt bei Einheiten von vor den Orten). */
  ort?: SessionOrt;
  schemaVersion: 1;
}

/** Kalendertag im Session-Format. */
export function todayKey(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Nächste freie Item-Instanz-Id ("i1", "i2", …). */
export function nextItemId(items: PlannedExercise[]): string {
  let max = 0;
  for (const it of items) {
    const n = Number(it.id.replace(/^i/, ""));
    if (Number.isFinite(n) && n > max) max = n;
  }
  return `i${max + 1}`;
}

/* ── Edit-Helfer: alle pure, geben eine NEUE Session mit `edited` zurück. ── */

export function swapItem(
  s: DailySession,
  itemId: string,
  ex: Exercise,
): DailySession {
  return {
    ...s,
    edited: true,
    items: s.items.map((it) =>
      it.id === itemId
        ? {
            ...it,
            exerciseId: ex.id,
            repLow: ex.repLow,
            repHigh: ex.repHigh,
            why: "Deine Wahl.",
            intro: ex.cue,
          }
        : it,
    ),
  };
}

export function addItem(s: DailySession, ex: Exercise): DailySession {
  const item: PlannedExercise = {
    id: nextItemId(s.items),
    exerciseId: ex.id,
    sets: ex.sets,
    repLow: ex.repLow,
    repHigh: ex.repHigh,
    why: "Von dir ergänzt.",
    intro: ex.cue,
  };
  return { ...s, edited: true, items: [...s.items, item] };
}

export function removeItem(s: DailySession, itemId: string): DailySession {
  return { ...s, edited: true, items: s.items.filter((it) => it.id !== itemId) };
}

export function moveItem(s: DailySession, itemId: string, dir: -1 | 1): DailySession {
  const idx = s.items.findIndex((it) => it.id === itemId);
  const to = idx + dir;
  if (idx < 0 || to < 0 || to >= s.items.length) return s;
  const items = [...s.items];
  const [it] = items.splice(idx, 1);
  items.splice(to, 0, it);
  return { ...s, edited: true, items };
}

export function setItemSets(
  s: DailySession,
  itemId: string,
  sets: number,
): DailySession {
  const n = Math.max(1, Math.min(6, Math.round(sets)));
  return {
    ...s,
    edited: true,
    items: s.items.map((it) => (it.id === itemId ? { ...it, sets: n } : it)),
  };
}

/* ── Brücken in die bestehende Engine (Warmup, Zeit, Workout-Seite). ── */

/**
 * Auflösung in ResolvedSlot[] — dieselbe Form, die fitToBudget und die
 * Zeitschätzung sprechen. Slot-Key = `today:<itemId>`; der Pool ist der
 * musterreine, equipment-gefilterte Tausch-Pool.
 */
export function resolveDailySession(
  s: DailySession,
  allLib: Exercise[],
  has: (k: string) => boolean,
): ResolvedSlot[] {
  const byId = new Map(allLib.map((e) => [e.id, e]));
  return s.items
    .map((it): ResolvedSlot | null => {
      const base = byId.get(it.exerciseId);
      if (!base) return null;
      const ex: Exercise = {
        ...base,
        sets: it.sets,
        repLow: it.repLow,
        repHigh: it.repHigh,
      };
      return {
        ex,
        slotKey: `today:${it.id}`,
        pool: poolFor(base.pattern, has, allLib),
      };
    })
    .filter((x): x is ResolvedSlot => x !== null);
}

/**
 * Eine BESTEHENDE Einheit auf ein neues Zeitfenster bringen — ohne sie neu
 * zusammenzustellen.
 *
 * Wozu: Wer die Einheit einmal bearbeitet hat (Übung getauscht, Sätze
 * geändert), bei dem war die Zeitumstellung vorher wirkungslos — sie
 * speicherte nur die Zahl, sichtbar passierte nichts, und die App sagte es
 * auch nicht. Neu zu komponieren wäre die andere Möglichkeit gewesen, hätte
 * aber genau die Bearbeitungen weggeworfen, um die es dem Nutzer ging.
 *
 * Der Rückweg ist verlustfrei, weil `resolveDailySession` die Item-Id im
 * `slotKey` trägt („today:<itemId>“) und `fitToBudget` genau diese Form
 * spricht. Slots OHNE dieses Präfix werden verworfen: die Extend-Phase von
 * `fitToBudget` darf zwar für frische Einheiten neue Übungen erfinden, aber
 * niemals in eine kuratierte Liste hineinschreiben. Übrig bleiben also die
 * Übungen des Nutzers in seiner Reihenfolge, nur mit angepasster Satzzahl
 * (und im Extremfall ohne die hinten abgeschnittenen).
 */
export function passeZeitAn(
  s: DailySession,
  allLib: Exercise[],
  has: (k: string) => boolean,
  budgetMin: number,
  opts: { protectCore?: boolean; nurKuerzen?: boolean } = {},
): DailySession {
  const gepasst = fitToBudget(resolveDailySession(s, allLib, has), budgetMin, {
    protectCore: opts.protectCore,
    nurKuerzen: opts.nurKuerzen,
  });
  const setsProItem = new Map<string, number>();
  for (const slot of gepasst.list) {
    if (!slot.slotKey.startsWith("today:")) continue;
    setsProItem.set(slot.slotKey.slice("today:".length), slot.ex.sets);
  }
  const items = s.items
    .filter((it) => setsProItem.has(it.id))
    .map((it) => {
      const n = setsProItem.get(it.id) ?? it.sets;
      return n === it.sets ? it : { ...it, sets: n };
    });
  // Nie alles wegkürzen: eine leere Einheit wäre schlechter als eine zu lange.
  if (!items.length) return s;
  return { ...s, items };
}

/**
 * Rückenschonung auf eine BESTEHENDE Einheit anwenden: jede rückenkritische
 * Übung (`backCaution` oder schwere Hüftstreckung) wird gegen eine schonende
 * desselben Musters getauscht, die der Ort hergibt; gibt es keine, fällt die
 * Übung weg (nie die letzte).
 *
 * Wozu: Die Einheit steht schon, wenn der Check-in vor dem Training „Rücken
 * schlecht“ meldet — bisher änderte das nur das Aufwärmen, das geplante
 * Kreuzheben blieb. Und ein ATLAS-Plan bekam die Schonung nur als Satz im
 * Prompt. Diese Funktion ist die harte Grenze für beide Fälle.
 *
 * Kein `edited`: das ist keine Bearbeitung des Nutzers, sondern Schutz.
 */
export function schoneRuecken(
  s: DailySession,
  allLib: Exercise[],
  has: (k: string) => boolean,
  disabled?: readonly string[],
): { session: DailySession; getauscht: string[]; gestrichen: string[] } {
  const byId = new Map(allLib.map((e) => [e.id, e]));
  const blocked = disabled?.length ? new Set(disabled) : undefined;
  const kritisch = (e: Exercise) => stressesInjury(e, "rücken");
  const belegt = new Set(s.items.map((it) => it.exerciseId));
  let items = s.items;
  const getauscht: string[] = [];
  const gestrichen: string[] = [];
  for (const it of s.items) {
    const ex = byId.get(it.exerciseId);
    if (!ex || !kritisch(ex)) continue;
    const ersatz = poolFor(ex.pattern, has, allLib, blocked).filter(
      (e) => !kritisch(e) && !belegt.has(e.id),
    );
    // Rumpf: ein ausgewiesener Stabilisator zuerst.
    const wahl =
      (ex.pattern === "core" ? ersatz.find((e) => e.backStabilizer) : undefined) ?? ersatz[0];
    if (wahl) {
      belegt.delete(ex.id);
      belegt.add(wahl.id);
      items = items.map((x) =>
        x.id === it.id
          ? {
              ...x,
              exerciseId: wahl.id,
              repLow: wahl.repLow,
              repHigh: wahl.repHigh,
              why: `Rückenschonend statt ${ex.name}.`,
              intro: wahl.cue,
            }
          : x,
      );
      getauscht.push(`${ex.name} → ${wahl.name}`);
    } else if (items.length > 1) {
      belegt.delete(ex.id);
      items = items.filter((x) => x.id !== it.id);
      gestrichen.push(ex.name);
    }
  }
  if (!getauscht.length && !gestrichen.length) return { session: s, getauscht, gestrichen };
  return { session: { ...s, items }, getauscht, gestrichen };
}
