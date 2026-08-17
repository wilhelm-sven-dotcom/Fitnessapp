"use client";

import { motion, type HTMLMotionProps } from "framer-motion";
import { FILM, TRANSPORT_EIN } from "@/lib/motion";
import { cn } from "@/lib/utils";

/** Button-Press nach Filmtransport: Down sofort (steps(1)) auf scale 0,985,
 *  Up in 80 ms Transport zurück. Fokus-Ring = Cyanotypie (Platte 311). */
export function Pressable({
  className,
  children,
  ...props
}: HTMLMotionProps<"button">) {
  return (
    <motion.button
      whileTap={{ scale: 0.985, transition: { duration: 0 } }}
      transition={{ duration: FILM.press, ease: TRANSPORT_EIN }}
      className={cn(
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyanotypie",
        className,
      )}
      {...props}
    >
      {children}
    </motion.button>
  );
}
