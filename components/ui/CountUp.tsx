"use client";

import { animate, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";
import { EASE_OUT } from "@/lib/motion";

/**
 * Animated number that counts up to `value` on mount / change. Respects reduced
 * motion (renders the final value instantly). Use with `tabular-nums` so digits
 * don't jitter while animating.
 */
export function CountUp({
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
  const [display, setDisplay] = useState(reduce ? value : 0);

  useEffect(() => {
    if (reduce) {
      setDisplay(value);
      return;
    }
    const controls = animate(0, value, {
      duration,
      ease: EASE_OUT,
      onUpdate: (v) => setDisplay(v),
    });
    return () => controls.stop();
  }, [value, duration, reduce]);

  return <span className={className}>{display.toFixed(decimals)}</span>;
}
