"use client";

import { X } from "lucide-react";
import { Pressable } from "@/components/ui/pressable";
import { cn } from "@/lib/utils";
import type { CoachCard as Card, CoachSeverity } from "@/lib/advisor";

const sevSurface: Record<CoachSeverity, string> = {
  urgent: "bg-rose-950",
  warn: "bg-neutral-900",
  info: "bg-neutral-900",
};
const sevTitle: Record<CoachSeverity, string> = {
  urgent: "text-rose-200",
  warn: "text-status-over",
  info: "text-neutral-100",
};

export function CoachCard({
  card,
  onAccept,
  onDismiss,
}: {
  card: Card;
  onAccept?: () => void;
  onDismiss?: () => void;
}) {
  return (
    <div className={cn("rounded-2xl p-4", sevSurface[card.severity])}>
      <div className="flex items-start justify-between gap-3">
        <p className={cn("text-sm font-semibold", sevTitle[card.severity])}>
          {card.title}
        </p>
        {onDismiss && (
          <Pressable
            onClick={onDismiss}
            aria-label="Ausblenden"
            className="shrink-0 rounded p-0.5 text-neutral-500 focus:outline-none"
          >
            <X size={15} />
          </Pressable>
        )}
      </div>
      <p className="mt-1 text-xs leading-relaxed text-neutral-400">{card.body}</p>
      {card.action === "deload" && onAccept && (
        <Pressable
          onClick={onAccept}
          className="mt-3 rounded-xl bg-neutral-100 px-3 py-2 text-sm font-medium text-neutral-950 focus:outline-none"
        >
          Entlastungswoche starten
        </Pressable>
      )}
    </div>
  );
}
