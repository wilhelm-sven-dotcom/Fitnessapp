import type { EffectiveProfile } from "@/lib/athlete";
import { aufwaermPlan } from "@/lib/aufwaermsaetze";
import { ENTLASTUNG_LAST, deloadAktiv } from "@/lib/periodization";
import { pauseStufe, presc, warmupSets, type PauseStufe } from "@/lib/progression";
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
  /** Laufende Satzpause — gehört zum Live-Stand, damit sie ein Neuladen
   *  übersteht. */
  rest?: RestState;
  schemaVersion: 1;
}

/**
 * Satzpause als ENDZEIT statt als Zähler: die Restzeit ergibt sich aus der
 * Uhr. Ein heruntergezählter Zähler blieb stehen, sobald das iPhone gesperrt
 * oder die App im Hintergrund war (Timer schlafen dort).
 */
export interface RestState {
  itemId: string;
  setIdx: number;
  /** Ende der Pause, Epoch-Millisekunden. */
  endsAt: number;
  /** Geplante Länge in Sekunden (für „von 1:30“ und den Balken). */
  total: number;
}

/** Eine Pause, die länger als das vorbei ist, zeigt nach dem Neuladen niemand
 *  mehr an. */
const REST_STALE_MS = 5 * 60 * 1000;

function gueltigePause(r: unknown): RestState | undefined {
  if (!r || typeof r !== "object") return undefined;
  const x = r as Partial<RestState>;
  if (
    typeof x.itemId !== "string" ||
    !Number.isFinite(x.setIdx) ||
    !Number.isFinite(x.endsAt) ||
    !Number.isFinite(x.total)
  )
    return undefined;
  if (Date.now() - (x.endsAt as number) > REST_STALE_MS) return undefined;
  return { itemId: x.itemId, setIdx: x.setIdx as number, endsAt: x.endsAt as number, total: x.total as number };
}

/** Länger unterbrochen als das ist keine Pause mehr, sondern ein Abbruch. */
export const RESUME_WINDOW_MS = 6 * 60 * 60 * 1000;

/** Steht in der Einheit schon ein eingetragener Arbeitssatz? */
export function hatEingetrageneSaetze(s: Pick<ActiveSessionState, "entries">): boolean {
  return Object.values(s.entries ?? {}).some(
    (saetze) =>
      Array.isArray(saetze) && saetze.some((x) => !x.warmup && x.reps !== "" && x.reps != null),
  );
}

/** Begann die Einheit vor mehr als sechs Stunden? */
export function istLiegengeblieben(startedAt: string, now = Date.now()): boolean {
  const alter = now - new Date(startedAt).getTime();
  return !Number.isFinite(alter) || alter > RESUME_WINDOW_MS;
}

/**
 * Liest den gespeicherten Live-Stand. `alt`: die Einheit begann vor mehr als
 * sechs Stunden. So eine Einheit wird nicht mehr still fortgesetzt — aber
 * auch nicht mehr still gelöscht, wenn schon Sätze drinstehen (früher waren
 * die dann weg). Die Heute-Seite fragt: speichern oder verwerfen.
 */
async function leseAktiv(): Promise<{ state: ActiveSessionState; alt: boolean } | null> {
  const raw = await storage.getJSON<ActiveSessionState | null>(KEYS.active, null);
  if (!raw || raw.schemaVersion !== 1) return null;
  if (
    !raw.session ||
    !Array.isArray(raw.session.items) ||
    raw.session.items.length === 0 ||
    typeof raw.entries !== "object" ||
    raw.entries === null
  )
    return null;
  const alt = istLiegengeblieben(raw.startedAt);
  if (alt && (!hatEingetrageneSaetze(raw) || !Number.isFinite(new Date(raw.startedAt).getTime()))) {
    // Nichts eingetragen: da geht nichts verloren.
    void storage.remove(KEYS.active);
    return null;
  }
  const { rest: gespeichertePause, ...ohnePause } = raw;
  const rest = alt ? undefined : gueltigePause(gespeichertePause);
  return {
    alt,
    state: {
      ...ohnePause,
      ...(rest ? { rest } : {}),
      currentIndex: Math.max(
        0,
        Math.min(raw.session.items.length - 1, raw.currentIndex ?? 0),
      ),
      phase:
        raw.phase === "warmup" || raw.phase === "finish" ? raw.phase : "exercise",
    },
  };
}

/** Die laufende Einheit zum Fortsetzen — `null`, wenn keine läuft oder sie
 *  liegengeblieben ist. */
export async function loadActiveState(): Promise<ActiveSessionState | null> {
  const g = await leseAktiv();
  return g && !g.alt ? g.state : null;
}

/** Eine liegengebliebene Einheit mit eingetragenen Sätzen (älter als 6 h). */
export async function loadLiegengeblieben(): Promise<ActiveSessionState | null> {
  const g = await leseAktiv();
  return g?.alt ? g.state : null;
}

/** Pause ab jetzt um `sek` verlängern bzw. (negativ) kürzen. Eine abgelaufene
 *  Pause startet bei „+“ neu ab jetzt; gekürzt wird nie unter jetzt. */
