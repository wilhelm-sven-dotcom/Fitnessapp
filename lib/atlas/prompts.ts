import type Anthropic from "@anthropic-ai/sdk";
import { LIB, PATTERN_LABEL } from "@/lib/exercises";
import { TRAINING_PRINCIPLES } from "@/lib/training-science";
import { muscleOf, MUSCLE_LABEL } from "@/lib/volume";

/**
 * Gemeinsames, byte-stabiles System-Präfix aller ATLAS-Endpunkte. Der statische
 * Block (Persona + Prinzipien + kompletter Basis-Katalog) trägt `cache_control`
 * und wird von Anthropic gecacht — jede weitere Anfrage liest ihn zu ~10 % des
 * Preises. Alles Volatile (Nutzerkontext, Aufgabe) kommt NACH dem Marker bzw.
 * in die User-Message.
 */

export const ATLAS_PERSONA = `Du bist ATLAS — Studienleiter des Bewegungslabors „Platte 311". Die App führt Krafttraining als fotografische Bewegungsstudie in der Tradition Muybridges: eine Trainingseinheit ist eine „Studie" (gespeichert eine „Platte" mit laufender Nummer), ein Satz ein „Kader", die Satzpause die „Verschlusszeit", ein persönlicher Rekord ein „Maximum" (es steht auf der „Tafel des Maximums"). Nutze dieses Register beiläufig und sparsam — Klarheit schlägt Metapher, echte Zahlen schlagen beides. Du kennst den Athleten, seine Historie und seine Grenzen. Ton: nüchtern-präzise wie ein Versuchsprotokoll, direkt, warm im Kern; kurze Sätze, keine Floskeln, kein Ausrufezeichen-Spam. Du sprichst Deutsch und duzt.`;

/** Basis-Katalog als deterministische Liste (id · Name · Muster · Muskel).
 *  Nur die eingebauten Übungen — eigene Übungen des Nutzers sind volatil und
 *  werden pro Anfrage im dynamischen Teil ergänzt. */
function catalogBlock(): string {
  const lines = LIB.filter((e) => e.pattern !== "cardio").map((e) => {
    const m = muscleOf(e);
    const mus =
      MUSCLE_LABEL[m.primary] + (m.secondary ? `/${MUSCLE_LABEL[m.secondary]}` : "");
    return `- ${e.id} · ${e.name} · ${PATTERN_LABEL[e.pattern]} · ${mus}`;
  });
  return `Übungskatalog der App (id · Name · Muster · Muskel):\n${lines.join("\n")}`;
}

// Einmal gebaut, danach byte-identisch — Voraussetzung für Cache-Treffer.
const STATIC_PREFIX = [ATLAS_PERSONA, TRAINING_PRINCIPLES, catalogBlock()].join("\n\n");

/**
 * System-Blöcke für `messages.create`: statischer Teil mit Cache-Marker,
 * optional gefolgt von volatilem Zusatz (Aufgabe/Regeln des Endpunkts).
 * Reihenfolge im Request: tools → system → messages; die Tools jedes Endpunkts
 * müssen daher ebenfalls byte-stabil bleiben.
 */
export function atlasSystem(dynamic?: string): Anthropic.TextBlockParam[] {
  const blocks: Anthropic.TextBlockParam[] = [
    { type: "text", text: STATIC_PREFIX, cache_control: { type: "ephemeral" } },
  ];
  const d = dynamic?.trim();
  if (d) blocks.push({ type: "text", text: d });
  return blocks;
}
