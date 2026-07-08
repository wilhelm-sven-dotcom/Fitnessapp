"use client";

import { motion, useReducedMotion } from "framer-motion";
import { EASE_OUT } from "@/lib/motion";

/**
 * Mechanisches Zählwerk (ersetzt den früheren CountUp): jede Ziffer ist ein
 * 1em-Fenster mit einer 0–9-Walze, die zur Zielziffer rollt — die rechten
 * Walzen rasten zuerst ein, wie bei einem echten Zähler.
 *
 * Aufbau: ein unsichtbarer Metrik-Anker (der fertige Text) definiert Breite
 * und Baseline exakt wie normaler Text; die Walzen liegen als Overlay
 * darüber. Ziffern-Fenster sind `1ch` breit — deckungsgleich mit dem Anker,
 * solange der Kontext `tabular-nums` setzt (wie überall bei Readouts).
 * Formatierung de-DE (Komma, Tausenderpunkt), Separatoren stehen still,
 * das Layout steht sofort in Endbreite. Reduced motion → statischer Text.
 */
const DIGITS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

function Wheel({ digit, delay, duration }: { digit: number; delay: number; duration: number }) {
  return (
    <span
      style={{ display: "inline-block", overflow: "hidden", height: "1em", width: "1ch" }}
    >
      <motion.span
        style={{ display: "flex", flexDirection: "column" }}
        initial={{ y: 0 }}
        animate={{ y: `${-digit}em` }}
        transition={{ duration, ease: EASE_OUT, delay }}
      >
        {DIGITS.map((d) => (
          <span key={d} style={{ height: "1em", lineHeight: 1 }}>
            {d}
          </span>
        ))}
      </motion.span>
    </span>
  );
}

export function Odometer({
  value,
  decimals = 0,
  duration = 0.9,
  className,
}: {
  value: number;
  decimals?: number;
  duration?: number;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const text = value.toLocaleString("de-DE", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  if (reduce) {
    return <span className={className}>{text}</span>;
  }

  // Staffelung von rechts: die letzte Ziffer rollt zuerst los.
  const chars = text.split("");
  const digitCount = chars.filter((c) => c >= "0" && c <= "9").length;
  let seen = 0;
  const items = chars.map((c, i) => {
    const isDigit = c >= "0" && c <= "9";
    const fromRight = isDigit ? digitCount - 1 - seen : 0;
    if (isDigit) seen += 1;
    return { c, i, isDigit, fromRight };
  });

  return (
    <span
      className={className}
      style={{ display: "inline-block", position: "relative", lineHeight: 1 }}
    >
      <span className="sr-only">{text}</span>
      {/* Metrik-Anker: unsichtbar, hält Breite + Baseline des echten Texts. */}
      <span aria-hidden style={{ visibility: "hidden" }}>
        {text}
      </span>
      <span aria-hidden style={{ position: "absolute", inset: 0, display: "flex" }}>
        {items.map(({ c, i, isDigit, fromRight }) =>
          isDigit ? (
            <Wheel key={i} digit={Number(c)} delay={fromRight * 0.05} duration={duration} />
          ) : (
            <span key={i} style={{ lineHeight: 1 }}>
              {c}
            </span>
          ),
        )}
      </span>
    </span>
  );
}
