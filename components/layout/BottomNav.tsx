"use client";

import { BarChart3, CalendarDays, List, Sparkles, type LucideIcon } from "lucide-react";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { PressableLink } from "@/components/ui/PressableLink";
import { cn } from "@/lib/utils";

/** Tab-Leiste „spotter“: vier Reiter mit Symbol und Text. Aktiv als blaue Pille,
 *  inaktiv als Hinweis-Schrift; kein gleitender Marker. */
const tabs: readonly { href: string; label: string; Icon: LucideIcon }[] = [
  { href: "/", label: "Heute", Icon: CalendarDays },
  { href: "/uebungen", label: "Katalog", Icon: List },
  { href: "/fortschritt", label: "Fortschritt", Icon: BarChart3 },
  { href: "/coach", label: "ATLAS", Icon: Sparkles },
];

export function BottomNav({
  navRef,
  slotRef,
}: {
  /** Misst Leiste + Platz (AppShell → Auslauf des Inhalts). */
  navRef?: (el: HTMLElement | null) => void;
  /** Platz über den Reitern für die Hauptaktion einer Seite (Portal). */
  slotRef?: (el: HTMLDivElement | null) => void;
}) {
  const pathname = usePathname();

  // Bildschirmtastatur (iOS): das Layout-Viewport schrumpft nicht, feste
  // Elemente lägen hinter der Tastatur. Liegt der Fokus IM Platz über den
  // Reitern (ATLAS-Eingabe), wandert er über die Tastatur; liegt er woanders
  // (Wunschfeld, Formular), tritt die Leiste zurück und verdeckt nichts.
  const eigen = useRef<HTMLElement | null>(null);
  const setRef = useCallback(
    (el: HTMLElement | null) => {
      eigen.current = el;
      navRef?.(el);
    },
    [navRef],
  );
  const [tastatur, setTastatur] = useState(0);
  const [fokusDrin, setFokusDrin] = useState(false);
  useEffect(() => {
    const vv = window.visualViewport;
    const miss = () => {
      if (!vv) return;
      const rest = window.innerHeight - vv.height - vv.offsetTop;
      // Unter 80 px ist es die Adressleiste, keine Tastatur.
      setTastatur(rest > 80 ? Math.round(rest) : 0);
    };
    const fokus = () => setFokusDrin(!!eigen.current?.contains(document.activeElement));
    miss();
    vv?.addEventListener("resize", miss);
    vv?.addEventListener("scroll", miss);
    document.addEventListener("focusin", fokus);
    document.addEventListener("focusout", fokus);
    return () => {
      vv?.removeEventListener("resize", miss);
      vv?.removeEventListener("scroll", miss);
      document.removeEventListener("focusin", fokus);
      document.removeEventListener("focusout", fokus);
    };
  }, []);
  const offen = tastatur > 0;

  return (
    <nav
      ref={setRef}
      className={cn("fixed inset-x-0 bottom-0 z-30", offen && !fokusDrin && "invisible")}
      style={offen && fokusDrin ? { transform: `translateY(-${tastatur}px)` } : undefined}
    >
      <div ref={slotRef} className="border-t border-line bg-surface-0 px-5 py-3 empty:hidden" />
      <div
        className={cn("border-t-dick border-rand bg-surface-1 px-2.5 pt-2", offen && "hidden")}
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
      <div className="mx-auto flex max-w-md">
        {tabs.map(({ href, label, Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <PressableLink
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "mx-0.5 mb-1.5 flex flex-1 flex-col items-center justify-center gap-1 rounded-inner py-1.5 text-4xs font-bold focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-fokus",
                active ? "bg-accent text-on-accent" : "text-muted",
              )}
            >
              <Icon size={22} strokeWidth={active ? 2.2 : 1.8} aria-hidden />
              {label}
            </PressableLink>
          );
        })}
      </div>
      </div>
    </nav>
  );
}
