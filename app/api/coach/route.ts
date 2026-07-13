import Anthropic from "@anthropic-ai/sdk";
import { TRAINING_PRINCIPLES } from "@/lib/training-science";

// Needs the Node runtime for the Anthropic SDK and a long-lived stream.
export const runtime = "nodejs";

const SYSTEM_BASE = `Du bist ATLAS — der überwachende KI-Trainer dieser Fitness-App. Du kennst die heutige Direktive, die Wochen-Mission und die Wache des Athleten (im Kontext unter „ATLAS-Status") und beziehst dich konkret darauf, wenn es zur Frage passt.

Ton: präzise, fordernd, respektvoll, deutsch, „du". Kurz und konkret — keine Romane, keine Floskeln, kein Smalltalk. Beziehe dich auf die echten Daten unten, statt allgemein zu reden. Nenne, wenn sinnvoll, konkrete Zahlen (Gewicht, Sätze, Wiederholungen).

Sicherheit: Du bist kein Arzt. War der untere Rücken zweimal in Folge „rot", rate klar zu Arzt oder Physiotherapie statt zu Trainingstipps. Bei Schmerzen immer zu ärztlichem Rat raten.

Plan-Treue: Steht im Kontext eine „Nächste geplante Einheit", ist das der echte Plan der App — der Athlet sieht beim Trainingsstart exakt diese Übungen. Wenn du Übungen für die nächste Einheit oder die kommende Woche empfiehlst (z. B. im Wochen-Recap), nenne AUSSCHLIESSLICH Übungen aus diesem Plan oder aus den protokollierten Einheiten. Erfinde keine Übungen, die dort nicht vorkommen; eine Umbau-Idee kennzeichne ausdrücklich als Vorschlag („Tausch-Idee"), nicht als Plan.

Begriffe: RIR heißt „Reps in Reserve" — wie viele Wiederholungen nach dem Satz noch im Tank waren, NICHT die Zahl der gemachten Wiederholungen.

Ausdauer/Strava: Wenn unten Ausdauer-Einheiten (Läufe, Intervalle, Rad-/Peloton-Fahrten — inkl. Distanz, Kalorien, Puls) stehen, plane sie aktiv mit ein. Eine harte Einheit in den letzten ~24 h vor einem bein-lastigen Tag (Kniebeuge/Ausfallschritt/Hüfte) → empfiehl, die Beine heute leichter zu nehmen oder den Oberkörper vorzuziehen. Achte auf die Wochenbalance Kraft vs. Ausdauer und auf Erholung; gib bei Bedarf eine klare Empfehlung „heute Ausdauer vs. heben".`;

const DEFAULT_PERSONA = "Profil: erfahrener Hypertrophie-Athlet, empfindlicher unterer Rücken.";

interface CoachBody {
  messages?: { role: "user" | "assistant"; content: string }[];
  context?: string;
  /** Profile-derived persona line (built client-side from the athlete profile). */
  persona?: string;
}

export async function POST(req: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return Response.json({ configured: false });

  let body: CoachBody;
  try {
    body = (await req.json()) as CoachBody;
  } catch {
    return Response.json({ error: "bad request" }, { status: 400 });
  }

  const messages = (body.messages ?? [])
    .filter((m) => m && typeof m.content === "string" && m.content.trim())
    .map((m) => ({ role: m.role, content: m.content }));
  if (!messages.length) {
    return Response.json({ error: "no messages" }, { status: 400 });
  }

  const system =
    SYSTEM_BASE +
    "\n\n" +
    (body.persona?.trim() || DEFAULT_PERSONA) +
    "\n\n" +
    TRAINING_PRINCIPLES +
    "\n\nAktuelle Trainingsdaten:\n" +
    (body.context?.trim() || "keine");

  const client = new Anthropic({ apiKey });
  const stream = client.messages.stream({
    model: "claude-opus-4-8",
    max_tokens: 1024,
    system,
    messages,
  });

  const encoder = new TextEncoder();
  const readable = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const event of stream) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            controller.enqueue(encoder.encode(event.delta.text));
          }
        }
      } catch {
        controller.enqueue(
          encoder.encode(
            "\n\n(Es gab ein Problem mit dem Coach. Versuch es gleich nochmal.)",
          ),
        );
      } finally {
        controller.close();
      }
    },
    cancel() {
      stream.abort();
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
