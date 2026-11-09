"use client";

import { X } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Pressable } from "@/components/ui/pressable";
import { cn } from "@/lib/utils";
import type { CoachCard as CoachCardData, CoachSeverity } from "@/lib/advisor";

// Hinweis-Karte: Kicker „Hinweis · {Dringlichkeit}“ in der Funktionsfarbe,
// dringend zusätzlich mit Rand — kein Farbfeld.
const sevSurface: Record<CoachSeverity, string> = {
  urgent: "border-2 border-gefahr",
  warn: "",
  info: "",
};
const sevKicker: Record<CoachSeverity, string> = {
  urgent: "text-gefahr",
  warn: "text-warnung",
  info: "text-muted",
};
const sevLabel: Record<CoachSeverity, string> = {
  urgent: "Dringend",
  warn: "Achtung",
  info: "Info",
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
        <div className="min-w-0">
          <p
            className={cn(
              "text-3xs font-bold",
              sevKicker[card.severity],
            )}
          >
            Hinweis · {sevLabel[card.severity]}
          </p>
          <p className="mt-1 text-base font-semibold text-fg">{card.title}</p>
        </div>
        {onDismiss && (
          <Pressable
            onClick={onDismiss}
            aria-label="Ausblenden"
            // 44-px-Ziel ohne Layout-Versatz: negative Margin frisst das Padding.
            className="-m-2.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-pill text-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-fokus"
          >
            <X size={18} />
          </Pressable>
        )}
      </div>
      <p className="mt-1 text-sm leading-relaxed text-muted">{card.body}</p>
      {card.action === "deload" && onAccept && (
        <Pressable
          onClick={onAccept}
          className="mt-3 flex min-h-11 items-center rounded-pill bg-accent px-4 text-sm font-bold text-on-accent active:bg-accent-press focus:outline-none focus-visible:ring-2 focus-visible:ring-fokus"
        >
          Entlastungswoche starten
        </Pressable>
      )}
      {card.action === "exam" && onAccept && (
        <Pressable
          onClick={onAccept}
          className="mt-3 flex min-h-11 items-center rounded-pill bg-accent px-4 text-sm font-bold text-on-accent active:bg-accent-press focus:outline-none focus-visible:ring-2 focus-visible:ring-fokus"
        >
          Prüfung antreten
        </Pressable>
      )}
      {card.action === "back-reset" && onAccept && (
        <Pressable
          onClick={onAccept}
          className="mt-3 flex min-h-11 items-center rounded-pill bg-accent px-4 text-sm font-bold text-on-accent active:bg-accent-press focus:outline-none focus-visible:ring-2 focus-visible:ring-fokus"
        >
          Rücken-Reset starten
        </Pressable>
      )}
    </Card>
  );
}
