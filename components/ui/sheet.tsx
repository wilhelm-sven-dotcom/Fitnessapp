"use client";

import { AnimatePresence, motion, useDragControls, useReducedMotion } from "framer-motion";
import { useEffect, useId, useRef } from "react";

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';

/**
 * Bottom sheet used by every modal in the app. Accessibility contract:
 * focus moves INTO the panel on open, Tab cycles inside it (trap), Escape
 * closes, and focus returns to the trigger on close — otherwise keyboard/
 * VoiceOver users keep operating the page behind the backdrop. Honors
 * reduced motion (fade instead of the spring slide).
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
          <motion.div
            className="absolute inset-0 bg-black backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.6 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />
          <motion.div
            ref={panelRef}
            tabIndex={-1}
            className="absolute inset-x-0 bottom-0 mx-auto max-w-md rounded-t-card border border-surface-3 bg-surface-1 shadow-card focus:outline-none"
            initial={reduce ? { opacity: 0 } : { y: "100%" }}
            animate={reduce ? { opacity: 1 } : { y: 0 }}
            exit={reduce ? { opacity: 0 } : { y: "100%" }}
            transition={reduce ? { duration: 0.15 } : { type: "spring", stiffness: 360, damping: 36 }}
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
                <span className="h-1.5 w-10 rounded-full bg-surface-3" />
              </div>
              {title && (
                <div className="px-5 pb-1 pt-3">
                  <h3 id={titleId} className="text-lg font-semibold tracking-tight">
                    {title}
                  </h3>
                </div>
              )}
            </div>
            <div
              className="overflow-y-auto px-5 pb-8 pt-2"
              style={{ maxHeight: "78vh" }}
            >
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
