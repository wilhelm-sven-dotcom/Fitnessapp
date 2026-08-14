"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, Dumbbell, Sparkles, TrendingUp } from "lucide-react";
import { SPRING } from "@/lib/motion";
import { cn } from "@/lib/utils";

// Wegleitsystem München ’72: jeder Bereich trägt seine Farbe — Blau = Heute,
// Orange = ATLAS/Coach, Grün = Fortschritt; der Katalog bleibt neutral.
const tabs = [
  { href: "/", label: "Heute", Icon: CalendarDays, tone: "var(--accent)" },
  { href: "/coach", label: "Coach", Icon: Sparkles, tone: "var(--orange)" },
  { href: "/uebungen", label: "Übungen", Icon: Dumbbell, tone: "var(--fg)" },
  { href: "/fortschritt", label: "Fortschritt", Icon: TrendingUp, tone: "var(--gruen)" },
] as const;

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav
      className="glass fixed inset-x-0 bottom-0 z-30 border-t border-line"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="mx-auto flex max-w-md">
        {tabs.map(({ href, label, Icon, tone }) => {
          const active =
            href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className="relative flex flex-1 flex-col items-center gap-1 rounded-card pb-2 pt-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent-ink"
            >
              <Icon
                size={20}
                strokeWidth={active ? 2.5 : 2}
                className={cn("transition-colors", !active && "text-muted")}
                style={active ? { color: tone } : undefined}
              />
              <span className="relative flex h-1 w-6 items-center justify-center">
                {active && (
                  <motion.span
                    layoutId="navPill"
                    className="absolute inset-0 rounded-full"
                    style={{ backgroundColor: tone }}
                    transition={SPRING.press}
                  />
                )}
              </span>
              <span
                className={cn(
                  "text-xs font-medium transition-colors",
                  active ? "text-fg" : "text-muted",
                )}
              >
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
