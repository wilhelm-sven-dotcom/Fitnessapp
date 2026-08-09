import Anthropic from "@anthropic-ai/sdk";
import { ATLAS_MODEL } from "@/lib/atlas/models";
import { atlasSystem } from "@/lib/atlas/prompts";
import { textStreamResponse } from "@/lib/atlas/stream";
import { allowRequest, clientKey } from "@/lib/rate-limit";

// Needs the Node runtime for the Anthropic SDK and a long-lived stream.
export const runtime = "nodejs";

const RAPPORT_RULES = `Schreibe den Wochen-Rapport für deinen Athleten — unten stehen die Fakten der Woche. Form: 4–6 kurze Sätze Fließtext (keine Listen, keine Überschriften). Inhalt: was die Woche wirklich war (mit 1–2 echten Zahlen), was auffiel, und der klare Fokus für die kommende Woche. Bezieh dich, wenn vorhanden, auf die Missions-Bilanz. Keine Floskeln, Du-Form.`;

interface BriefingBody {
  facts?: string;
  persona?: string;
}

export async function POST(req: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return Response.json({ configured: false });
  if (!allowRequest(`atlas-briefing:${clientKey(req)}`, 6, 60_000)) {
    return Response.json(
      { error: "Zu viele Anfragen — kurz warten." },
      { status: 429 },
    );
  }

  let body: BriefingBody;
  try {
    body = (await req.json()) as BriefingBody;
  } catch {
    return Response.json({ error: "bad request" }, { status: 400 });
  }
  const facts = (body.facts ?? "").toString().slice(0, 9000).trim();
  if (!facts) return Response.json({ error: "no facts" }, { status: 400 });
  const persona = (body.persona ?? "").toString().slice(0, 400);

  const dynamic = [RAPPORT_RULES, persona].filter(Boolean).join("\n\n");
  const client = new Anthropic({ apiKey });
  const stream = client.messages.stream({
    model: ATLAS_MODEL,
    max_tokens: 600,
    system: atlasSystem(dynamic),
    messages: [{ role: "user", content: facts }],
  });
  return textStreamResponse(stream);
}
