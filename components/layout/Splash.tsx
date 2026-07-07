"use client";

import { motion } from "framer-motion";
import { FlipbookBoot } from "@/components/layout/FlipbookBoot";
import { EASE_OUT } from "@/lib/motion";

/**
 * Boot-Splash: das Daumenkino „Die Mischung" — Sport-Tafeln rattern wie ein
 * Filmvorspann durch und bleiben auf der roten TRAINING-Karte stehen (Svens
 * Auswahl aus den Mock-Runden; ersetzt die früheren Skin-Signatur-Boots).
 * Die Tafeln sind eigenständige, handkolorierte Kunst — bewusst skin- und
 * theme-unabhängig, wie ein Vorspann. Timing unverändert: AppShell blendet
 * nach SPLASH_MIN_MS aus; das Daumenkino füllt exakt diese Zeit.
 */
export function Splash() {
  return (
    <motion.div
      className="app-bg fixed inset-0 z-50 flex flex-col items-center justify-center"
      style={{ paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)" }}
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4, ease: EASE_OUT }}
    >
      <FlipbookBoot />
    </motion.div>
  );
}
