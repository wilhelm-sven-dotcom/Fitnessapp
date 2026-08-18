"use client";

import { useEffect } from "react";
import { useTraining } from "@/components/providers/TrainingProvider";

/**
 * Der Abgang des Startbilds — die einzige Stelle, an der JavaScript den
 * Splash anfasst. Sichtbar wird er allein durch `data-splash` auf <html>
 * (Pre-Paint-Skript), gestaltet ist er in globals.css; dieser Wächter setzt
 * das Attribut auf „ab" (harter Filmtransport-Ruck) und danach auf „weg".
 *
 * Zur Frequenz-Regel des Handoffs („der Splash verlängert den Boot nie
 * künstlich"): Der Provider ist bereits nach ~einem Frame fertig, weil
 * localStorage faktisch synchron liest. Ohne Untergrenze wäre das Startbild
 * also 16 ms sichtbar — kein Bild, nur ein Zucken. Deshalb läuft die
 * Choreografie zu Ende und hält kurz, bevor der Abgang feuert; danach sofort.
 *
 * Nullpunkt ist `window.__sp0` — der Zeitstempel, den das Pre-Paint-Skript
 * unmittelbar vor dem Splash-Markup setzt. NICHT der Navigationsbeginn: die
 * CSS-Keyframes starten erst, wenn das Element gerendert wird, und der
 * Abstand dazwischen wächst mit der Ladezeit des HTML. Ab Navigationsbeginn
 * gerechnet würde der Abgang auf langsamen Verbindungen wieder mitten in die
 * Choreografie fallen — genau der Fehler, den die Untergrenze verhindern soll.
 */

/**
 * Mindest-Standzeit des Startbilds, gerechnet ab Navigationsbeginn.
 *
 * Die Choreografien sind FERTIG, wenn die Wortmarke eingerastet ist:
 * V1 440 + 160 = 600 · V2 520 + 160 = 680 · V3 500 (hart). Darunter darf die
 * Untergrenze nicht liegen — sonst reißt der Abgang genau das Bild weg, auf
 * das die ganze Choreografie zuläuft (bei 440 ms sah man die Wortmarke nur
 * noch wegfliegen). Der Rest ist Haltezeit, damit das fertige Bild in Ruhe
 * gelesen wird: rund anderthalb Sekunden, in denen bei V3 der
 * Registrierpunkt schlägt, bei V1 die Belichtungsstriche blinken und bei V2
 * das Zoetrop läuft. Das ist bewusst großzügig — das Startbild ist der
 * Moment, in dem die App sich vorstellt; wem das zu lang ist, der schaltet
 * es unter Aussehen ab.
 */
const MIN_MS = 2200;
/** Abgangsdauer — deckungsgleich mit der CSS-Regel für data-splash="ab". */
const AB_MS = 180;

export function SplashGate() {
  const { loading } = useTraining();

  useEffect(() => {
    if (loading) return;
    const d = document.documentElement;
    const v = d.getAttribute("data-splash");
    // Kein Startbild angefordert (abgeschaltet) oder schon abgeräumt.
    if (v !== "v1" && v !== "v2" && v !== "v3") return;

    let weg: ReturnType<typeof setTimeout> | undefined;
    const start = (window as Window & { __sp0?: number }).__sp0 ?? 0;
    const rest = Math.max(0, MIN_MS - (performance.now() - start));
    const ab = setTimeout(() => {
      d.setAttribute("data-splash", "ab");
      weg = setTimeout(() => d.setAttribute("data-splash", "weg"), AB_MS);
    }, rest);

    return () => {
      clearTimeout(ab);
      if (weg) clearTimeout(weg);
    };
  }, [loading]);

  return null;
}
