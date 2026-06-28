"use client";

import { AnimatePresence } from "framer-motion";
import { Dumbbell, Settings, Sparkles } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useTraining } from "@/components/providers/TrainingProvider";
import { BottomNav } from "./BottomNav";
import { PageTransition } from "./PageTransition";
import { Splash } from "./Splash";

const SPLASH_MIN_MS = 1500;

export function AppShell({ children }: { children: React.ReactNode }) {
  const { loading } = useTraining();
  const pathname = usePathname();
  const [minElapsed, setMinElapsed] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setMinElapsed(true), SPLASH_MIN_MS);
    return () => clearTimeout(t);
  }, []);

  const hideChrome =
    pathname?.startsWith("/workout") ||
    pathname?.startsWith("/form") ||
    pathname?.startsWith("/warmup") ||
    false;
  const showSplash = loading || !minElapsed;

  return (
    <>
      <AnimatePresence>{showSplash && <Splash key="splash" />}</AnimatePresence>
      {!loading && (
        <div className="min-h-screen overflow-x-hidden">
          {!hideChrome && (
            <header
              className="glass sticky top-0 z-30 border-b border-surface-3"
              style={{ paddingTop: "env(safe-area-inset-top)" }}
            >
              <div className="mx-auto flex max-w-md items-center justify-between px-5 py-3">
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-md bg-accent-sessions">
                    <Dumbbell size={14} className="text-neutral-950" strokeWidth={2.5} />
                  </span>
                  <span className="font-display text-base font-semibold tracking-tight">Training</span>
                </div>
                <div className="flex items-center gap-1">
                  <Link
                    href="/coach"
                    aria-label="KI-Coach"
                    className="rounded-full p-1.5 text-accent-coverage transition-colors focus:outline-none"
                  >
                    <Sparkles size={20} />
                  </Link>
                  <Link
                    href="/settings"
                    aria-label="Einstellungen"
                    className="rounded-full p-1.5 text-neutral-400 transition-colors focus:outline-none"
                  >
                    <Settings size={20} />
                  </Link>
                </div>
              </div>
            </header>
          )}
          <div className="mx-auto max-w-md px-5 pb-28 pt-5">
            <PageTransition>{children}</PageTransition>
          </div>
          {!hideChrome && <BottomNav />}
        </div>
      )}
    </>
  );
}
