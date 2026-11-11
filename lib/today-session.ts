import { atlasKopf, fehlerAus, geraeteDatum } from "@/lib/atlas/client";
import type { AtlasFehlerArt } from "@/lib/atlas/fehler";
import { buildCoachContext, lageBlock } from "@/lib/coach-context";
import { fatigueState } from "@/lib/fatigue";
import type { PhaseState } from "@/lib/periodization";
import { reqOk, stressesInjury } from "@/lib/progression";
import { muscleOf, MUSCLE_LABEL } from "@/lib/volume";
import type { DailySession, SessionVariant } from "@/lib/session-model";
import type {
  BodyMetric,
  CardioSession,
  Exercise,
  LoggedSession,
} from "@/lib/types";

/**
 * Client-Orchestrierung der ATLAS-Komposition: Payload bauen, Endpunkt rufen,
 * Antwort in eine DailySession heben. Der Aufrufer (Heute-Seite) zeigt sofort
 * den deterministischen Fallback und ersetzt ihn, wenn ATLAS antwortet.
 */

/** Übungen, die heute wählbar sind: Equipment-gefiltert, ohne Cardio-Blöcke,
 *  ohne vom Nutzer deaktivierte Übungen. */
export function availableExercises(
  allLib: Exercise[],
  has: (k: string) => boolean,
  disabled?: readonly string[],
): Exercise[] {
  const blocked = disabled?.length ? new Set(disabled) : undefined;
  return allLib.filter(
    (e) => e.pattern !== "cardio" && reqOk(e, has) && !blocked?.has(e.id),
  );
}

/** Kompakte Zuletzt-verwendet-Zeilen — ATLAS soll NICHT dieselbe Einheit
 *  wiederholen und bekommt dafür die jüngste Übungs-Historie. */
function recentUseBlock(log: LoggedSession[], allLib: Exercise[]): string {
  const byId = new Map(allLib.map((e) => [e.id, e]));
  const lines: string[] = [];
  for (const s of log.slice(-4).reverse()) {
    const names = (s.exercises ?? [])
      .map((e) => byId.get(e.id)?.name ?? e.name)
      .slice(0, 8)
      .join(", ");
    // Ort mitschreiben: wer zwischen Zuhause und Studio wechselt, hat je Ort
    // andere Übungen — ATLAS soll das nicht für Willkür halten.
    if (names) lines.push(`- ${s.date.slice(0, 10)}${s.ort ? ` (${s.ort})` : ""}: ${names}`);
  }
  return lines.length ? `Zuletzt trainierte Übungen:\n${lines.join("\n")}` : "";
}

export interface AtlasSessionRequest {
  allLib: Exercise[];
  has: (k: string) => boolean;
  log: LoggedSession[];
  body: BodyMetric[];
  cardio: CardioSession[];
  exerciseNotes?: Record<string, string>;
  budgetMin: number;
  wish?: string;
  variant?: SessionVariant;
  backSafe?: boolean;
  persona?: string;
  readinessLine?: string;
  /** Vom Nutzer deaktivierte Übungs-Ids — landen nicht im ATLAS-Pool. */
  disabled?: string[];
  /** Trainingsort heute (Name + Geräte-Namen) — für Begründung und Briefing;
   *  die harte Grenze bleibt `availableIds`. */
  ort?: { name: string; geraete: string[]; nurGeraete?: boolean };
  /** Stand im Trainingsblock und laufende Entlastungswoche (lib/coach-context.ts). */
  phase?: PhaseState;
  deloadActive?: boolean;
}

/**
 * Warum die Anfrage scheiterte — der Aufrufer soll es SAGEN können. Die Arten
 * kommen vom Server (lib/atlas/fehler.ts); dazu `zeit`, wenn die Oberfläche
 * selbst nicht länger gewartet hat.
 *
 * `abgebrochen` ist KEIN Fehler: so endet jede Anfrage, die von einer neueren
 * verdrängt wurde (Weiterklicken am Zeitregler) — dazu gehört keine Meldung.
 */
export type AtlasFehler = AtlasFehlerArt | "zeit";

export type AtlasSessionErgebnis =
  | { session: DailySession }
  | { fehler: AtlasFehler };

