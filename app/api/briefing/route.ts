import Anthropic from "@anthropic-ai/sdk";
import { TRAINING_PRINCIPLES } from "@/lib/training-science";

// Node runtime for the Anthropic SDK + a long-lived stream.
export const runtime = "nodejs";

const SYSTEM_BASE = `Du bist ATLAS — der überwachende KI-Trainer dieser Fitness-App — und schreibst den wöchentlichen ATLAS-Rapport, wie das Editorial in einem Trainingsmagazin. Ton: präzise, fordernd, respektvoll; kurze Sätze, keine Floskeln.

Aufgabe: Schreib genau ZWEI kurze Absätze auf Deutsch, du-Form.
1) Rückblick auf die Woche — beziehe dich auf die echten Zahlen unten (Einheiten, Volumen, Rekorde, Belastung). Hol das Wichtigste hervor, nicht alles. Steht unten eine Wochen-Mission, bewerte sie in EINEM Satz: erfüllt oder nicht — ohne Ausreden.
2) Ein klarer Fokus für nächste Woche — konkret und umsetzbar (Phase/Deload, zu kurz gekommene Muskeln, Progression).

Maximal ~110 Wörter gesamt. Keine Überschriften, keine Aufzählungszeichen, keine Anrede-Floskel wie „Hey". Kein Markdown.

Sicherheit: Du bist kein Arzt. War der untere Rücken zweimal in Folge „rot", rate klar zu Arzt/Physio.`;

const DEFAULT_PERSONA = "Profil: erfahrener Hypertrophie-Athlet, empfindlicher unterer Rücken.";

interface BriefingBody {
  facts?: string;
  persona?: string;
}

export async function POST(req: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return Response.json({ configured: false });

  let body: BriefingBody;
  try {
    body = (await req.json()) as BriefingBody;
  } catch {
    return Response.json({ error: "bad request" }, { status: 400 });
  }

  const system =
    SYSTEM_BASE +
    "\n\n" +
    (body.persona?.trim() || DEFAULT_PERSONA) +
    "\n\n" +
    TRAINING_PRINCIPLES +
    "\n\nDaten dieser Woche:\n" +
    (body.facts?.trim() || "keine");

  const client = new Anthropic({ apiKey });
  const stream = client.messages.stream({
    model: "claude-opus-4-8",
    max_tokens: 512,
    system,
    messages: [{ role: "user", content: "Schreib das Wochen-Briefing." }],
  });

  const encoder = new TextEncoder();
  const readable = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const event of stream) {
          if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
            controller.enqueue(encoder.encode(event.delta.text));
          }
        }
      } catch {
        controller.enqueue(encoder.encode("__ERROR__"));
      } finally {
        controller.close();
      }
    },
    cancel() {
      stream.abort();
    },
  });

  return new Response(readable, {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
  });
}
