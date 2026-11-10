import { atlasTextAntwort } from "@/lib/atlas/call";
import { atlasEingang, heuteZeile, text } from "@/lib/atlas/eingang";
import { atlasSystem } from "@/lib/atlas/prompts";

// Needs the Node runtime for the Anthropic SDK and a long-lived stream.
export const runtime = "nodejs";
export const maxDuration = 300;

const RAPPORT_RULES = `Schreib den Wochen-Rückblick für deinen Athleten; die Nachricht enthält die Fakten der Woche. Vier bis sechs Sätze Fließtext, ohne Listen und Überschriften (die App zeigt ihn als einen Absatz in einer Karte). Inhalt: was die Woche war, mit ein bis zwei echten Zahlen, was auffiel, und der klare Schwerpunkt für die kommende Woche. Steht eine Bilanz der Wochen-Mission in den Fakten, geh darauf ein.`;

interface BriefingBody {
  facts?: string;
  persona?: string;
  /** Datum des Geräts, JJJJ-MM-TT. */
  datum?: string;
}

export async function POST(req: Request) {
  const ein = await atlasEingang<BriefingBody>(req, "briefing", 6);
  if (!ein.ok) return ein.antwort;
  const { body, apiKey, v2 } = ein;

  const facts = text(body.facts, 9000).trim();
  if (!facts) {
    return Response.json(
      { ok: false, fehler: "anfrage", error: "Keine Fakten." },
      { status: 400 },
    );
  }

  const dynamic = [RAPPORT_RULES, heuteZeile(body.datum), text(body.persona, 400)]
    .filter(Boolean)
    .join("\n\n");
  return atlasTextAntwort({
    apiKey,
    aufgabe: "bericht",
    system: atlasSystem(dynamic),
    messages: [{ role: "user", content: facts }],
    signal: req.signal,
    v2,
  });
}
