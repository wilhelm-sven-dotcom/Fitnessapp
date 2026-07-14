"use client";

import { X } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Pressable } from "@/components/ui/pressable";
import { cn } from "@/lib/utils";
import type { CoachCard as CoachCardData, CoachSeverity } from "@/lib/advisor";

// Token-based severity — the old rose-950 surface was dark-only and unreadable
// on the light themes; a danger border + danger title reads in both.
const sevSurface: Record<CoachSeverity, string> = {
  urgent: "border-status-danger",
  warn: "",
  info: "",
};
const sevTitle: Record<CoachSeverity, string> = {
  urgent: "text-status-danger",
  warn: "text-status-over",
  info: "text-fg",
};

export function CoachCard({
  card,
  onAccept,
  onDismiss,
}: {
  card: CoachCardData;
  onAccept?: () => void;
  onDismiss?: () => void;
}) {
  return (
    <Card className={cn(sevSurface[card.severity])}>
      <div className="flex items-start justify-between gap-3">
        <p className={cn("text-sm font-semibold", sevTitle[card.severity])}>
          {card.title}
        </p>
        {onDismiss && (
          <Pressable
            onClick={onDismiss}
            aria-label="Ausblenden"
            className="shrink-0 rounded p-0.5 text-muted focus:outline-none"
          >
            <X size={15} />
          </Pressable>
        )}
      </div>
      <p className="mt-1 text-xs leading-relaxed text-muted">{card.body}</p>
      {card.action === "deload" && onAccept && (
        <Pressable
          onClick={onAccept}
          className="mt-3 rounded-card bg-strong px-3 py-2 text-sm font-medium text-on-strong focus:outline-none"
        >
          Entlastungswoche starten
        </Pressable>
      )}
      {card.action === "exam" && onAccept && (
        <Pressable
          onClick={onAccept}
          className="mt-3 rounded-card bg-strong px-3 py-2 text-sm font-medium text-on-strong focus:outline-none"
        >
          Prüfung antreten
        </Pressable>
      )}
      {card.action === "back-reset" && onAccept && (
        <Pressable
          onClick={onAccept}
          className="mt-3 rounded-card bg-strong px-3 py-2 text-sm font-medium text-on-strong focus:outline-none"
        >
          Rücken-Reset starten
        </Pressable>
      )}
    </Card>
  );
}
