"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect } from "react";

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
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
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
            className="absolute inset-x-0 bottom-0 mx-auto max-w-md rounded-t-3xl bg-neutral-900"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 360, damping: 36 }}
            role="dialog"
            aria-modal="true"
          >
            <div className="flex justify-center pt-3">
              <span className="h-1 w-10 rounded-full bg-neutral-700" />
            </div>
            {title && (
              <div className="px-5 pb-1 pt-3">
                <h3 className="text-lg font-semibold tracking-tight">{title}</h3>
              </div>
            )}
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
