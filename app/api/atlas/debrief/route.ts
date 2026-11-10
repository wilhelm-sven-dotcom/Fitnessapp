import { atlasTextAntwort } from "@/lib/atlas/call";
import { atlasEingang, text } from "@/lib/atlas/eingang";
import { atlasSystem } from "@/lib/atlas/prompts";

// Needs the Node runtime for the Anthropic SDK and a long-lived stream.
export const runtime = "nodejs";
export const maxDuration = 120;

const DEBRIEF_RULES = `Der Athlet hat gerade eine Einheit beendet; die Nachricht enthält die Fakten. Schreib dein Fazit als genau drei kurze Zeilen, jede in einer eigenen Zeile, ohne Nummern und ohne Spiegelstriche. Die App zeigt diese drei Zeilen untereinander auf dem Abschlussbild.
Zeile 1: dein Urteil zur Einheit, mit einer echten Zahl.
Zeile 2: die wichtigste Beobachtung (stärkster Satz, auffälligster Verlauf, Muster beim RIR).
Zeile 3: der eine Auftrag für die nächste Einheit.`;

interface DebriefBody {
  facts?: string;
  persona?: string;
}

export async function POST(req: Request) {
  const ein = await atlasEingang<DebriefBody>(req, "debrief", 10);
  if (!ein.ok) return ein.antwort;
  const { body, apiKey, v2 } = ein;

  const facts = text(body.facts, 3500).trim();
  if (!facts) {
    return Response.json(
      { ok: false, fehler: "anfrage", error: "Keine Fakten." },
      { status: 400 },
    );
  }

  return atlasTextAntwort({
    apiKey,
    aufgabe: "auswertung",
    system: atlasSystem([DEBRIEF_RULES, text(body.persona, 400)].filter(Boolean).join("\n\n")),
    messages: [{ role: "user", content: facts }],
    signal: req.signal,
    v2,
  });
}
