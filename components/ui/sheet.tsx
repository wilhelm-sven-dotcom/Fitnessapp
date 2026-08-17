"use client";

import { AnimatePresence, motion, useDragControls, useReducedMotion } from "framer-motion";
import { useEffect, useId, useRef } from "react";
import { FILM, TRANSPORT_AUS, TRANSPORT_EIN } from "@/lib/motion";

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';

/**
 * Bottom sheet used by every modal in the app. Accessibility contract:
 * focus moves INTO the panel on open, Tab cycles inside it (trap), Escape
 * closes, and focus returns to the trigger on close — otherwise keyboard/
 * VoiceOver users keep operating the page behind the backdrop.
 * Motion = Filmtransport (Handoff motion/): Scrim steht SOFORT auf 40 %
 * Tinte und fällt hart; das Sheet transportiert in 213 ms von unten mit
 * leichtem Überschuss und rastet nach 47 ms ein (Keyframe 82 % + Sprung),
 * Abgang 180 ms Transport-aus. Reduced motion: harte Schnitte (0 ms).
 */
export function Sheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}) {
  const reduce = useReducedMotion();
  const dragControls = useDragControls();
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const restoreRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    restoreRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    // Focus after the mount frame so the enter animation doesn't fight it.
    const t = window.setTimeout(() => panelRef.current?.focus(), 30);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key !== "Tab") return;
      const panel = panelRef.current;
      if (!panel) return;
      const items = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) => el.offsetParent !== null,
      );
      if (!items.length) {
        e.preventDefault();
        panel.focus();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && (active === first || active === panel)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
      window.clearTimeout(t);
      restoreRef.current?.focus();
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50">
          {/* Scrim: flache 40 % Tinte (Archiv-Tinte in beiden Modi — das
              Atelier kennt keinen hellen Schleier), erscheint und fällt HART. */}
          <motion.div
            className="absolute inset-0"
            style={{ backgroundColor: "rgba(34, 28, 20, 0.4)" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: { duration: 0 } }}
            exit={{ opacity: 0, transition: { duration: 0 } }}
            onClick={onClose}
          />
          <motion.div
            ref={panelRef}
            tabIndex={-1}
            className="absolute inset-x-0 bottom-0 mx-auto max-w-md rounded-t-card border border-line-card bg-surface-1 focus:outline-none"
            initial={reduce ? { opacity: 0 } : { y: "103%" }}
            animate={
              reduce
                ? { opacity: 1, transition: { duration: 0 } }
                : {
                    // Überschuss in % statt px (Framer mischt keine Einheiten):
                    // −1,2 % ≈ 4–7 px je Sheet-Höhe, Raste = gehaltener Frame + Sprung.
                    y: ["103%", "-1.2%", "-1.2%", "0%"],
                    transition: {
                      duration: FILM.sheetAuf,
                      times: [0, 0.82, 0.999, 1],
                      ease: [TRANSPORT_EIN, "linear", "linear"],
                    },
                  }
            }
            exit={
              reduce
                ? { opacity: 0, transition: { duration: 0 } }
                : { y: "103%", transition: { duration: FILM.sheetZu, ease: TRANSPORT_AUS } }
            }
            drag="y"
            dragControls={dragControls}
            dragListener={false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 1 }}
            onDragEnd={(_, info) => {
              // Swipe the sheet down past a threshold (or with a downward flick)
              // to dismiss; otherwise it springs back to its resting position
              // (the drag constraint at y:0) — no half-open state.
              if (info.offset.y > 110 || info.velocity.y > 500) onClose();
            }}
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? titleId : undefined}
          >
            {/* Grab zone = handle pill + title. Pointer-down here starts the
                drag (dragListener is off), so swiping the scrollable content /
                video below scrolls normally and never drags the sheet. Swipe
                this zone down to dismiss. */}
            <div
              onPointerDown={(e) => dragControls.start(e)}
              className="cursor-grab select-none active:cursor-grabbing"
              style={{ touchAction: "none" }}
            >
              <div className="flex justify-center pb-1 pt-3">
                <span className="h-1 w-9 rounded-pill bg-muted" />
              </div>
              {title && (
                <div className="px-5 pb-1 pt-2">
                  <h3 id={titleId} className="font-display text-2xl italic">
                    {title}
                  </h3>
                </div>
              )}
            </div>
            <div
              // overscroll-contain: am Listenende kein Durchscrollen auf die
              // Seite dahinter — das Sheet bleibt eine eigene Scroll-Welt.
              className="overflow-y-auto overscroll-contain px-5 pt-2"
              style={{
                maxHeight: "78vh",
                paddingBottom: "calc(env(safe-area-inset-bottom) + 2rem)",
              }}
            >
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
