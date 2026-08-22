import { buildCoachContext } from "@/lib/coach-context";
import { reqOk } from "@/lib/progression";
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
    if (names) lines.push(`- ${s.date.slice(0, 10)}: ${names}`);
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
}

/**
 * Warum die Anfrage scheiterte — der Aufrufer soll es SAGEN können.
 * Vorher lieferte diese Funktion für jeden Fall `null`: offline, Rate-Limit,
 * Timeout und „kein Key“ waren ununterscheidbar, und der Nutzer sah bloß
 * „ATLAS war nicht erreichbar“, während er in Wahrheit im Stundenlimit hing.
 *
 * `abgebrochen` ist KEIN Fehler: so endet jede Anfrage, die von einer neueren
 * verdrängt wurde (Weiterklicken am Zeitregler) — dazu gehört keine Meldung.
 */
export type AtlasFehler = "limit" | "zeit" | "netz" | "aus" | "abgebrochen";

export type AtlasSessionErgebnis =
  | { session: DailySession }
  | { fehler: AtlasFehler };

/** Ruft /api/atlas/session. Wirft NIE — jeder Ausgang kommt als Ergebnis
 *  zurück, damit der Aufrufer seinen Ladezustand sicher beenden kann. */
export async function requestAtlasSession(
  req: AtlasSessionRequest,
  opts: { timeoutMs?: number; signal?: AbortSignal } = {},
): Promise<AtlasSessionErgebnis> {
  // Der Timeout lag bei 25 s und damit UNTER der echten Laufzeit einer
  // Komposition (Opus, ungestreamt, 20–60 s) — er hat funktionierende
  // Anfragen abgeschnitten. Gefahrlos höher: der Basisplan steht längst,
  // und die Oberfläche ist währenddessen nicht gesperrt.
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), opts.timeoutMs ?? 60_000);
  const weiterreichen = () => ctrl.abort();
  opts.signal?.addEventListener("abort", weiterreichen);
  const vonAussen = () => opts.signal?.aborted === true;
  try {
    if (typeof navigator !== "undefined" && !navigator.onLine)
      return { fehler: "netz" };
    const avail = availableExercises(req.allLib, req.has, req.disabled);
    if (avail.length < 5) return { fehler: "aus" };

    const contextParts = [
      buildCoachContext({
        log: req.log,
        allLib: req.allLib,
        body: req.body,
        cardio: req.cardio,
        exerciseNotes: req.exerciseNotes,
      }),
      recentUseBlock(req.log, req.allLib),
      req.readinessLine ?? "",
      req.backSafe
        ? "WICHTIG: Rückenschonung aktiv — keine belasteten Beugen/Hinges, Core als Stabilisation."
        : "",
    ].filter(Boolean);

    const res = await fetch("/api/atlas/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: ctrl.signal,
      body: JSON.stringify({
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
      }),
    });
    if (res.status === 429) return { fehler: "limit" };
    if (!res.ok) return { fehler: "netz" };
    const data = (await res.json()) as {
      ok?: boolean;
      configured?: boolean;
      session?: {
        name: string;
        focus: string;
        briefing: string;
        items: DailySession["items"];
      };
    };
    if (data.configured === false) return { fehler: "aus" };
    if (!data.ok || !data.session?.items?.length) return { fehler: "netz" };
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
    return { fehler: vonAussen() ? "abgebrochen" : "zeit" };
  } finally {
    clearTimeout(t);
    opts.signal?.removeEventListener("abort", weiterreichen);
  }
}
