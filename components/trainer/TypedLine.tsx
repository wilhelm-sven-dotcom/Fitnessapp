"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";

/** Character count revealed so far — rAF-driven, stops itself when complete,
 *  restarts when the text changes; reduced motion shows everything at once. */
function useTypedCount(text: string, msPerChar: number): number {
  const reduce = useReducedMotion();
  const [count, setCount] = useState(reduce ? text.length : 0);
  useEffect(() => {
    if (reduce) {
      setCount(text.length);
      return;
    }
    setCount(0);
    let raf = 0;
    let t0 = 0;
    const loop = (ts: number) => {
      if (!t0) t0 = ts;
      const n = Math.min(text.length, Math.floor((ts - t0) / msPerChar));
      setCount(n);
      if (n < text.length) raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [text, msPerChar, reduce]);
  return count;
}

/**
 * ATLAS speaks: the line types itself character by character with an accent
 * caret that fades once the sentence is complete. Screenreaders always get
 * the full text via aria-label (no live-region spam while typing).
 */
export function TypedLine({
  text,
  className,
  msPerChar = 22,
}: {
  text: string;
  className?: string;
  msPerChar?: number;
}) {
  const count = useTypedCount(text, msPerChar);
  const done = count >= text.length;
  return (
    <p aria-label={text} className={className} data-testid="typed-line" data-done={done ? "1" : "0"}>
      <span aria-hidden>{text.slice(0, count)}</span>
      <AnimatePresence>
        {!done && (
          <motion.span
            aria-hidden
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="text-accent-ink"
          >
            ▍
          </motion.span>
        )}
      </AnimatePresence>
    </p>
  );
}
