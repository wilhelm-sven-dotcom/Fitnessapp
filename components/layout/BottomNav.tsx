"use client";

import { BarChart3, CalendarDays, List, Sparkles, type LucideIcon } from "lucide-react";
import { usePathname } from "next/navigation";
import { PressableLink } from "@/components/ui/PressableLink";
import { cn } from "@/lib/utils";

/** Tab-Leiste „Regionen“: vier Reiter mit Symbol und Text. Aktiv in Tinte,
 *  inaktiv als Hinweis-Schrift; kein gleitender Marker. */
const tabs: readonly { href: string; label: string; Icon: LucideIcon }[] = [
  { href: "/", label: "Heute", Icon: CalendarDays },
  { href: "/uebungen", label: "Katalog", Icon: List },
  { href: "/fortschritt", label: "Fortschritt", Icon: BarChart3 },
  { href: "/coach", label: "ATLAS", Icon: Sparkles },
];

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface-1"
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
                "flex flex-1 flex-col items-center justify-center gap-1 pb-2 pt-2.5 text-4xs font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-fokus",
                active ? "text-fg" : "text-faint",
              )}
            >
              <Icon size={22} strokeWidth={active ? 2.2 : 1.8} aria-hidden />
              {label}
            </PressableLink>
          );
        })}
      </div>
    </nav>
  );
}
