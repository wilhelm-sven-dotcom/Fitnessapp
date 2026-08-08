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

/** Übungen, die heute wählbar sind: Equipment-gefiltert, ohne Cardio-Blöcke. */
export function availableExercises(
  allLib: Exercise[],
  has: (k: string) => boolean,
): Exercise[] {
  return allLib.filter((e) => e.pattern !== "cardio" && reqOk(e, has));
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
}

/** Ruft /api/atlas/session. `null` bei fehlendem Key, Offline, Timeout oder
 *  unbrauchbarer Antwort — der Aufrufer bleibt dann beim Fallback. */
export async function requestAtlasSession(
  req: AtlasSessionRequest,
  opts: { timeoutMs?: number } = {},
): Promise<DailySession | null> {
  if (typeof navigator !== "undefined" && !navigator.onLine) return null;
  const avail = availableExercises(req.allLib, req.has);
  if (avail.length < 5) return null;

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

  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), opts.timeoutMs ?? 25_000);
  try {
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
    if (!res.ok) return null;
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
    if (data.configured === false || !data.ok || !data.session?.items?.length)
      return null;
    const now = new Date();
    const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    return {
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
    };
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}
