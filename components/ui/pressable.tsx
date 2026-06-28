"use client";

import { motion, type HTMLMotionProps } from "framer-motion";
import { cn } from "@/lib/utils";

export const pressSpring = { type: "spring", stiffness: 400, damping: 30 } as const;

/** A button with a spring-based tap-scale, per the design philosophy. */
export function Pressable({
  className,
  children,
  ...props
}: HTMLMotionProps<"button">) {
  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      transition={pressSpring}
      className={cn(
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-sessions",
        className,
      )}
      {...props}
    >
      {children}
    </motion.button>
  );
}
