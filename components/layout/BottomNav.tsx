"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Dumbbell,
  History as HistoryIcon,
  Info as InfoIcon,
  TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { href: "/", label: "Heute", Icon: Dumbbell },
  { href: "/progress", label: "Fortschritt", Icon: TrendingUp },
  { href: "/history", label: "Verlauf", Icon: HistoryIcon },
  { href: "/settings", label: "Programm", Icon: InfoIcon },
] as const;

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 bg-neutral-950"
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
                  active ? "text-amber-400" : "text-neutral-500",
                )}
              />
              <span className="relative flex h-1 w-6 items-center justify-center">
                {active && (
                  <motion.span
                    layoutId="navPill"
                    className="absolute inset-0 rounded-full bg-amber-400"
                    transition={{ type: "spring", stiffness: 400, damping: 32 }}
                  />
                )}
              </span>
              <span
                className={cn(
                  "text-xs font-medium transition-colors",
                  active ? "text-amber-400" : "text-neutral-500",
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
