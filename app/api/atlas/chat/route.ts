import { atlasTextAntwort } from "@/lib/atlas/call";
import { atlasEingang, heuteZeile, text } from "@/lib/atlas/eingang";
import { atlasSystem } from "@/lib/atlas/prompts";

// Needs the Node runtime for the Anthropic SDK and a long-lived stream.
export const runtime = "nodejs";
export const maxDuration = 300;

/** Chat-Regeln — veränderlicher Block nach dem gecachten Präfix. Die fünf
 *  Zeilenanfänge der Protokollform müssen mit
 *  `components/coach/ProtokollBubble.tsx` übereinstimmen. */
const CHAT_RULES = `Du bist im Gespräch mit deinem Athleten. Antworte so lang, wie die Frage es braucht, meist ein paar Sätze. Stütz dich auf seine Daten unten und nenne Zahlen (Gewicht, Sätze, Wiederholungen), wo sie die Antwort tragen.

Protokollform: Wo es der Antwort hilft, gliedere sie in Zeilen, die mit „Beobachtung:“, „Einschätzung:“, „Plan:“, „Anpassung:“ oder „Hinweis:“ beginnen. Jede steht für sich, die App hebt sie hervor. Eine kurze Rückfrage oder ein einzelner Satz braucht das nicht.

Gesundheit: Du bist kein Arzt. Bei Schmerzen rätst du zu ärztlichem Rat. War der untere Rücken zweimal hintereinander „rot“, rätst du klar zu Arzt oder Physiotherapie statt zu Trainingstipps.

Plan: Die heutige Einheit stellst du zusammen; sie steht unten als „Nächste geplante Einheit“. Übungen empfiehlst du aus dem Katalog oder aus den protokollierten Einheiten, denn nur die kann die App übernehmen. Umbau-Ideen nennst du als Vorschlag; umgesetzt wird auf der Startseite über das Wunschfeld oder „Bearbeiten“.

RIR heißt „Reps in Reserve“: wie viele Wiederholungen nach dem Satz noch möglich gewesen wären, nicht die Zahl der gemachten.

Hilfsmittel: Stehen unten Notizen zu einer Übung (etwa „Unterstützungsband“ für eine assistierte, leichtere Ausführung), rechne sie ein. Leistungen mit und ohne Hilfsmittel sind nicht direkt vergleichbar.

Ausdauer: Stehen unten Läufe, Intervalle oder Fahrten, plane sie mit ein. Nach einer harten Ausdauer-Einheit in den letzten 24 Stunden die Beine leichter nehmen oder den Oberkörper vorziehen, und die Wochenbalance aus Kraft und Ausdauer im Blick behalten.`;

interface ChatBody {
  messages?: { role?: unknown; content?: unknown }[];
  context?: string;
  /** Profil-Zeile (athletePersona). */
  persona?: string;
  /** Datum des Geräts, JJJJ-MM-TT. */
  datum?: string;
}

export async function POST(req: Request) {
  const ein = await atlasEingang<ChatBody>(req, "chat", 20);
  if (!ein.ok) return ein.antwort;
  const { body, apiKey, v2 } = ein;

  const messages = (Array.isArray(body.messages) ? body.messages : [])
    .filter((m) => m && typeof m.content === "string" && m.content.trim())
    .slice(-16)
    .map((m) => ({
      role: m.role === "assistant" ? ("assistant" as const) : ("user" as const),
      content: (m.content as string).slice(0, 4000),
    }));
  // Die Unterhaltung muss mit einer Nutzer-Nachricht enden: ein offener
  // Assistenten-Text am Ende wäre ein Vorschreiben der Antwort, und das weisen
  // die Modelle ab.
  while (messages.length && messages[messages.length - 1].role === "assistant") messages.pop();
  while (messages.length && messages[0].role === "assistant") messages.shift();
  if (!messages.length) {
    return Response.json(
      { ok: false, fehler: "anfrage", error: "Keine Nachricht." },
      { status: 400 },
    );
  }

  const dynamic = [
    CHAT_RULES,
    heuteZeile(body.datum),
    text(body.persona, 400),
    `Aktuelle Trainingsdaten:\n${text(body.context, 9000).trim() || "keine"}`,
  ]
    .filter(Boolean)
    .join("\n\n");

  return atlasTextAntwort({
    apiKey,
    aufgabe: "chat",
    system: atlasSystem(dynamic),
    messages,
    signal: req.signal,
    v2,
  });
}
