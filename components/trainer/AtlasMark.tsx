"use client";

import { motion, useReducedMotion } from "framer-motion";

/**
 * Die ATLAS-Sigille: ein Berg-"A" aus drei Strichen. Die Flanken laufen in
 * currentColor (Farbkontext der Umgebung), der Querbalken — die "Wachlinie" —
 * immer im Skin-Akzent. Eine Geometrie für alle Skins; der Charakter kommt
 * über --accent und das typografische Umfeld. `live` lässt die Wachlinie
 * ruhig atmen (der Trainer beobachtet gerade). Rein dekorativ (aria-hidden).
 */
export function AtlasMark({
  size = 20,
  className,
  live = false,
}: {
  size?: number;
  className?: string;
  live?: boolean;
}) {
  const reduce = useReducedMotion();
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden
    >
      <path
        d="M12 3 L4.5 21"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
      />
      <path
        d="M12 3 L19.5 21"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
      />
      <motion.path
        d="M7.5 14 H16.5"
        stroke="var(--accent)"
        strokeWidth={2}
        strokeLinecap="round"
        style={{ transformOrigin: "center" }}
        animate={live && !reduce ? { scaleX: [1, 0.55, 1] } : { scaleX: 1 }}
        transition={
          live && !reduce
            ? { duration: 2.6, repeat: Infinity, ease: "easeInOut" }
            : { duration: 0 }
        }
      />
    </svg>
  );
}