/** Ruft /api/atlas/session. Wirft NIE — jeder Ausgang kommt als Ergebnis
 *  zurück, damit der Aufrufer seinen Ladezustand sicher beenden kann. */
export async function requestAtlasSession(
  req: AtlasSessionRequest,
  opts: { timeoutMs?: number; signal?: AbortSignal } = {},
): Promise<AtlasSessionErgebnis> {
  // Ein Plan mit Nachdenken braucht 20 s bis über eine Minute. Die Geduld
  // darf darüber liegen: der Basisplan steht längst, und die Oberfläche ist
  // währenddessen nicht gesperrt.
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), opts.timeoutMs ?? 120_000);
  const weiterreichen = () => ctrl.abort();
  opts.signal?.addEventListener("abort", weiterreichen);
  const vonAussen = () => opts.signal?.aborted === true;
  try {
    if (typeof navigator !== "undefined" && !navigator.onLine)
      return { fehler: "netz" };
    let avail = availableExercises(req.allLib, req.has, req.disabled);
    if (avail.length < 5) return { fehler: "aus" };
    // Rückenschonung ist eine harte Grenze, kein Hinweis im Prompt: was den
    // unteren Rücken belastet, steht heute gar nicht erst zur Wahl (solange
    // genug übrig bleibt).
    if (req.backSafe) {
      const schonend = avail.filter((e) => !stressesInjury(e, "rücken"));
      if (schonend.length >= 5) avail = schonend;
    }

    const contextParts = [
      buildCoachContext({
        log: req.log,
        allLib: req.allLib,
        body: req.body,
        cardio: req.cardio,
        exerciseNotes: req.exerciseNotes,
      }),
      recentUseBlock(req.log, req.allLib),
      lageBlock({
        phase: req.phase,
        deloadActive: req.deloadActive,
        fatigue: fatigueState(req.log, req.cardio),
      }),
      req.readinessLine ?? "",
      req.backSafe
        ? "Rückenschonung aktiv: Belastete Kniebeugen und Hüftbeugen stehen heute nicht zur Wahl, der Rumpf arbeitet stabilisierend."
        : "",
    ].filter(Boolean);

    const res = await fetch("/api/atlas/session", {
      method: "POST",
      headers: atlasKopf(),
      signal: ctrl.signal,
      body: JSON.stringify({
        datum: geraeteDatum(),
        availableIds: avail.map((e) => e.id),
        customExercises: avail
          .filter((e) => e.custom)
          .map((e) => {
            const m = muscleOf(e);
            return {
              id: e.id,
              name: e.name,
              pattern: e.pattern,
              muscle: MUSCLE_LABEL[m.primary],
            };
          }),
        budgetMin: req.budgetMin,
        wish: req.wish,
        variant: req.variant ?? "normal",
        context: contextParts.join("\n\n"),
        persona: req.persona,
        ort: req.ort,
      }),
    });
    const data = (await res.json().catch(() => null)) as {
      ok?: boolean;
      configured?: boolean;
      fehler?: unknown;
      session?: {
        name: string;
        focus: string;
        briefing: string;
        items: DailySession["items"];
      };
    } | null;
    if (!res.ok || !data?.ok) return { fehler: fehlerAus(res.status, data) };
    if (!data.session?.items?.length) return { fehler: "unbrauchbar" };
    const now = new Date();
    const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    return {
      session: {
        id: `today-${date}-${Date.now() % 100000}`,
        date,
        name: data.session.name,
        focus: data.session.focus,
        briefing: data.session.briefing,
        items: data.session.items,
        source: "atlas",
        wish: req.wish || undefined,
        variant: req.variant ?? "normal",
        createdAt: now.toISOString(),
        schemaVersion: 1,
      },
    };
  } catch {
    // Der ganze Rumpf liegt im try — vorher standen availableExercises,
    // buildCoachContext und recentUseBlock DAVOR und konnten die Promise
    // rejecten; dann blieb der Ladezustand des Aufrufers für immer stehen.
    // Abbruch von außen, eigene Geduld zu Ende, oder die Verbindung riss ab.
    return { fehler: vonAussen() ? "abgebrochen" : ctrl.signal.aborted ? "zeit" : "netz" };
  } finally {
    clearTimeout(t);
    opts.signal?.removeEventListener("abort", weiterreichen);
  }
}
