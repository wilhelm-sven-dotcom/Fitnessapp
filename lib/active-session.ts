import { presc, warmupSets } from "@/lib/progression";
import { NEUTRAL_SCALE, band, scaleFor, type ReadinessScale } from "@/lib/readiness";
import type { DailySession, PlannedExercise } from "@/lib/session-model";
import { KEYS, storage } from "@/lib/storage";
import type {
  AppSettings,
  Exercise,
  LastPerf,
  Readiness,
  SetEntry,
  TrafficLight,
} from "@/lib/types";

/**
 * Zustand der LAUFENDEN Einheit. Lebt bewusst außerhalb des Providers:
 * gerätelokal persistiert (KEYS.active, nie Cloud) und bei jedem Commit
 * geschrieben — ein Reload oder Browser-Crash mitten im Training kostet
 * keinen einzigen Satz. Geloggte Sätze hängen an der Item-Instanz-Id.
 */
export interface ActiveSessionState {
  session: DailySession;
  /** Satz-Protokoll je Item-Instanz-Id (nicht Übungs-Id!). */
  entries: Record<string, SetEntry[]>;
  currentIndex: number;
  phase: "warmup" | "exercise" | "finish";
  startedAt: string;
  readiness?: Readiness;
  /** Beim Start eingefrorene Rücken-Schonung. */
  backSafe: boolean;
  backTraffic?: TrafficLight | null;
  note?: string;
  schemaVersion: 1;
}

/** Länger unterbrochen als das ist keine Pause mehr, sondern ein Abbruch. */
export const RESUME_WINDOW_MS = 6 * 60 * 60 * 1000;

export async function loadActiveState(): Promise<ActiveSessionState | null> {
  const raw = await storage.getJSON<ActiveSessionState | null>(KEYS.active, null);
  if (!raw || raw.schemaVersion !== 1) return null;
  if (
    !raw.session ||
    !Array.isArray(raw.session.items) ||
    raw.session.items.length === 0 ||
    typeof raw.entries !== "object"
  )
    return null;
  const age = Date.now() - new Date(raw.startedAt).getTime();
  if (!Number.isFinite(age) || age > RESUME_WINDOW_MS) {
    void storage.remove(KEYS.active);
    return null;
  }
  return {
    ...raw,
    currentIndex: Math.max(
      0,
      Math.min(raw.session.items.length - 1, raw.currentIndex ?? 0),
    ),
    phase:
      raw.phase === "warmup" || raw.phase === "finish" ? raw.phase : "exercise",
  };
}

export function persistActiveState(s: ActiveSessionState): Promise<void> {
  return storage.setJSONLocal(KEYS.active, s);
}

export function clearActiveState(): Promise<void> {
  return storage.remove(KEYS.active);
}

/** A deload overrides readiness with a clearly lighter week. */
function withDeload(base: ReadinessScale, deloadActive: boolean): ReadinessScale {
  return deloadActive
    ? { setDelta: -1, loadMult: Math.min(base.loadMult, 0.6), cap: true }
    : base;
}

/** Skalierung beim Einheiten-Start: Tagesform (Check-in) + laufender Deload. */
export function startScale(
  settings: AppSettings,
  readiness: Readiness | undefined | null,
): ReadinessScale {
  const deloadActive =
    !!settings.lastDeloadDate &&
    Date.now() - new Date(settings.lastDeloadDate).getTime() < 7 * 86_400_000;
  return withDeload(
    settings.autoregOn && readiness ? scaleFor(band(readiness.score)) : NEUTRAL_SCALE,
    deloadActive,
  );
}

/** Tagesform-Satzdelta auf die Einheit anwenden (Klammer 2..sets+1, nur
 *  Gewichts-Übungen; die Prüfung bringt ihre eigene Rampe mit). */
