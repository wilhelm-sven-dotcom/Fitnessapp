"use client";

import { Send } from "lucide-react";
import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/Button";
import { Pressable } from "@/components/ui/pressable";

/**
 * Eingabe an ATLAS als Dock über der Tab-Leiste (Portal in den NavSlot):
 * Vorschläge als Chips direkt über dem Feld, darunter Feld und Senden. Die
 * Tab-Leiste hebt das Dock über die iOS-Tastatur (BottomNav).
 */
export function AtlasEingabe({
  slot,
  value,
  onChange,
  onSend,
  busy,
  vorschlaege,
}: {
  /** Ziel über der Tab-Leiste; null → das Dock steht an Ort und Stelle. */
  slot: HTMLElement | null;
  value: string;
  onChange: (v: string) => void;
  onSend: (text: string) => void;
  busy: boolean;
  /** Fragen als Chips (leer → keine Chip-Zeile). */
  vorschlaege: readonly string[];
}) {
  const feld = useRef<HTMLTextAreaElement | null>(null);
  // Mitwachsen bis vier Zeilen, dann scrollt das Feld selbst.
  useEffect(() => {
    const el = feld.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }, [value]);

  const dock = (
    <div className="mx-auto max-w-md">
      {vorschlaege.length > 0 && (
        <div className="-mx-5 mb-2.5 flex gap-2 overflow-x-auto px-5" aria-label="Fragen an ATLAS">
          {vorschlaege.map((s) => (
            <Pressable
              key={s}
              onClick={() => onSend(s)}
              disabled={busy}
              className="flex min-h-10 shrink-0 items-center whitespace-nowrap rounded-pill border border-line bg-surface-1 px-3.5 text-sm font-semibold text-fg focus:outline-none focus-visible:ring-2 focus-visible:ring-fokus disabled:opacity-40"
            >
              {s}
            </Pressable>
          ))}
        </div>
      )}
      <div className="flex items-end gap-2">
        <textarea
          ref={feld}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              onSend(value);
            }
          }}
          rows={1}
          placeholder="Frag ATLAS …"
          aria-label="Nachricht an ATLAS"
          className="min-h-12 flex-1 resize-none rounded-inner border border-line bg-surface-1 px-4 py-3 text-base leading-snug text-fg placeholder:text-faint focus:outline-none focus-visible:ring-2 focus-visible:ring-fokus"
        />
        <Button
          onClick={() => onSend(value)}
          disabled={busy || !value.trim()}
          aria-label="Senden"
          className="h-12 w-12 shrink-0 p-0"
        >
          <Send size={20} strokeWidth={2.5} aria-hidden />
        </Button>
      </div>
    </div>
  );

  return slot ? createPortal(dock, slot) : dock;
}
