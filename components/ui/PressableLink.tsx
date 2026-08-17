"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { FILM, TRANSPORT_EIN } from "@/lib/motion";
import { cn } from "@/lib/utils";

const MotionLink = motion(Link);

/**
 * Schwester von Pressable für Navigation: ein next/link mit demselben
 * Filmtransport-Press (Down sofort, Up 80 ms) — Tabs und Header-Icons fühlen
 * sich an wie Knöpfe, bleiben aber echte Links (Prefetch, History, Mittelklick).
 */
export function PressableLink({
  className,
  children,
  ...props
}: React.ComponentProps<typeof MotionLink>) {
  return (
    <MotionLink
      whileTap={{ scale: 0.985, transition: { duration: 0 } }}
      transition={{ duration: FILM.press, ease: TRANSPORT_EIN }}
      className={cn(
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyanotypie",
        className,
      )}
      {...props}
    >
      {children}
    </MotionLink>
  );
}