export function shiftRest(r: RestState, sek: number, now = Date.now()): RestState {
  if (sek >= 0) {
    return { ...r, endsAt: Math.max(now, r.endsAt) + sek * 1000, total: r.total + sek };
  }
  return {
    ...r,
    endsAt: Math.max(now, r.endsAt + sek * 1000),
    total: Math.max(15, r.total + sek),
  };
}

/** Restsekunden einer Pause (aufgerundet, nie negativ). */
export function restLeft(endsAt: number, now = Date.now()): number {
  return Math.max(0, Math.ceil((endsAt - now) / 1000));
}

export function persistActiveState(s: ActiveSessionState): Promise<boolean> {
  return storage.setJSONLocal(KEYS.active, s);
}

export function clearActiveState(): Promise<void> {
  return storage.remove(KEYS.active);
}

/** Eine Entlastungswoche geht vor der Tagesform: ein Satz weniger und
 *  höchstens `ENTLASTUNG_LAST` der Last. */
export function withDeload(base: ReadinessScale, deloadActive: boolean): ReadinessScale {
  return deloadActive
    ? { setDelta: -1, loadMult: Math.min(base.loadMult, ENTLASTUNG_LAST), cap: true }
    : base;
}

/** Skalierung beim Einheiten-Start: Tagesform (Check-in) + laufender Deload. */
export function startScale(
  settings: AppSettings,
  readiness: Readiness | undefined | null,
): ReadinessScale {
  return withDeload(
    settings.autoregOn && readiness ? scaleFor(band(readiness.score)) : NEUTRAL_SCALE,
    deloadAktiv(settings),
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

/** Normale Vorbelegung: Aufwärmsätze (nur wenn `aufwaermen`) + leere
 *  Arbeitssätze mit Gewichtsvorschlag. */
function initSetsFor(
  ex: Exercise,
  sets: number,
  o: PrefillOpts,
  aufwaermen: boolean,
): SetEntry[] {
  const lp = o.lastPerf(ex.id);
  const startW =
    !lp && o.profile ? startWeight(ex, o.profile, { step: o.weightStep })?.w : undefined;
  const p = presc(ex, lp, {
    pause: pauseStufe(o.daysAgo),
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
    aufwaermen && ex.weighted && p.w && Number(p.w) > 0
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
  if (!ex.weighted || !isFinite(best) || best <= 0) return initSetsFor(ex, sets, o, true);
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

/** Vorbelegung für EIN Item (auch beim Tausch/Hinzufügen mitten in der
 *  Einheit). `aufwaermen`: bekommt die Übung Aufwärmsätze? Das entscheidet die
 *  Reihenfolge der Einheit (`aufwaermPlan`) — nur die erste gewichtete Übung
 *  je Muskel. Die Prüfung bringt ihre eigene Rampe mit. */
export function prefillFor(
  item: PlannedExercise,
  ex: Exercise,
  o: PrefillOpts,
  aufwaermen = true,
): SetEntry[] {
  if (ex.pattern === "cardio") return [{ weight: "", reps: "" }];
  return o.variant === "exam"
    ? examSetsFor(ex, item.sets, o)
    : initSetsFor(ex, item.sets, o, aufwaermen);
}

/** Aufwärmsatz-Plan einer Einheit, je Item in Reihenfolge. */
function aufwaermenJeItem(session: DailySession, byId: Map<string, Exercise>): boolean[] {
  return aufwaermPlan(session.items.map((it) => byId.get(it.exerciseId)));
}

/** Komplette Vorbelegung beim Einheiten-Start, je Item-Instanz-Id. */
export function prefillEntries(
  session: DailySession,
  o: PrefillOpts,
): Record<string, SetEntry[]> {
  const byId = new Map(o.allLib.map((e) => [e.id, e]));
  const warm = aufwaermenJeItem(session, byId);
  const out: Record<string, SetEntry[]> = {};
  session.items.forEach((it, i) => {
    const ex = byId.get(it.exerciseId);
    if (ex) out[it.id] = prefillFor(it, ex, { ...o, variant: session.variant }, warm[i]);
  });
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
  const aufwaermen = aufwaermenJeItem(next, byId);
  const out: Record<string, SetEntry[]> = {};
  for (const [idx, item] of next.items.entries()) {
    const ex = byId.get(item.exerciseId);
    if (!ex) continue;
    const opts: PrefillOpts = { ...o, variant: next.variant };
    const old = prev[item.id];
    const was = prevItems.get(item.id);
    if (!old || !was) {
      out[item.id] = prefillFor(item, ex, opts, aufwaermen[idx]);
      continue;
    }
    if (was.exerciseId !== item.exerciseId) {
      // Tausch: gefüllte Arbeitssätze bleiben, der Rest kommt frisch für die
      // neue Übung (deren Gewichtsvorschlag; alte Warmups wären irreführend).
      const filled = old.filter((s) => !s.warmup && filledSet(s));
      if (!filled.length) {
        out[item.id] = prefillFor(item, ex, opts, aufwaermen[idx]);
        continue;
      }
      const freshWork = prefillFor(item, ex, opts, false).filter((s) => !s.warmup);
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
  /** Einstieg nach einer Trainingslücke (ab 14 Tagen ruhig, ab 28 leichter). */
  pause?: PauseStufe;
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
    pause: ctx.pause,
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
