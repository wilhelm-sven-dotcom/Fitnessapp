import type { BetaTextBlockParam } from "@anthropic-ai/sdk/resources/beta/messages/messages";
import { alsAtlasFehler, atlasJson } from "@/lib/atlas/call";
import { fehlerAntwort } from "@/lib/atlas/eingang";
import { AUFGABEN, modellUebersicht, type AtlasAufgabe } from "@/lib/atlas/models";
import { zugangErlaubt, zugangStatus } from "@/lib/atlas/zugang";
import { allowRequest, clientKey } from "@/lib/rate-limit";

// Needs the Node runtime for the Anthropic SDK.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

/**
 * Stand von ATLAS, ohne eine Anfrage an Claude: Ist ein Schlüssel hinterlegt,
 * welche Modelle gelten (und ob eine Umgebungsvariable die Vorgabe ersetzt),
 * braucht es einen Zugangscode und stimmt der mitgeschickte.
 */
export function GET(req: Request) {
  return Response.json(
    {
      configured: !!process.env.ANTHROPIC_API_KEY,
      modelle: modellUebersicht(),
      zugang: zugangStatus(req),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

const PROBE_SCHEMA = {
  type: "object",
  properties: { bereit: { type: "boolean" } },
  required: ["bereit"],
  additionalProperties: false,
};
const PROBE_SYSTEM: BetaTextBlockParam[] = [
  { type: "text", text: "Dies ist der Selbsttest einer Trainings-App. Antworte mit dem verlangten JSON." },
];

/**
 * Selbsttest („ATLAS testen“ in den Einstellungen): je eine kleinste Anfrage
 * an das Haupt- und das schnelle Modell, auf demselben Weg wie die echten
 * Routen (strukturierte Ausgabe, Ersatzmodell). Zeigt, welches Modell wirklich
 * antwortet, wie lange es braucht und woran es sonst scheitert.
 */
export async function POST(req: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return fehlerAntwort("aus");
  if (!zugangErlaubt(zugangStatus(req))) return fehlerAntwort("zugang");
  if (!allowRequest(`atlas-status:${clientKey(req)}`, 3, 60_000)) return fehlerAntwort("limit");

  const probe = async (aufgabe: AtlasAufgabe) => {
    const angefragt = AUFGABEN[aufgabe].model;
    const t0 = Date.now();
    try {
      const r = await atlasJson({
        apiKey,
        aufgabe,
        system: PROBE_SYSTEM,
        messages: [{ role: "user", content: "Bist du bereit?" }],
        schema: PROBE_SCHEMA,
        signal: req.signal,
      });
      return {
        ok: true as const,
        angefragt,
        geantwortet: r.model,
        ms: r.ms,
        ersatz: r.ersatz,
        ...(r.ersatzGrund ? { grund: r.ersatzGrund.slice(0, 300) } : {}),
      };
    } catch (e) {
      const f = alsAtlasFehler(e);
      return {
        ok: false as const,
        angefragt,
        fehler: f.art,
        grund: f.grund.slice(0, 300),
        ms: Date.now() - t0,
      };
    }
  };

  // „auswertung“ läuft auf dem Hauptmodell mit wenig Nachdenken — der
  // günstigste Weg, es zu prüfen.
  const [haupt, schnell] = await Promise.all([probe("auswertung"), probe("satz")]);
  return Response.json(
    { ok: haupt.ok && schnell.ok, haupt, schnell, modelle: modellUebersicht() },
    { headers: { "Cache-Control": "no-store" } },
  );
}
