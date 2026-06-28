"use client";

import { X } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Pressable } from "@/components/ui/pressable";
import { cn } from "@/lib/utils";
import type { CoachCard as CoachCardData, CoachSeverity } from "@/lib/advisor";

const sevSurface: Record<CoachSeverity, string> = {
  urgent: "border-rose-900 bg-rose-950",
  warn: "",
  info: "",
};
const sevTitle: Record<CoachSeverity, string> = {
  urgent: "text-rose-200",
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
          className="mt-3 rounded-xl bg-strong px-3 py-2 text-sm font-medium text-on-strong focus:outline-none"
        >
          Entlastungswoche starten
        </Pressable>
      )}
    </Card>
  );
}
