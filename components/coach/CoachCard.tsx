"use client";

import { X } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Pressable } from "@/components/ui/pressable";
import { cn } from "@/lib/utils";
import type { CoachCard as CoachCardData, CoachSeverity } from "@/lib/advisor";

// Hinweis-Karte Platte 311: Kicker „HINWEIS · {KATEGORIE}", Dringlichkeit als
// Siegellack-Rahmen/-Kicker — kein Farbfeld (das Archiv bleibt nüchtern).
const sevSurface: Record<CoachSeverity, string> = {
  urgent: "border-accent-ink",
  warn: "",
  info: "",
};
const sevKicker: Record<CoachSeverity, string> = {
  urgent: "text-accent-ink",
  warn: "text-messing",
  info: "text-muted",
};
const sevLabel: Record<CoachSeverity, string> = {
  urgent: "Dringend",
  warn: "Achtung",
  info: "Befund",
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
              "font-mono text-3xs font-semibold uppercase tracking-gesperrt",
              sevKicker[card.severity],
            )}
          >
            Hinweis · {sevLabel[card.severity]}
          </p>
          <p className="mt-1 text-sm font-semibold text-fg">{card.title}</p>
        </div>
        {onDismiss && (
          <Pressable
            onClick={onDismiss}
            aria-label="Ausblenden"
            // 44-px-Ziel ohne Layout-Versatz: negative Margin frisst das Padding.
            className="-m-2.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-muted focus:outline-none"
          >
            <X size={15} />
          </Pressable>
        )}
      </div>
      <p className="mt-1 text-xs leading-relaxed text-muted">{card.body}</p>
      {card.action === "deload" && onAccept && (
        <Pressable
          onClick={onAccept}
          className="mt-3 rounded-pill bg-accent-sessions px-3 py-2 font-mono text-xs font-semibold uppercase tracking-gesperrt-2 text-on-accent active:bg-accent-press focus:outline-none focus-visible:ring-2 focus-visible:ring-cyanotypie"
        >
          Entlastungswoche starten
        </Pressable>
      )}
      {card.action === "exam" && onAccept && (
        <Pressable
          onClick={onAccept}
          className="mt-3 rounded-pill bg-accent-sessions px-3 py-2 font-mono text-xs font-semibold uppercase tracking-gesperrt-2 text-on-accent active:bg-accent-press focus:outline-none focus-visible:ring-2 focus-visible:ring-cyanotypie"
        >
          Prüfung antreten
        </Pressable>
      )}
      {card.action === "back-reset" && onAccept && (
        <Pressable
          onClick={onAccept}
          className="mt-3 rounded-pill bg-accent-sessions px-3 py-2 font-mono text-xs font-semibold uppercase tracking-gesperrt-2 text-on-accent active:bg-accent-press focus:outline-none focus-visible:ring-2 focus-visible:ring-cyanotypie"
        >
          Rücken-Reset starten
        </Pressable>
      )}
    </Card>
  );
}
