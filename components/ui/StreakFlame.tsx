"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Flame } from "lucide-react";

/** The streak flame, gently flickering (scale + opacity, ~2.4 s loop) so an
 *  active streak feels alive. Static under reduced motion. */
export function StreakFlame({
  size = 15,
  className,
  color,
}: {
  size?: number;
  className?: string;
  color?: string;
}) {
  const reduce = useReducedMotion();
  const flame = <Flame size={size} className={className} style={color ? { color } : undefined} />;
  if (reduce) return flame;
  return (
    <motion.span
      className="inline-flex"
      style={{ transformOrigin: "center bottom" }}
      animate={{ scale: [1, 1.14, 0.97, 1.1, 1], opacity: [1, 0.82, 1, 0.88, 1] }}
      transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
    >
      {flame}
    </motion.span>
  );
}
