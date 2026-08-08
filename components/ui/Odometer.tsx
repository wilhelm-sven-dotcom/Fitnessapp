"use client";

import { useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState } from "react";

/**
 * Ruhiges Zählwerk: beim Mount steht sofort der fertige Wert (kein Hochrollen
 * bei jeder Navigation). Ändert sich der Wert DANACH — z. B. weil ein Satz
 * gespeichert wurde — rollt jede Ziffer als 1em-Fenster mit 0–9-Walze zur
 * neuen Ziffer. Formatierung de-DE; Kontext sollte `tabular-nums` setzen.
 * Reduced motion → immer statischer Text.
 */
const DIGITS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

function Wheel({ digit, delay, duration }: { digit: number; delay: number; duration: number }) {
  return (
    <span
      style={{ display: "inline-block", overflow: "hidden", height: "1em", width: "1ch" }}
    >
      <span
        style={{
          display: "flex",
          flexDirection: "column",
          transform: `translateY(${-digit}em)`,
          transition: `transform ${duration}s cubic-bezier(0.22, 1, 0.36, 1) ${delay}s`,
        }}
      >
        {DIGITS.map((d) => (
          <span key={d} style={{ height: "1em", lineHeight: 1 }}>
            {d}
          </span>
        ))}
      </span>
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
  // Erst nach einer echten Wertänderung im gemounteten Zustand wird gerollt.
  const [live, setLive] = useState(false);
  const first = useRef(value);
  useEffect(() => {
    if (value !== first.current) setLive(true);
  }, [value]);

  const text = value.toLocaleString("de-DE", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  if (!live || reduce) {
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
