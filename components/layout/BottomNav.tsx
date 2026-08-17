"use client";

import { usePathname } from "next/navigation";
import { PressableLink } from "@/components/ui/PressableLink";
import { cn } from "@/lib/utils";

/** Registerleiste „Platte 311": vier Nur-Text-Tabs in Versal-Mono —
 *  der aktive trägt Siegellack und eine 2-px-Oberkante (Registerreiter).
 *  Keine Icons, kein gleitender Pill-Marker (Filmtransport: harte Zustände). */
const tabs = [
  { href: "/", label: "Heute" },
  { href: "/uebungen", label: "Katalog" },
  { href: "/fortschritt", label: "Fortschritt" },
  { href: "/coach", label: "ATLAS" },
] as const;

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav
      className="glass fixed inset-x-0 bottom-0 z-30 border-t border-line"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="mx-auto flex max-w-md">
        {tabs.map(({ href, label }) => {
          const active =
            href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <PressableLink
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative flex flex-1 items-center justify-center pb-4 pt-3.5 font-mono text-4xs font-semibold uppercase tracking-gesperrt focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-cyanotypie",
                active ? "text-accent-ink" : "text-muted",
              )}
            >
              {active && (
                <span
                  aria-hidden
                  className="absolute inset-x-0 top-0 h-0.5 bg-accent-sessions"
                  style={{ marginTop: -1 }}
                />
              )}
              {label}
            </PressableLink>
          );
        })}
      </div>
    </nav>
  );
}
