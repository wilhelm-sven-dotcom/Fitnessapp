import Anthropic from "@anthropic-ai/sdk";
import {
  BUILD_SESSION_TOOL,
  buildSessionSystem,
  sanitizeAiDay,
  type CoachExercise,
} from "@/lib/coach-session";

// Needs the Node runtime for the Anthropic SDK.
export const runtime = "nodejs";

interface SessionReqBody {
  minutes?: number;
  focus?: string;
  exercises?: CoachExercise[];
  context?: string;
  /** Profile-derived persona line (built client-side from the athlete profile). */
  persona?: string;
}

export async function POST(req: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return Response.json({ configured: false });

  let body: SessionReqBody;
  try {
    body = (await req.json()) as SessionReqBody;
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
  if (!exercises.length) {
    return Response.json(
      { ok: false, error: "Keine passenden Übungen fürs aktive Gym." },
      { status: 400 },
    );
  }

  const minutes = Number.isFinite(body.minutes)
    ? Math.max(10, Math.min(90, Math.round(Number(body.minutes))))
    : 25;
  const focus = typeof body.focus === "string" ? body.focus.slice(0, 40) : "";

  const system =
    buildSessionSystem(exercises, minutes, focus, body.persona?.trim() || undefined) +
    "\n\nAktuelle Trainingsdaten:\n" +
    ((body.context ?? "").trim() || "keine");

  const client = new Anthropic({ apiKey });
  try {
    const msg = await client.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 1024,
      system,
      tools: [BUILD_SESSION_TOOL],
      tool_choice: { type: "tool", name: "build_session" },
      messages: [
        {
          role: "user",
          content: `Stell mir eine Trainingseinheit zusammen: Fokus ${focus || "Ganzkörper"}, etwa ${minutes} Minuten, nur mit den verfügbaren Übungen.`,
        },
      ],
    });

    const block = msg.content.find((b) => b.type === "tool_use");
    if (!block || block.type !== "tool_use") {
      return Response.json(
        { ok: false, error: "Der Coach hat keinen Vorschlag geliefert." },
        { status: 502 },
      );
    }

    const day = sanitizeAiDay(
      block.input,
      exercises.map((e) => e.id),
    );
    if (!day) {
      return Response.json(
        { ok: false, error: "Der Vorschlag war unbrauchbar. Versuch es nochmal." },
        { status: 422 },
      );
    }
    return Response.json({ ok: true, day });
  } catch {
    return Response.json(
      { ok: false, error: "Coach gerade nicht erreichbar. Versuch es gleich nochmal." },
      { status: 502 },
    );
  }
}
