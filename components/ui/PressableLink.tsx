"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { SPRING } from "@/lib/motion";
import { cn } from "@/lib/utils";

const MotionLink = motion(Link);

/**
 * Schwester von Pressable für Navigation: ein next/link mit demselben
 * Feder-Tap-Scale — Tabs und Header-Icons fühlen sich an wie Knöpfe,
 * bleiben aber echte Links (Prefetch, History, Mittelklick).
 */
export function PressableLink({
  className,
  children,
  ...props
}: React.ComponentProps<typeof MotionLink>) {
  return (
    <MotionLink
      whileTap={{ scale: 0.97 }}
      transition={SPRING.press}
      className={cn(
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-sessions",
        className,
      )}
      {...props}
    >
      {children}
    </MotionLink>
  );
}
