"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDays,
  Flame,
  History as HistoryIcon,
  TrendingUp,
} from "lucide-react";
import { SPRING } from "@/lib/motion";
import { cn } from "@/lib/utils";

const tabs = [
  { href: "/", label: "Heute", Icon: Flame },
  { href: "/plan", label: "Plan", Icon: CalendarDays },
  { href: "/progress", label: "Trends", Icon: TrendingUp },
  { href: "/history", label: "Verlauf", Icon: HistoryIcon },
] as const;

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav
      className="glass fixed inset-x-0 bottom-0 z-30 border-t border-line"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="mx-auto flex max-w-md">
        {tabs.map(({ href, label, Icon }) => {
          const active =
            href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className="relative flex flex-1 flex-col items-center gap-1 pb-2 pt-3 focus:outline-none"
            >
              <Icon
                size={20}
                strokeWidth={active ? 2.5 : 2}
                className={cn(
                  "transition-colors",
                  active ? "text-fg" : "text-muted",
                )}
              />
              <span className="relative flex h-1 w-6 items-center justify-center">
                {active && (
                  <motion.span
                    layoutId="navPill"
                    className="absolute inset-0 rounded-full bg-accent-sessions"
                    style={{ boxShadow: "0 0 10px -1px var(--accent)" }}
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
