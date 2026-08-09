"use client";

import { Cloud, CloudOff, Settings } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BrandMark } from "@/components/brand/BrandMark";
import { useTraining } from "@/components/providers/TrainingProvider";
import { BottomNav } from "./BottomNav";
import { PageTransition } from "./PageTransition";
import { Welcome } from "@/components/onboarding/Welcome";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { loading, cloud, settings, log, body } = useTraining();
  const pathname = usePathname();

  const hideChrome = pathname?.startsWith("/workout") || false;
  const firstRun =
    !settings.onboarded && !cloud.email && log.length === 0 && body.length === 0;

  // Kein Splash: localStorage ist in Millisekunden gelesen — die App rendert,
  // sobald die Daten da sind. `loading` deckt nur diesen einen Frame ab.
  if (loading) return null;

  return (
    <>
      {firstRun && <Welcome />}
      {!firstRun && (
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
                        className="rounded-full p-2.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-ink"
                        style={{ color: "var(--accent-ink)" }}
                      >
                        <Cloud size={20} />
                      </Link>
                    ) : (
                      <Link
                        href="/settings"
                        aria-label="Anmelden für Cloud-Sync"
                        className="rounded-full p-2.5 text-faint focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-ink"
                      >
                        <CloudOff size={20} />
                      </Link>
                    ))}
                  <Link
                    href="/settings"
                    aria-label="Einstellungen"
                    className="rounded-full p-2.5 text-muted transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-ink"
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
