import type { EffectiveProfile } from "@/lib/athlete";
import { presc, warmupSets } from "@/lib/progression";
import { NEUTRAL_SCALE, band, scaleFor, type ReadinessScale } from "@/lib/readiness";
import { startWeight } from "@/lib/start-weight";
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
  /** Athleten-Profil für die Startgewichts-Schätzung ohne Historie. */
  profile?: EffectiveProfile;
}

/** Normale Vorbelegung: Aufwärmsätze + leere Arbeitssätze mit Gewichtsvorschlag. */
function initSetsFor(ex: Exercise, sets: number, o: PrefillOpts): SetEntry[] {
  const lp = o.lastPerf(ex.id);
  const startW =
    !lp && o.profile ? startWeight(ex, o.profile, { step: o.weightStep })?.w : undefined;
  const p = presc(ex, lp, {
    lighter: o.daysAgo != null && o.daysAgo > 5,
    loadMult: o.scale.loadMult,
    cap: o.scale.cap,
    step: o.weightStep,
    startW,
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

/** Index des ersten offenen Arbeitssatzes (−1: alle eingetragen) — dieselbe
 *  Regel, nach der die Bühne den aktiven Satz wählt. */
export function firstOpenWorkSet(sets: SetEntry[] | undefined): number {
  return (sets ?? []).findIndex((s) => !s.warmup && !filledSet(s));
}

/** Laufende Nummer eines Arbeitssatzes (Aufwärmsätze zählen nicht mit). */
export function workSetNo(sets: SetEntry[], idx: number): number {
  return sets.slice(0, idx + 1).filter((s) => !s.warmup).length;
}

/** Nächstes noch offenes Item nach `from` (zyklisch, `from` selbst zuletzt) —
 *  wohin „Weiter“ springt; null, wenn alles erledigt ist. */
export function nextOpenItemIndex(
  st: Pick<ActiveSessionState, "session" | "entries">,
  from: number,
  byId: Map<string, Exercise>,
): number | null {
  const its = st.session.items;
  for (let off = 1; off <= its.length; off++) {
    const i = (from + off) % its.length;
    const ex = byId.get(its[i].exerciseId);
    if (ex && !itemDone(ex, st.entries[its[i].id])) return i;
  }
  return null;
}

/** Übung mit den Plan-Werten des Items (Sätze, Wiederholungsbereich). */
export function itemExercise(base: Exercise, item: PlannedExercise): Exercise {
  return { ...base, sets: item.sets, repLow: item.repLow, repHigh: item.repHigh };
}

export interface PrescCtx {
  lastPerf: (id: string) => LastPerf | null;
  profile?: EffectiveProfile;
  /** Lange Pause (> 5 Tage) → ruhiger Einstieg. */
  lighter: boolean;
  scale: ReadinessScale;
  weightStep?: number;
}

/** Vorschlag für ein Item — dieselbe Rechnung wie die Bühne (ohne Historie
 *  liefert die Startgewichts-Schätzung den Anker). `ex` = `itemExercise(…)`. */
export function prescForItem(ex: Exercise, ctx: PrescCtx, lp = ctx.lastPerf(ex.id)) {
  const startW =
    lp || !ex.weighted || !ctx.profile
      ? undefined
      : startWeight(ex, ctx.profile, { step: ctx.weightStep })?.w;
  return presc(ex, lp, {
    lighter: ctx.lighter,
    loadMult: ctx.scale.loadMult,
    cap: ctx.scale.cap,
    step: ctx.weightStep,
    startW,
  });
}

/** Was nach der laufenden Pause kommt — fürs Pausen-Dock. */
export type NextSetPreview =
  | {
      kind: "satz";
      /** Gleiche Übung wie der eben eingetragene Satz? */
      gleich: boolean;
      exName: string;
      setNo: number;
      /** Gewicht als Eingabe-String („22.5“), leer ohne Gewicht. */
      weight: string;
      reps: string;
      timed: boolean;
    }
  | { kind: "cardio"; exName: string; minLow: number; minHigh: number }
  | { kind: "abschluss" };

/**
 * Nächster Satz nach einem Eintrag in `itemId`: offener Satz derselben Übung
 * (Gewicht aus dem Protokoll, Wdh aus dem Vorschlag), sonst der erste offene
 * Arbeitssatz der nächsten offenen Übung, Cardio in Minuten, sonst Abschluss.
 */
export function nextSetPreview(
  st: Pick<ActiveSessionState, "session" | "entries">,
  itemId: string,
  byId: Map<string, Exercise>,
  ctx: PrescCtx,
): NextSetPreview {
  const its = st.session.items;
  const from = its.findIndex((it) => it.id === itemId);
  if (from < 0) return { kind: "abschluss" };
  const preview = (idx: number, gleich: boolean): NextSetPreview | null => {
    const it = its[idx];
    const base = byId.get(it.exerciseId);
    if (!base) return null;
    const ex = itemExercise(base, it);
    if (ex.pattern === "cardio")
      return { kind: "cardio", exName: ex.name, minLow: ex.repLow, minHigh: ex.repHigh };
    const sets = st.entries[it.id] ?? [];
    const k = firstOpenWorkSet(sets);
    if (k < 0) return null;
    const p = prescForItem(ex, ctx);
    return {
      kind: "satz",
      gleich,
      exName: ex.name,
      setNo: workSetNo(sets, k),
      weight: sets[k].weight ?? "",
      reps: p.r || String(ex.repHigh),
      timed: ex.unit === "Sek",
    };
  };
  const same = preview(from, true);
  if (same) return same;
  const n = nextOpenItemIndex(st, from, byId);
  return (n != null && preview(n, false)) || { kind: "abschluss" };
}

/** Erledigte Arbeitssätze über die ganze Einheit. */
export function doneWorkSets(entries: Record<string, SetEntry[]>): number {
  return Object.values(entries)
    .flat()
    .filter((s) => !s.warmup && filledSet(s)).length;
}
