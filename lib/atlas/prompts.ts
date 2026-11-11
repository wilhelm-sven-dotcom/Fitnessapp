import type { BetaTextBlockParam } from "@anthropic-ai/sdk/resources/beta/messages/messages";
import { LIB, PATTERN_LABEL } from "@/lib/exercises";
import { fmtClock } from "@/lib/format";
import { restSecFor, TIME } from "@/lib/session-time";
import { TRAINING_PRINCIPLES } from "@/lib/training-science";
import { muscleOf, MUSCLE_LABEL } from "@/lib/volume";

/**
 * Gemeinsames, byte-stabiles System-Präfix aller ATLAS-Endpunkte. Der feste
 * Block (Persona + Prinzipien + kompletter Basis-Katalog) trägt
 * `cache_control` und wird von Anthropic gecacht — jede weitere Anfrage
 * desselben Modells liest ihn zu einem Bruchteil des Preises. Alles, was sich
 * ändert (Datum, Nutzer, Aufgabe), kommt NACH dem Marker oder in die
 * Nachricht.
 *
 * Ton der Prompts: ruhig und begründet. Die heutigen Modelle folgen dem
 * System-Prompt sehr genau; Großbuchstaben und „NIE/GENAU“ lassen sie eine
 * Regel überziehen. Jede Vorgabe steht darum einmal da, in normaler
 * Lautstärke, mit ihrem Grund.
 */

export const ATLAS_PERSONA = `Du bist ATLAS, der Trainingspartner in dieser App: der Kumpel an der Bank, der neben dem Athleten steht, ihn sichert und klar sagt, was Sache ist. Du kennst seine Trainingsdaten und seine Grenzen.

Du schreibst normales, klares Deutsch und duzt. Benutze die Wörter der App (Einheit, Satz, Pause, Wiederholung, Rekord, Aufwärmen) statt eigener Fachbegriffe oder Sprachbilder: der Athlet liest dich zwischen zwei Sätzen im Studio und soll sofort verstehen, was gemeint ist. Dein Ton ist direkt, ermutigend und gut gelaunt, nie albern. Kurze Sätze, echte Zahlen aus seinen Daten statt allgemeiner Sprüche, höchstens ein Ausrufezeichen. Schreib ohne Gedankenstriche und ohne Emojis, so wie die festen Sätze der App.`;

/** Basis-Katalog als deterministische Liste. Nur die eingebauten Übungen —
 *  eigene Übungen des Nutzers ändern sich und kommen je Anfrage dazu. Die
 *  Pause steht dabei, weil sie über die Dauer einer Übung entscheidet und das
 *  Modell sie sonst raten müsste. */
function catalogBlock(): string {
  const lines = LIB.filter((e) => e.pattern !== "cardio").map((e) => {
    const m = muscleOf(e);
    const mus =
      MUSCLE_LABEL[m.primary] + (m.secondary ? `/${MUSCLE_LABEL[m.secondary]}` : "");
    return `- ${e.id} · ${e.name} · ${PATTERN_LABEL[e.pattern]} · ${mus} · Pause ${fmtClock(restSecFor(e))}`;
  });
  return `Übungskatalog der App (id · Name · Muster · Muskel · Satzpause):\n${lines.join("\n")}`;
}

// Einmal gebaut, danach byte-identisch — Voraussetzung für Cache-Treffer.
const STATIC_PREFIX = [ATLAS_PERSONA, TRAINING_PRINCIPLES, catalogBlock()].join("\n\n");

/**
 * System-Blöcke für eine Anfrage: fester Teil mit Cache-Marker, optional
 * gefolgt vom veränderlichen Zusatz (Aufgabe und Regeln der Route, Datum,
 * Profil, Trainingsdaten).
 */
export function atlasSystem(dynamic?: string): BetaTextBlockParam[] {
  const blocks: BetaTextBlockParam[] = [
    { type: "text", text: STATIC_PREFIX, cache_control: { type: "ephemeral" } },
  ];
  const d = dynamic?.trim();
  if (d) blocks.push({ type: "text", text: d });
  return blocks;
}

const min = (sek: number) => (sek / 60).toFixed(1).replace(".", ",");

/**
 * So rechnet die App die Dauer einer Einheit — aus denselben Konstanten wie
 * `lib/session-time.ts`, damit Prompt und Uhr dasselbe meinen. Vorher stand
 * hier eine Faustregel („3 bis 4 Übungen je 15 Minuten“), die seit der
 * längeren Pause bei Grundübungen nicht mehr stimmte.
 */
export function zeitmodell(): string {
  const grund3 = 3 * (TIME.repSetSec + TIME.restGrundSec) + TIME.transitionSec;
  const neben3 = 3 * (TIME.repSetSec + TIME.restSec) + TIME.transitionSec;
  const warm = 2 * (TIME.warmupSetSec + TIME.warmupRestSec);
  return [
    `So rechnet die App die Dauer: Ein Arbeitssatz zählt ${TIME.repSetSec} Sekunden (ein Haltesatz ${TIME.timedSetSec}), danach folgt die Satzpause aus dem Katalog (${fmtClock(TIME.restGrundSec)} bei Grundübungen, ${fmtClock(TIME.restSec)} bei eingelenkigen Übungen und Rumpf). Jede Übung kostet ${TIME.transitionSec} Sekunden Wechsel. Zwei Aufwärmsätze (zusammen ${fmtClock(warm)}) gibt es nur bei der ersten gewichteten Übung für einen Muskel.`,
    `Zur Orientierung: Eine Grundübung mit 3 Sätzen dauert etwa ${min(grund3)} Minuten, eine eingelenkige Übung mit 3 Sätzen etwa ${min(neben3)} Minuten.`,
    "Was nach dieser Rechnung nicht ins Zeitfenster passt, kürzt die App selbst: erst Sätze bei Nebenübungen (bis auf zwei), dann ganze Nebenübungen. Plane die Einheit so, dass sie hineinpasst, dann bleibt sie, wie du sie gebaut hast.",
  ].join(" ");
}
