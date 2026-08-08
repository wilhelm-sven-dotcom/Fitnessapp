import Anthropic from "@anthropic-ai/sdk";
import { ATLAS_MODEL } from "@/lib/atlas/models";
import { atlasSystem } from "@/lib/atlas/prompts";
import {
  BUILD_DAILY_SESSION_TOOL,
  sanitizeDailySession,
} from "@/lib/atlas/session-tool";
import { allowRequest, clientKey } from "@/lib/rate-limit";
import type { SessionVariant } from "@/lib/session-model";

// Needs the Node runtime for the Anthropic SDK.
export const runtime = "nodejs";

/** Key-Status-Probe für die Einstellungen. */
export function GET() {
  return Response.json({ configured: !!process.env.ANTHROPIC_API_KEY });
}

interface SessionReqBody {
  /** Ids der heute verfügbaren Übungen (Equipment-gefiltert, inkl. eigener). */
  availableIds?: string[];
  /** Eigene Übungen des Nutzers — stehen nicht im statischen Katalog. */
  customExercises?: { id?: string; name?: string; pattern?: string; muscle?: string }[];
  budgetMin?: number;
  wish?: string;
  variant?: SessionVariant;
  /** Kompakter Trainings-Kontext (client-seitig gebaut). */
  context?: string;
  /** Profil-Zeile (athletePersona). */
  persona?: string;
}

const VARIANT_TASK: Record<SessionVariant, string> = {
  normal:
    "Baue die HEUTIGE Einheit: bedarfsgerecht (unterversorgte Muskeln und lange nicht gesetzte Reize zuerst), abwechslungsreich (nutze die Breite des Katalogs, wiederhole nicht einfach die letzte Einheit), realistisch fürs Zeitfenster.",
  reset:
    "Baue einen RÜCKEN-RESET: gewichtsfreie bzw. sehr leichte Stabilitäts-Einheit, die den unteren Rücken beruhigt. Keine belasteten Beugen oder Hinges.",
  exam:
    "Baue einen MAXIMALKRAFT-TESTTAG: 3–5 vertraute Grundübungen, je 3 Arbeitssätze mit niedriger Wiederholungszahl (3–6). Technik vor Rekord.",
};

export async function POST(req: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return Response.json({ configured: false });
  if (!allowRequest(`atlas-session:${clientKey(req)}`, 10, 60_000)) {
    return Response.json(
      { ok: false, error: "Zu viele Anfragen — kurz warten." },
      { status: 429 },
    );
  }

  let body: SessionReqBody;
  try {
    body = (await req.json()) as SessionReqBody;
  } catch {
    return Response.json({ ok: false, error: "Ungültige Anfrage." }, { status: 400 });
  }

  const availableIds = (Array.isArray(body.availableIds) ? body.availableIds : [])
    .filter((x): x is string => typeof x === "string")
    .slice(0, 400);
  if (availableIds.length < 5) {
    return Response.json(
      { ok: false, error: "Zu wenige verfügbare Übungen." },
      { status: 400 },
    );
  }

  const custom = (Array.isArray(body.customExercises) ? body.customExercises : [])
    .filter((e) => e && typeof e.id === "string" && typeof e.name === "string")
    .slice(0, 60);
  const budgetMin = Number.isFinite(body.budgetMin)
    ? Math.max(15, Math.min(90, Math.round(Number(body.budgetMin))))
    : 25;
  const wish = typeof body.wish === "string" ? body.wish.slice(0, 200) : "";
  const variant: SessionVariant =
    body.variant === "reset" || body.variant === "exam" ? body.variant : "normal";
  const context = (body.context ?? "").toString().slice(0, 6000);
  const persona = (body.persona ?? "").toString().slice(0, 400);

  // Dynamischer Teil NACH dem gecachten Präfix: Aufgabe, Verfügbarkeit, Kontext.
  const dynamic = [
    VARIANT_TASK[variant],
    `Zeitfenster: etwa ${budgetMin} Minuten (Faustregel: ~3–4 Übungen je 15 Min, danach eine weitere je 5–7 Min; lieber knapper als überladen).`,
    persona ? persona : "",
    custom.length
      ? `Eigene Übungen des Athleten (zusätzlich wählbar):\n${custom
          .map((e) => `- ${e.id} · ${e.name}${e.pattern ? ` · ${e.pattern}` : ""}${e.muscle ? ` · ${e.muscle}` : ""}`)
          .join("\n")}`
      : "",
    `HEUTE VERFÜGBAR sind ausschließlich diese Übungs-Ids (Equipment-gefiltert):\n${availableIds.join(", ")}`,
    `Aktuelle Trainingsdaten:\n${context.trim() || "keine"}`,
    wish ? `Wunsch des Athleten für heute: „${wish}” — beziehe ihn ein, solange er sinnvoll ist.` : "",
    "Rufe danach das Tool build_daily_session mit der fertigen Einheit auf.",
  ]
    .filter(Boolean)
    .join("\n\n");

  const client = new Anthropic({ apiKey });
  try {
    const msg = await client.messages.create({
      model: ATLAS_MODEL,
      max_tokens: 3000,
      system: atlasSystem(dynamic),
      tools: [BUILD_DAILY_SESSION_TOOL],
      tool_choice: { type: "tool", name: "build_daily_session" },
      messages: [
        {
          role: "user",
          content: "Stell meine heutige Einheit zusammen.",
        },
      ],
    });

    const block = msg.content.find((b) => b.type === "tool_use");
    if (!block || block.type !== "tool_use") {
      return Response.json(
        { ok: false, error: "ATLAS hat keinen Vorschlag geliefert." },
        { status: 502 },
      );
    }

    const session = sanitizeDailySession(block.input, availableIds, variant);
    if (!session) {
      return Response.json(
        { ok: false, error: "Der Vorschlag war unbrauchbar." },
        { status: 422 },
      );
    }
    return Response.json({ ok: true, session });
  } catch {
    return Response.json(
      { ok: false, error: "ATLAS gerade nicht erreichbar." },
      { status: 502 },
    );
  }
}