export function applySetDelta(
  session: DailySession,
  allLib: Exercise[],
  scale: ReadinessScale,
): DailySession {
  if (scale.setDelta === 0 || session.variant === "exam") return session;
  const byId = new Map(allLib.map((e) => [e.id, e]));
  return {
    ...session,
    items: session.items.map((it) => {
      const ex = byId.get(it.exerciseId);
      if (!ex?.weighted) return it;
      const sets = Math.max(2, Math.min(it.sets + 1, it.sets + scale.setDelta));
      return sets === it.sets ? it : { ...it, sets };
    }),
  };
}

export interface PrefillOpts {
  allLib: Exercise[];
  lastPerf: (id: string) => LastPerf | null;
  daysAgo: number | null;
  weightStep?: number;
  scale: ReadinessScale;
  variant?: DailySession["variant"];
}

/** Normale Vorbelegung: Aufwärmsätze + leere Arbeitssätze mit Gewichtsvorschlag. */
function initSetsFor(ex: Exercise, sets: number, o: PrefillOpts): SetEntry[] {
  const p = presc(ex, o.lastPerf(ex.id), {
    lighter: o.daysAgo != null && o.daysAgo > 5,
    loadMult: o.scale.loadMult,
    cap: o.scale.cap,
    step: o.weightStep,
  });
  const working: SetEntry[] = Array.from({ length: sets }, () => ({
    weight: p.w,
    reps: "",
  }));
  const warm =
    ex.weighted && p.w && Number(p.w) > 0
      ? warmupSets(Number(p.w), o.weightStep)
      : [];
  return [...warm, ...working];
}

/** „Die Prüfung": aufsteigende Rampe 5 → 4 → 3 zum schweren Test-Satz,
 *  ausgehend von der letzten Leistung. Ohne belastbare Historie (oder ohne
 *  Gewicht) fällt die Übung auf den normalen Plan zurück. */
function examSetsFor(ex: Exercise, sets: number, o: PrefillOpts): SetEntry[] {
  const lp = o.lastPerf(ex.id);
  const best = lp
    ? Math.max(
        0,
        ...lp.sets
          .filter((s) => !s.warmup && s.reps !== "" && s.weight !== "")
          .map((s) => Number(s.weight) || 0),
      )
    : 0;
  if (!ex.weighted || !isFinite(best) || best <= 0) return initSetsFor(ex, sets, o);
  const step = o.weightStep ?? 2.5;
  // Strikt aufsteigend, Rundung darf die Stufen nicht kollabieren lassen;
  // der Test-Satz liegt einen Schritt ÜBER der letzten Bestleistung.
  const base = Math.max(step, Math.round(best / step) * step);
  const w5 = Math.max(step, Math.round((base * 0.85) / step) * step);
  const w4 = Math.max(w5 + step, Math.round((base * 0.95) / step) * step);
  const w3 = Math.max(w4 + step, base + step);
  const working: SetEntry[] = [
    { weight: String(w5), reps: "" },
    { weight: String(w4), reps: "" },
    { weight: String(w3), reps: "" },
  ];
  return [...warmupSets(w5, o.weightStep), ...working];
}

/** Vorbelegung für EIN Item (auch beim Tausch/Hinzufügen mitten in der Einheit). */
export function prefillFor(
  item: PlannedExercise,
  ex: Exercise,
  o: PrefillOpts,
): SetEntry[] {
  if (ex.pattern === "cardio") return [{ weight: "", reps: "" }];
  return o.variant === "exam"
    ? examSetsFor(ex, item.sets, o)
    : initSetsFor(ex, item.sets, o);
}

/** Komplette Vorbelegung beim Einheiten-Start, je Item-Instanz-Id. */
export function prefillEntries(
  session: DailySession,
  o: PrefillOpts,
): Record<string, SetEntry[]> {
  const byId = new Map(o.allLib.map((e) => [e.id, e]));
  const out: Record<string, SetEntry[]> = {};
  for (const it of session.items) {
    const ex = byId.get(it.exerciseId);
    if (ex) out[it.id] = prefillFor(it, ex, { ...o, variant: session.variant });
  }
  return out;
}

const filledSet = (s: SetEntry) => s.reps !== "" && s.reps != null;

