"use client";

import { useState } from "react";
import { BodyTab } from "@/components/fortschritt/BodyTab";
import { HistoryTab } from "@/components/fortschritt/HistoryTab";
import { MyologieTab } from "@/components/fortschritt/MyologieTab";
import { OverviewTab } from "@/components/fortschritt/OverviewTab";
import { PageHeader } from "@/components/ui/PageHeader";
import { Pressable } from "@/components/ui/pressable";
import { cn } from "@/lib/utils";

type Segment = "uebersicht" | "verlauf" | "koerper" | "myologie";

const SEGMENTS: { key: Segment; label: string }[] = [
  { key: "uebersicht", label: "Übersicht" },
  { key: "verlauf", label: "Verlauf" },
  { key: "koerper", label: "Körper" },
  { key: "myologie", label: "Muskeln" },
];

/** Fortschritt: Trends, die vereinte Kraft+Cardio-Timeline und der Körper —
 *  eine Seite mit drei ruhigen Segmenten statt vier verstreuter Routen. */
export default function FortschrittPage() {
  const [seg, setSeg] = useState<Segment>("uebersicht");

  return (
    <div>
      <PageHeader eyebrow="Deine Zahlen" title="Fortschritt" />

      <div className="mb-4 flex border-b border-line">
        {SEGMENTS.map((s) => (
          <Pressable
            key={s.key}
            onClick={() => setSeg(s.key)}
            aria-pressed={seg === s.key}
            className={cn(
              "relative flex-1 pb-3 pt-2 font-mono text-4xs font-semibold uppercase tracking-gesperrt focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-cyanotypie",
              seg === s.key ? "text-cyanotypie" : "text-muted",
            )}
          >
            {seg === s.key && (
              <span
                aria-hidden
                className="absolute inset-x-0 bottom-0 h-0.5 bg-cyanotypie"
                style={{ marginBottom: -1 }}
              />
            )}
            {s.label}
          </Pressable>
        ))}
      </div>

      {seg === "uebersicht" && <OverviewTab />}
      {seg === "verlauf" && <HistoryTab />}
      {seg === "koerper" && <BodyTab />}
      {seg === "myologie" && <MyologieTab />}
    </div>
  );
}
