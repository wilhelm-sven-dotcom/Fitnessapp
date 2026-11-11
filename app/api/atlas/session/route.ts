import { AtlasFehler, alsAtlasFehler, atlasJson } from "@/lib/atlas/call";
import { atlasEingang, fehlerAntwort, heuteZeile, text } from "@/lib/atlas/eingang";
import { atlasSystem, zeitmodell } from "@/lib/atlas/prompts";
import { DAILY_SESSION_SCHEMA, sanitizeDailySession } from "@/lib/atlas/session-tool";
import { ALLE_GERAETE } from "@/lib/exercises";
import type { SessionVariant } from "@/lib/session-model";

// Needs the Node runtime for the Anthropic SDK.
export const runtime = "nodejs";
/** Ein Plan mit Nachdenken kann über eine Minute brauchen. */
export const maxDuration = 300;

/** Schlüssel-Status für ältere Fenster; neu: `/api/atlas/status`. */
export function GET() {
  return Response.json({ configured: !!process.env.ANTHROPIC_API_KEY });
}

interface SessionReqBody {
  /** Ids der heute verfügbaren Übungen (Equipment-gefiltert, inkl. eigener). */
  availableIds?: string[];
  /** Eigene Übungen des Nutzers — stehen nicht im festen Katalog. */
  customExercises?: { id?: unknown; name?: unknown; pattern?: unknown; muscle?: unknown }[];
  budgetMin?: number;
  wish?: string;
  variant?: SessionVariant;
  /** Kompakter Trainings-Kontext (client-seitig gebaut). */
  context?: string;
  /** Profil-Zeile (athletePersona). */
  persona?: string;
  /** Trainingsort heute: Name + Geräte-Namen (lib/orte.ts geraeteLabels). */
  ort?: { name?: unknown; geraete?: unknown; nurGeraete?: unknown };
  /** Datum des Geräts, JJJJ-MM-TT. */
  datum?: string;
}

const GERAETE_LABELS = new Set(ALLE_GERAETE.map((e) => e.label));

const VARIANT_TASK: Record<SessionVariant, string> = {
  normal:
    "Stell die Einheit für heute zusammen. Sie richtet sich nach dem Bedarf (unterversorgte Muskeln und lange nicht gesetzte Reize zuerst), bringt Abwechslung (nutze die Breite des Katalogs statt die letzte Einheit zu wiederholen) und passt ins Zeitfenster.",
  reset:
    "Stell einen Rücken-Reset zusammen: eine Einheit ohne oder mit sehr leichtem Gewicht, die den unteren Rücken beruhigt und stabilisiert. Belastete Kniebeugen und Hüftbeugen gehören heute nicht hinein.",
  exam:
    "Stell einen Krafttest zusammen: 3 bis 5 vertraute Grundübungen mit je 3 Arbeitssätzen und wenigen Wiederholungen (3 bis 6). Saubere Technik geht vor Rekord.",
};

/** Einzeiliger, gekappter Text ohne Zeilenumbrüche — für Namen, die in eine
 *  Liste im Prompt wandern. */
const kurz = (v: unknown, max: number) =>
  typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, max) : "";

export async function POST(req: Request) {
  const ein = await atlasEingang<SessionReqBody>(req, "session", 10);
  if (!ein.ok) return ein.antwort;
  const { body, apiKey } = ein;

  const availableIds = (Array.isArray(body.availableIds) ? body.availableIds : [])
    .filter((x): x is string => typeof x === "string" && x.length <= 80)
    .slice(0, 400);
  if (availableIds.length < 5) {
    return Response.json(
      { ok: false, fehler: "anfrage", error: "Zu wenige verfügbare Übungen." },
      { status: 400 },
    );
  }

  const custom = (Array.isArray(body.customExercises) ? body.customExercises : [])
    .map((e) => ({
      id: kurz(e?.id, 80),
      name: kurz(e?.name, 60),
      pattern: kurz(e?.pattern, 30),
      muscle: kurz(e?.muscle, 30),
    }))
    .filter((e) => e.id && e.name)
    .slice(0, 60);
  const budgetMin = Number.isFinite(body.budgetMin)
    ? Math.max(10, Math.min(180, Math.round(Number(body.budgetMin))))
    : 25;
  const wish = kurz(body.wish, 200);
  const variant: SessionVariant =
    body.variant === "reset" || body.variant === "exam" ? body.variant : "normal";
  const context = text(body.context, 6000);
  const persona = text(body.persona, 400);
  // Ort nur als Klartext-Hinweis — Name gekappt, Geräte nur aus der bekannten
  // Liste (kein freier Text ins Prompt). Die harte Grenze bleibt availableIds.
  const ortName = kurz(body.ort?.name, 40);
  const ortGeraete = (Array.isArray(body.ort?.geraete) ? body.ort.geraete : [])
    .filter((g): g is string => typeof g === "string" && GERAETE_LABELS.has(g))
    .slice(0, ALLE_GERAETE.length);
  const ortNurGeraete = body.ort?.nurGeraete === true;

  // Veränderlicher Teil NACH dem gecachten Präfix: Aufgabe, Zeit, Verfügbarkeit,
  // Trainingsdaten.
  const dynamic = [
    VARIANT_TASK[variant],
    heuteZeile(body.datum),
    `Zeitfenster: ${budgetMin} Minuten. Der Athlet hat diese Zahl selbst gewählt, die Einheit soll darin fertig werden. ${zeitmodell()}`,
    "Wähle nach Bedarf: zuerst die Muskeln mit dem größten Rückstand in dieser Woche und der längsten Zeit seit dem letzten Reiz. Eine kurze Einheit ist eine Auswahl, kein verkleinertes Ganzkörperprogramm. Der Grund für jede Übung gehört in ihr Feld why, die Ansage für den Start in intro.",
    persona,
    custom.length
      ? `Eigene Übungen des Athleten (zusätzlich wählbar):\n${custom
          .map((e) => `- ${e.id} · ${e.name}${e.pattern ? ` · ${e.pattern}` : ""}${e.muscle ? ` · ${e.muscle}` : ""}`)
          .join("\n")}`
      : "",
    ortName
      ? `Trainingsort heute: ${ortName}. Geräte dort: ${ortGeraete.length ? ortGeraete.join(", ") : "keine (nur Körpergewicht)"}.${
          ortNurGeraete
            ? " Hier trainiert der Athlet nur an Geräten (Maschinen und Kabelzug), ohne freie Gewichte und ohne Körpergewichtsübungen."
            : ""
        }`
      : "",
    `Heute verfügbar sind nur diese Übungs-Ids (nach Geräten gefiltert); andere kann die App nicht übernehmen:\n${availableIds.join(", ")}`,
    `Aktuelle Trainingsdaten:\n${context.trim() || "keine"}`,
    wish ? `Wunsch des Athleten für heute: „${wish}“. Geh darauf ein, soweit es zum Training passt.` : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  try {
    const { wert } = await atlasJson({
      apiKey,
      aufgabe: "plan",
      system: atlasSystem(dynamic),
      messages: [{ role: "user", content: "Stell meine heutige Einheit zusammen." }],
      schema: DAILY_SESSION_SCHEMA,
      signal: req.signal,
    });
    const session = sanitizeDailySession(wert, availableIds, variant);
    if (!session) throw new AtlasFehler("unbrauchbar", "zu wenige gültige Übungen");
    return Response.json({ ok: true, session });
  } catch (e) {
    return fehlerAntwort(alsAtlasFehler(e).art);
  }
}
