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
 * also 16 ms sichtbar — kein Bild, nur ein Zucken. Deshalb wartet der Abgang,
 * bis die Choreografie ihr Bild aufgebaut hat, und feuert danach sofort.
 * Gemessen wird ab Navigationsbeginn (`performance.now()`), also derselbe
 * Nullpunkt, den auch die CSS-Keyframes benutzen — nicht ab React-Mount, der
 * ja gerade das ist, worauf gewartet wurde.
 */

/** „Bis das Bild steht": V1 Silhouette 420 · V2 Zoetrop an 440 · V3 Walzen 480. */
const MIN_MS = 440;
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
    const rest = Math.max(0, MIN_MS - performance.now());
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
