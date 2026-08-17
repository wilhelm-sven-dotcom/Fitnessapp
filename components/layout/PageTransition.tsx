"use client";

import { motion, useReducedMotion } from "framer-motion";
import { usePathname } from "next/navigation";
import { FILM, TRANSPORT_EIN } from "@/lib/motion";

/**
 * Screenwechsel = Filmtransport (Motion-Handoff): der neue Screen ruckt
 * 24 px in Filmrichtung ein (160 ms, Transport-Kurve, toter Stopp), der
 * alte verschwindet OHNE Fade (der Remount ersetzt ihn hart). Nur
 * transform; reduced motion = harter Schnitt.
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const reduce = useReducedMotion();
  if (reduce) return <>{children}</>;
  return (
    <motion.div
      key={pathname}
      initial={{ x: 24 }}
      animate={{ x: 0 }}
      transition={{ duration: FILM.screen, ease: TRANSPORT_EIN }}
    >
      {children}
    </motion.div>
  );
}
