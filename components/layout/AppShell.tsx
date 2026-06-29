"use client";

import { AnimatePresence } from "framer-motion";
import { Cloud, CloudOff, Settings, Sparkles } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { BrandMark } from "@/components/brand/BrandMark";
import { useTraining } from "@/components/providers/TrainingProvider";
import { BottomNav } from "./BottomNav";
import { PageTransition } from "./PageTransition";
import { Splash } from "./Splash";
import { Welcome } from "@/components/onboarding/Welcome";

const SPLASH_MIN_MS = 1500;

export function AppShell({ children }: { children: React.ReactNode }) {
  const { loading, cloud, settings, log, body } = useTraining();
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
  const firstRun =
    !settings.onboarded && !cloud.email && log.length === 0 && body.length === 0;

  return (
    <>
      <AnimatePresence>{showSplash && <Splash key="splash" />}</AnimatePresence>
      {!loading && firstRun && <Welcome />}
      {!loading && !firstRun && (
        <div className="min-h-screen overflow-x-hidden">
          {!hideChrome && (
            <header
              className="glass sticky top-0 z-30 border-b border-line"
              style={{ paddingTop: "env(safe-area-inset-top)" }}
            >
              <div className="mx-auto flex max-w-md items-center justify-between px-5 py-3">
                <div className="flex items-center gap-2">
                  <BrandMark size={24} className="rounded-md" />
                  <span className="font-display text-base font-semibold tracking-tight">Training</span>
                </div>
                <div className="flex items-center gap-1">
                  {cloud.configured &&
                    (cloud.email ? (
                      <Link
                        href="/settings"
                        aria-label="Cloud-Sync aktiv"
                        className="rounded-full p-1.5 focus:outline-none"
                        style={{ color: "var(--accent-ink)" }}
                      >
                        <Cloud size={20} />
                      </Link>
                    ) : (
                      <Link
                        href="/settings"
                        aria-label="Anmelden für Cloud-Sync"
                        className="rounded-full p-1.5 text-faint focus:outline-none"
                      >
                        <CloudOff size={20} />
                      </Link>
                    ))}
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
                    className="rounded-full p-1.5 text-muted transition-colors focus:outline-none"
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
