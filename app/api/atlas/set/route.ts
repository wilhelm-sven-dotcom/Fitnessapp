import Anthropic from "@anthropic-ai/sdk";
import { ATLAS_FAST_MODEL } from "@/lib/atlas/models";
import { atlasSystem } from "@/lib/atlas/prompts";
import {
  COACH_REACT_TOOL,
  LIVE_RULES,
  sanitizeCoachReact,
} from "@/lib/atlas/live-tool";
import { allowRequest, clientKey } from "@/lib/rate-limit";

// Needs the Node runtime for the Anthropic SDK.
export const runtime = "nodejs";

interface SetReqBody {
  /** Kompaktes Session-Transkript (client-seitig aus dem Live-State gebaut). */
  transcript?: string;
  /** Profil-Zeile (athletePersona). */
  persona?: string;
}

/** Live-Reaktion auf einen Satz: schnelles Modell, forced tool, hart limitiert. */
export async function POST(req: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return Response.json({ configured: false });
  if (!allowRequest(`atlas-set:${clientKey(req)}`, 30, 60_000)) {
    return Response.json(
      { ok: false, error: "Zu viele Anfragen — kurz warten." },
      { status: 429 },
    );
  }

  let body: SetReqBody;
  try {
    body = (await req.json()) as SetReqBody;
  } catch {
    return Response.json({ ok: false, error: "Ungültige Anfrage." }, { status: 400 });
  }
  const transcript = (body.transcript ?? "").toString().slice(0, 4500).trim();
  if (!transcript) {
    return Response.json({ ok: false, error: "Kein Transkript." }, { status: 400 });
  }
  const persona = (body.persona ?? "").toString().slice(0, 400);

  const dynamic = [LIVE_RULES, persona].filter(Boolean).join("\n\n");

  const client = new Anthropic({ apiKey });
  try {
    const msg = await client.messages.create({
      model: ATLAS_FAST_MODEL,
      max_tokens: 300,
      system: atlasSystem(dynamic),
      tools: [COACH_REACT_TOOL],
      tool_choice: { type: "tool", name: "coach_react" },
      messages: [{ role: "user", content: transcript }],
    });
    const block = msg.content.find((b) => b.type === "tool_use");
    const call =
      block && block.type === "tool_use" ? sanitizeCoachReact(block.input) : null;
    if (!call) {
      return Response.json({ ok: false, error: "Keine Reaktion." }, { status: 502 });
    }
    return Response.json({ ok: true, call });
  } catch {
    return Response.json(
      { ok: false, error: "ATLAS gerade nicht erreichbar." },
      { status: 502 },
    );
  }
}
