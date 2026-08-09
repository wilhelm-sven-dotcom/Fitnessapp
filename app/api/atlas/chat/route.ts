import Anthropic from "@anthropic-ai/sdk";
import { ATLAS_MODEL } from "@/lib/atlas/models";
import { atlasSystem } from "@/lib/atlas/prompts";
import { textStreamResponse } from "@/lib/atlas/stream";
import { allowRequest, clientKey } from "@/lib/rate-limit";

// Needs the Node runtime for the Anthropic SDK and a long-lived stream.
export const runtime = "nodejs";

/** Chat-Regeln — dynamischer Block nach dem gecachten Präfix. */
const CHAT_RULES = `Du bist im Gespräch mit deinem Athleten. Kurz und konkret antworten — keine Romane, keine Floskeln, kein Smalltalk. Beziehe dich auf die echten Daten unten; nenne, wenn sinnvoll, konkrete Zahlen (Gewicht, Sätze, Wiederholungen).

Sicherheit: Du bist kein Arzt. War der untere Rücken zweimal in Folge „rot", rate klar zu Arzt oder Physiotherapie statt zu Trainingstipps. Bei Schmerzen immer zu ärztlichem Rat raten.

Plan-Treue: Die heutige Einheit komponierst DU (im Kontext als „Heutige Einheit" bzw. „Nächste geplante Einheit"). Empfiehlst du Übungen, nimm sie aus dem Katalog oder den protokollierten Einheiten — erfinde nichts außerhalb davon. Umbau-Ideen kennzeichne als Vorschlag; umgesetzt wird auf der Startseite (Wunsch-Feld oder Bearbeiten).

Begriffe: RIR heißt „Reps in Reserve" — wie viele Wiederholungen nach dem Satz noch im Tank waren, NICHT die Zahl der gemachten Wiederholungen.

Hilfsmittel: Stehen im Kontext Hilfsmittel-Notizen je Übung (z. B. „Unterstützungsband" = assistierte, leichtere Ausführung), berücksichtige sie — Leistungen mit und ohne Hilfsmittel sind nicht 1:1 vergleichbar.

Ausdauer/Strava: Stehen unten Ausdauer-Einheiten (Läufe, Intervalle, Fahrten), plane sie aktiv mit ein: harte Fahrt < 24 h vor einem beinlastigen Tag → Beine leichter oder Oberkörper vorziehen. Achte auf Wochenbalance Kraft vs. Ausdauer.`;

interface ChatBody {
  messages?: { role: "user" | "assistant"; content: string }[];
  context?: string;
  /** Profil-Zeile (athletePersona). */
  persona?: string;
}

export async function POST(req: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return Response.json({ configured: false });
  if (!allowRequest(`atlas-chat:${clientKey(req)}`, 20, 60_000)) {
    return Response.json(
      { error: "Zu viele Anfragen — kurz warten." },
      { status: 429 },
    );
  }

  let body: ChatBody;
  try {
    body = (await req.json()) as ChatBody;
  } catch {
    return Response.json({ error: "bad request" }, { status: 400 });
  }

  const messages = (body.messages ?? [])
    .filter((m) => m && typeof m.content === "string" && m.content.trim())
    .slice(-16)
    .map((m) => ({
      role: m.role === "assistant" ? ("assistant" as const) : ("user" as const),
      content: m.content.slice(0, 4000),
    }));
  if (!messages.length) {
    return Response.json({ error: "no messages" }, { status: 400 });
  }

  const persona = (body.persona ?? "").toString().slice(0, 400);
  const context = (body.context ?? "").toString().slice(0, 9000);
  const dynamic = [
    CHAT_RULES,
    persona,
    `Aktuelle Trainingsdaten:\n${context.trim() || "keine"}`,
  ]
    .filter(Boolean)
    .join("\n\n");

  const client = new Anthropic({ apiKey });
  const stream = client.messages.stream({
    model: ATLAS_MODEL,
    max_tokens: 1024,
    system: atlasSystem(dynamic),
    messages,
  });
  return textStreamResponse(stream);
}
