"use client";

import { CornerDownLeft } from "lucide-react";
import { useState } from "react";
import { Pressable } from "@/components/ui/pressable";

/**
 * Wunsch-Feld für die Komposition: „heute Fokus Schultern”, „nur 20 Minuten,
 * ohne Beine”, … ATLAS bezieht den Wunsch in die nächste Einheit ein.
 */
export function WishBar({
  onSubmit,
  disabled,
}: {
  onSubmit: (wish: string) => void;
  disabled?: boolean;
}) {
  const [wish, setWish] = useState("");

  const submit = () => {
    const w = wish.trim();
    if (!w) return;
    onSubmit(w);
    setWish("");
  };

  return (
    <div className="flex gap-2">
      <input
        value={wish}
        onChange={(e) => setWish(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") submit();
        }}
        disabled={disabled}
        placeholder="Wunsch für heute? (z. B. „Fokus Schultern”)"
        aria-label="Wunsch für die heutige Einheit"
        className="min-w-0 flex-1 rounded-pill bg-surface-2 px-3 py-2.5 text-sm text-fg placeholder:text-faint focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-sessions disabled:opacity-50"
      />
      <Pressable
        onClick={submit}
        disabled={disabled || !wish.trim()}
        aria-label="Wunsch an ATLAS senden"
        className="shrink-0 rounded-pill bg-surface-2 px-3 py-2.5 text-sm font-medium text-fg focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-sessions disabled:opacity-40"
      >
        <CornerDownLeft size={16} />
      </Pressable>
    </div>
  );
}
