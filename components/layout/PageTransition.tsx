"use client";

import { usePathname } from "next/navigation";

/**
 * Per-route enter transition. A keyed element re-runs the CSS `.page-in`
 * animation on every navigation (see globals.css).
 *
 * Deliberately CSS and NOT framer-motion `AnimatePresence mode="wait"`: that
 * mode keeps the incoming page unmounted until the outgoing page's exit
 * animation reports complete, and if that completion callback is ever dropped
 * — a known Next App-Router + framer edge case, observed on iOS standalone —
 * the next page never mounts, leaving blank content under a working shell (the
 * header + bottom nav live outside this wrapper, so they stay visible). The CSS
 * approach can't deadlock and rests at the visible end state, so a route can
 * never get stuck invisible.
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div key={pathname} className="page-in">
      {children}
    </div>
  );
}
