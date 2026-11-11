import { AtlasFehler, alsAtlasFehler, atlasJson } from "@/lib/atlas/call";
import { atlasEingang, fehlerAntwort, text } from "@/lib/atlas/eingang";
import { COACH_REACT_SCHEMA, LIVE_RULES, sanitizeCoachReact } from "@/lib/atlas/live-tool";
import { atlasSystem } from "@/lib/atlas/prompts";
import { TRANSKRIPT_MAX } from "@/lib/atlas/transcript";

// Needs the Node runtime for the Anthropic SDK.
export const runtime = "nodejs";
export const maxDuration = 60;

interface SetReqBody {
  /** Kompaktes Transkript der Einheit (client-seitig aus dem Live-Stand). */
  transcript?: string;
  /** Profil-Zeile (athletePersona). */
  persona?: string;
}

/** Reaktion auf einen Satz: schnelles Modell, feste Form, hart begrenzt. */
export async function POST(req: Request) {
  const ein = await atlasEingang<SetReqBody>(req, "set", 30);
  if (!ein.ok) return ein.antwort;
  const { body, apiKey } = ein;

  // Dieselbe Grenze wie beim Bauen des Transkripts: der aktuelle Satz steht
  // am Ende und darf hier nicht abgeschnitten werden.
  const transcript = text(body.transcript, TRANSKRIPT_MAX).trim();
  if (!transcript) {
    return Response.json(
      { ok: false, fehler: "anfrage", error: "Kein Transkript." },
      { status: 400 },
    );
  }
  const persona = text(body.persona, 400);

  try {
    const { wert } = await atlasJson({
      apiKey,
      aufgabe: "satz",
      system: atlasSystem([LIVE_RULES, persona].filter(Boolean).join("\n\n")),
      messages: [{ role: "user", content: transcript }],
      schema: COACH_REACT_SCHEMA,
      signal: req.signal,
    });
    const call = sanitizeCoachReact(wert);
    if (!call) throw new AtlasFehler("unbrauchbar", "keine Ansage");
    return Response.json({ ok: true, call });
  } catch (e) {
    return fehlerAntwort(alsAtlasFehler(e).art);
  }
}
