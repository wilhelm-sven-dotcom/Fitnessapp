"use client";

import { useState } from "react";
import { BodyTab } from "@/components/fortschritt/BodyTab";
import { HistoryTab } from "@/components/fortschritt/HistoryTab";
import { OverviewTab } from "@/components/fortschritt/OverviewTab";
import { PageHeader } from "@/components/ui/PageHeader";
import { Pressable } from "@/components/ui/pressable";
import { cn } from "@/lib/utils";

type Segment = "uebersicht" | "verlauf" | "koerper";

const SEGMENTS: { key: Segment; label: string }[] = [
  { key: "uebersicht", label: "Übersicht" },
  { key: "verlauf", label: "Verlauf" },
  { key: "koerper", label: "Körper" },
];

/** Fortschritt: Trends, die vereinte Kraft+Cardio-Timeline und der Körper —
 *  eine Seite mit drei ruhigen Segmenten statt vier verstreuter Routen. */
export default function FortschrittPage() {
  const [seg, setSeg] = useState<Segment>("uebersicht");

  return (
    <div>
      <PageHeader eyebrow="Deine Entwicklung" title="Fortschritt" tone="var(--gruen)" />

      <div className="mb-4 flex overflow-hidden rounded-card border border-line bg-surface-1 p-1 shadow-card">
        {SEGMENTS.map((s) => (
          <Pressable
            key={s.key}
            onClick={() => setSeg(s.key)}
            aria-pressed={seg === s.key}
            className={cn(
              "flex-1 rounded-card py-2 text-sm font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent-ink",
              seg === s.key ? "bg-surface-2 text-fg" : "text-muted",
            )}
          >
            {s.label}
          </Pressable>
        ))}
      </div>

      {seg === "uebersicht" && <OverviewTab />}
      {seg === "verlauf" && <HistoryTab />}
      {seg === "koerper" && <BodyTab />}
    </div>
  );
}
