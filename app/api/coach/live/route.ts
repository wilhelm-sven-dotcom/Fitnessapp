import Anthropic from "@anthropic-ai/sdk";
import { buildLiveSystem, COACH_CALL_TOOL, sanitizeCoachCall } from "@/lib/coach-live";

// Needs the Node runtime for the Anthropic SDK.
export const runtime = "nodejs";

interface LiveReqBody {
  /** Kompakter Live-Kontext der Session (clientseitig gebaut). */
  context?: string;
}

export async function POST(req: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return Response.json({ configured: false });

  let body: LiveReqBody;
  try {
    body = (await req.json()) as LiveReqBody;
  } catch {
    return Response.json({ ok: false, error: "Ungültige Anfrage." }, { status: 400 });
  }
  const context = (body.context ?? "").trim();
  if (!context || context.length > 4000) {
    return Response.json({ ok: false, error: "Kein Kontext." }, { status: 400 });
  }

  const client = new Anthropic({ apiKey });
  try {
    const msg = await client.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 300,
      system: buildLiveSystem(),
      tools: [COACH_CALL_TOOL],
      tool_choice: { type: "tool", name: "coach_call" },
      messages: [
        {
          role: "user",
          content: `Stand der Session:\n${context}\n\nDeine Ansage aus der Ringecke.`,
        },
      ],
    });
    const block = msg.content.find((b) => b.type === "tool_use");
    if (!block || block.type !== "tool_use") {
      return Response.json({ ok: false, error: "Keine Ansage." }, { status: 502 });
    }
    const call = sanitizeCoachCall(block.input);
    if (!call) {
      return Response.json({ ok: false, error: "Unbrauchbare Ansage." }, { status: 422 });
    }
    return Response.json({ ok: true, call });
  } catch {
    return Response.json(
      { ok: false, error: "ATLAS gerade nicht erreichbar." },
      { status: 502 },
    );
  }
}
