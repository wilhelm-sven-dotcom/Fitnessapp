import Anthropic from "@anthropic-ai/sdk";
import type { CoachExercise } from "@/lib/coach-session";
import { buildWeekSystem, PLAN_WEEK_TOOL, sanitizeWeekPlan } from "@/lib/coach-week";
import { allowRequest, clientKey } from "@/lib/rate-limit";

// Needs the Node runtime for the Anthropic SDK.
export const runtime = "nodejs";

/** Konfigurations-Status für die Einstellungen (Key liegt nur auf dem Server). */
export async function GET() {
  return Response.json({ configured: !!process.env.ANTHROPIC_API_KEY });
}

interface WeekReqBody {
  weekKey?: string;
  budgetMin?: number;
  context?: string;
  exercises?: CoachExercise[];
}

export async function POST(req: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return Response.json({ configured: false });
  if (!allowRequest(`week:${clientKey(req)}`, 4, 60_000)) {
    return Response.json(
      { ok: false, error: "Zu viele Anfragen — kurz warten." },
      { status: 429 },
    );
  }

  let body: WeekReqBody;
  try {
    body = (await req.json()) as WeekReqBody;
  } catch {
    return Response.json({ ok: false, error: "Ungültige Anfrage." }, { status: 400 });
  }

  const exercises = (Array.isArray(body.exercises) ? body.exercises : []).filter(
    (e): e is CoachExercise =>
      !!e &&
      typeof e.id === "string" &&
      typeof e.name === "string" &&
      typeof e.pattern === "string",
  );
  if (exercises.length < 8) {
    return Response.json(
      { ok: false, error: "Zu wenige Übungen fürs aktive Gym." },
      { status: 400 },
    );
  }
  const weekKey = typeof body.weekKey === "string" ? body.weekKey.slice(0, 10) : "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(weekKey)) {
    return Response.json({ ok: false, error: "Ungültige Woche." }, { status: 400 });
  }
  const budgetMin = Number.isFinite(body.budgetMin)
    ? Math.max(15, Math.min(90, Math.round(Number(body.budgetMin))))
    : 25;

  const system =
    buildWeekSystem(exercises, budgetMin) +
    "\n\nAktuelle Trainingsdaten:\n" +
    ((body.context ?? "").trim() || "keine");

  const client = new Anthropic({ apiKey });
  try {
    const msg = await client.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 2048,
      system,
      tools: [PLAN_WEEK_TOOL],
      tool_choice: { type: "tool", name: "plan_week" },
      messages: [
        {
          role: "user",
          content:
            "Plane meine Trainingswoche (die laufende Woche): die drei Ganzkörper-Einheiten A, B und C — abwechslungsreich, auf meine Daten zugeschnitten, nur mit den verfügbaren Übungen.",
        },
      ],
    });

    const block = msg.content.find((b) => b.type === "tool_use");
    if (!block || block.type !== "tool_use") {
      return Response.json(
        { ok: false, error: "ATLAS hat keinen Plan geliefert." },
        { status: 502 },
      );
    }

    const plan = sanitizeWeekPlan(
      block.input,
      exercises.map((e) => e.id),
      weekKey,
    );
    if (!plan) {
      return Response.json(
        { ok: false, error: "Der Plan war unbrauchbar. Versuch es nochmal." },
        { status: 422 },
      );
    }
    return Response.json({ ok: true, plan });
  } catch {
    return Response.json(
      { ok: false, error: "ATLAS gerade nicht erreichbar. Versuch es gleich nochmal." },
      { status: 502 },
    );
  }
}
