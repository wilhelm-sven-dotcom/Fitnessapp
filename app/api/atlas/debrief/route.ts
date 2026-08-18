import Anthropic from "@anthropic-ai/sdk";
import { ATLAS_MODEL } from "@/lib/atlas/models";
import { atlasSystem } from "@/lib/atlas/prompts";
import { textStreamResponse } from "@/lib/atlas/stream";
import { allowRequest, clientKey } from "@/lib/rate-limit";

// Needs the Node runtime for the Anthropic SDK and a long-lived stream.
export const runtime = "nodejs";

const DEBRIEF_RULES = `Der Athlet hat GERADE eine Einheit beendet — unten stehen die Fakten. Gib dein Debrief: GENAU drei kurze Zeilen, jede für sich stehend (durch Zeilenumbruch getrennt, ohne Nummerierung oder Spiegelstriche).
Zeile 1: das Urteil zur Einheit — konkret, mit einer echten Zahl.
Zeile 2: die wichtigste Beobachtung (stärkster Satz, auffälligster Verlauf, RIR-Muster).
Zeile 3: der eine Auftrag für die nächste Einheit.
Keine Floskeln, keine Emojis, Du-Form.`;

interface DebriefBody {
  facts?: string;
  persona?: string;
}

export async function POST(req: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return Response.json({ configured: false });
  if (!allowRequest(`atlas-debrief:${clientKey(req)}`, 10, 60_000)) {
    return Response.json(
      { error: "Zu viele Anfragen — kurz warten." },
      { status: 429 },
    );
  }

  let body: DebriefBody;
  try {
    body = (await req.json()) as DebriefBody;
  } catch {
    return Response.json({ error: "bad request" }, { status: 400 });
  }
  const facts = (body.facts ?? "").toString().slice(0, 3500).trim();
  if (!facts) return Response.json({ error: "no facts" }, { status: 400 });
  const persona = (body.persona ?? "").toString().slice(0, 400);

  const dynamic = [DEBRIEF_RULES, persona].filter(Boolean).join("\n\n");
  const client = new Anthropic({ apiKey });
  const stream = client.messages.stream({
    model: ATLAS_MODEL,
    max_tokens: 500,
    system: atlasSystem(dynamic),
    messages: [{ role: "user", content: facts }],
  });
  return textStreamResponse(stream);
}