/** Gewichts-Kaskade: ein eingetragenes Gewicht zieht unberührte Folgesätze mit
 *  (reps noch offen, Gewicht leer oder noch auf dem alten Wert dieses Satzes).
 *  Warmup-Sätze bleiben unangetastet. Pure — gibt ein NEUES Array zurück. */
export function cascadeWeight(sets: SetEntry[], i: number, val: string): SetEntry[] {
  const arr = sets.map((s) => ({ ...s }));
  const before = arr[i]?.weight;
  arr[i] = { ...arr[i], weight: val };
  if (val !== "") {
    for (let j = i + 1; j < arr.length; j++) {
      const s = arr[j];
      if (s.warmup) continue;
      const open = s.reps === "" || s.reps == null;
      const untouched = s.weight === "" || s.weight == null || s.weight === before;
      if (open && untouched) arr[j] = { ...s, weight: val };
    }
  }
  return arr;
}

/**
 * Entries nach einem Session-Edit abgleichen: bestehende Items behalten ihr
 * Protokoll (auch beim Übungs-Tausch — gefüllte Sätze überleben), geänderte
 * Satz-Zahlen ergänzen/trimmen nur OFFENE Sätze, neue Items werden vorbelegt,
 * entfernte fallen weg.
 */
export function reconcileEntries(
  prev: Record<string, SetEntry[]>,
  prevSession: DailySession,
  next: DailySession,
  o: PrefillOpts,
): Record<string, SetEntry[]> {
  const byId = new Map(o.allLib.map((e) => [e.id, e]));
  const prevItems = new Map(prevSession.items.map((it) => [it.id, it]));
  const out: Record<string, SetEntry[]> = {};
  for (const item of next.items) {
    const ex = byId.get(item.exerciseId);
    if (!ex) continue;
    const opts: PrefillOpts = { ...o, variant: next.variant };
    const old = prev[item.id];
    const was = prevItems.get(item.id);
    if (!old || !was) {
      out[item.id] = prefillFor(item, ex, opts);
      continue;
    }
    if (was.exerciseId !== item.exerciseId) {
      // Tausch: gefüllte Arbeitssätze bleiben, der Rest kommt frisch für die
      // neue Übung (deren Gewichtsvorschlag; alte Warmups wären irreführend).
      const filled = old.filter((s) => !s.warmup && filledSet(s));
      if (!filled.length) {
        out[item.id] = prefillFor(item, ex, opts);
        continue;
      }
      const freshWork = prefillFor(item, ex, opts).filter((s) => !s.warmup);
      out[item.id] = [...filled, ...freshWork.slice(filled.length)];
      continue;
    }
    const warm = old.filter((s) => s.warmup);
    const work = old.filter((s) => !s.warmup);
    if (ex.pattern !== "cardio" && work.length < item.sets) {
      const w = work.length ? work[work.length - 1].weight : "";
      const extra: SetEntry[] = Array.from(
        { length: item.sets - work.length },
        () => ({ weight: w, reps: "" }),
      );
      out[item.id] = [...warm, ...work, ...extra];
    } else if (ex.pattern !== "cardio" && work.length > item.sets) {
      const keep = [...work];
      for (let i = keep.length - 1; i >= 0 && keep.length > item.sets; i--) {
        if (!filledSet(keep[i])) keep.splice(i, 1);
      }
      out[item.id] = [...warm, ...keep];
    } else {
      out[item.id] = old;
    }
  }
  return out;
}

/** Erledigt-Status eines Items (Kraft: alle Arbeitssätze voll; Cardio: Haken). */
export function itemDone(ex: Exercise, sets: SetEntry[] | undefined): boolean {
  const arr = sets ?? [];
  if (ex.pattern === "cardio") return !!arr[0] && filledSet(arr[0]);
  const work = arr.filter((s) => !s.warmup);
  return work.length > 0 && work.every(filledSet);
}

/** Erledigte Arbeitssätze über die ganze Einheit. */
export function doneWorkSets(entries: Record<string, SetEntry[]>): number {
  return Object.values(entries)
    .flat()
    .filter((s) => !s.warmup && filledSet(s)).length;
}
