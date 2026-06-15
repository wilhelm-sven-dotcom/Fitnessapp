"use client";

import { motion } from "framer-motion";
import { Dumbbell } from "lucide-react";
import { usePathname } from "next/navigation";
import { useTraining } from "@/components/providers/TrainingProvider";
import { BottomNav } from "./BottomNav";
import { PageTransition } from "./PageTransition";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { loading, weekCount, log } = useTraining();
  const pathname = usePathname();
  const hideNav = pathname?.startsWith("/workout") ?? false;

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <motion.div
          className="flex items-center gap-3 text-neutral-500"
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
        >
          <Dumbbell size={20} className="text-amber-400" />
          <span className="font-mono text-sm uppercase tracking-widest">lädt…</span>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen overflow-x-hidden">
      <div className="mx-auto max-w-md px-5 pb-28 pt-6">
        <header className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-amber-400">
              <Dumbbell size={14} className="text-neutral-950" strokeWidth={2.5} />
            </span>
            <span className="text-lg font-semibold tracking-tight">Training</span>
          </div>
          <span className="font-mono text-xs tabular-nums text-neutral-500">
            {weekCount} diese Woche · {log.length} gesamt
          </span>
        </header>
        <PageTransition>{children}</PageTransition>
      </div>
      {!hideNav && <BottomNav />}
    </div>
  );
}
