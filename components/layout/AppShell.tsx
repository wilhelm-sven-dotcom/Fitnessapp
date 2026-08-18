"use client";

import { Cloud, CloudOff, Settings } from "lucide-react";
import { usePathname } from "next/navigation";
import { PressableLink } from "@/components/ui/PressableLink";
import { LiftMark } from "@/components/brand/LiftMark";
import { Skeleton } from "@/components/ui/Skeleton";
import { useWakeLock } from "@/components/workout/useWakeLock";
import { useTraining } from "@/components/providers/TrainingProvider";
import { BottomNav } from "./BottomNav";
import { PageTransition } from "./PageTransition";
import { Welcome } from "@/components/onboarding/Welcome";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { loading, cloud, settings, log, body } = useTraining();
  const pathname = usePathname();

  // Display bleibt wach, solange die App offen ist (abschaltbar) — nicht nur
  // im Training: kein Sperrbildschirm beim Blick auf Plan oder Fortschritt.
  // Der Hook re-akquiriert bei visibilitychange und gibt beim Verstecken frei.
  useWakeLock(settings.keepAwake !== false);

  const hideChrome = pathname?.startsWith("/workout") || false;
  const firstRun =
    !settings.onboarded && !cloud.email && log.length === 0 && body.length === 0;

  // Zweite Reihe hinter dem Startbild: Das Splash-Overlay (components/start)
  // deckt den Kaltstart ab, dieses Gerüst nur noch den einen Frame, den
  // `loading` wirklich dauert — localStorage liest in Millisekunden. Deshalb
  // statisch ohne Puls: bei <100 ms wäre Blinken reines Flacker-Theater.
  if (loading)
    return (
      <div aria-busy="true" className="mx-auto max-w-md px-5 pb-28 pt-5">
        <Skeleton className="h-6 w-28" />
        <Skeleton className="mt-4 h-44 w-full" />
        <Skeleton className="mt-4 h-24 w-full" />
        <Skeleton className="mt-3 h-24 w-full" />
      </div>
    );

  return (
    <>
      {firstRun && <Welcome />}
      {/* Kein overflow-x-hidden auf diesem Wrapper: der Clip sitzt auf
          html/body — sonst kleben weder App-Header noch Trainings-Kopf. */}
      {!firstRun && (
        <div className="min-h-screen">
          {!hideChrome && (
            <header
              className="glass sticky top-0 z-30 border-b border-line"
              style={{ paddingTop: "env(safe-area-inset-top)" }}
            >
              <div className="mx-auto flex max-w-md items-center justify-between px-5 py-3">
                <div className="flex items-center gap-2 text-fg">
                  <LiftMark size={17} />
                  <span className="font-mono text-2xs font-semibold uppercase tracking-gesperrt-3">
                    Platte 311
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  {cloud.configured &&
                    (cloud.email ? (
                      <PressableLink
                        href="/settings?seg=verbindungen"
                        aria-label="Cloud-Sync aktiv"
                        className="flex h-11 w-11 items-center justify-center rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-ink"
                        style={{ color: "var(--accent-ink)" }}
                      >
                        <Cloud size={20} />
                      </PressableLink>
                    ) : (
                      <PressableLink
                        href="/settings?seg=verbindungen"
                        aria-label="Anmelden für Cloud-Sync"
                        className="flex h-11 w-11 items-center justify-center rounded-full text-faint focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-ink"
                      >
                        <CloudOff size={20} />
                      </PressableLink>
                    ))}
                  <PressableLink
                    href="/settings"
                    aria-label="Einstellungen"
                    className="flex h-11 w-11 items-center justify-center rounded-full text-muted transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-ink"
                  >
                    <Settings size={20} />
                  </PressableLink>
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
