import type { Exercise, ResolvedSlot, Template } from "@/lib/types";
import { poolFor } from "@/lib/progression";

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
 * Auflösung in ResolvedSlot[] — dieselbe Form, die Workout-Seite, fitToBudget
 * und saveSession sprechen. Slot-Key = `today:<itemId>`; der Pool ist der
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

/** Synthetisches Template (Name/Fokus/Muster) für Warmup & Save-Pfad. */
export function dailyToTemplate(s: DailySession, allLib: Exercise[]): Template {
  const byId = new Map(allLib.map((e) => [e.id, e]));
  return {
    key: "today",
    name: s.name,
    focus: s.focus,
    slots: s.items
      .map((it) => byId.get(it.exerciseId)?.pattern)
      .filter((p): p is Exercise["pattern"] => !!p),
  };
}
