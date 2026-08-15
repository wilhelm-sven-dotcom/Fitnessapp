"use client";

import { useState } from "react";
import { BalanceRadar } from "./BalanceRadar";
import { Card } from "@/components/ui/Card";
import { balanceRatios, radarAxes } from "@/lib/balance";
import { cn } from "@/lib/utils";
import type { Muscle } from "@/lib/types";
import type { MuscleVolume } from "@/lib/volume";

const fmt = (n: number) => n.toLocaleString("de-DE", { maximumFractionDigits: 1 });

/**
 * Muskel-Balance: großes, antippbares Radar mit festem Scoreboard-Slot
 * darüber (kein Layout-Sprung) — ohne Auswahl die Wochensumme, mit Auswahl
 * „Muskel · Sätze / Zielband". Optional liegt die Vorwoche als gestrichelte
 * Kontur hinter den aktuellen Daten.
 */
export function MuscleBalanceCard({
  muscleVolumes,
  prevMuscleVolumes,
}: {
  muscleVolumes: MuscleVolume[];
  prevMuscleVolumes?: MuscleVolume[];
}) {
  const [selected, setSelected] = useState<Muscle | null>(null);
  if (!muscleVolumes.some((m) => m.sets > 0)) return null;
  const axes = radarAxes(muscleVolumes);
  const ghost =
    prevMuscleVolumes && prevMuscleVolumes.some((m) => m.sets > 0)
      ? radarAxes(prevMuscleVolumes)
      : undefined;
  const ratios = balanceRatios(muscleVolumes);
  const total = muscleVolumes.reduce((s, m) => s + m.sets, 0);
  const sel = selected ? axes.find((a) => a.muscle === selected) : undefined;

  return (
    <Card className="mb-3">
      <p className="mb-1 font-mono text-xs uppercase tracking-widest text-muted">
        Muskel-Balance
      </p>
      <p className="mb-2 text-xs text-muted">
        Außenrand = oberes Wochenziel je Muskel · gestrichelt = unteres Ziel.
        Achse antippen für Details.
      </p>
      {/* Fester Scoreboard-Slot — wechselt zwischen Summe und Auswahl. */}
      <div className="mb-1 flex min-h-10 items-baseline gap-2">
        {sel ? (
          <>
            <span className="stretch-display font-display text-3xl font-bold tabular-nums leading-none text-fg">
              {fmt(sel.sets)}
            </span>
            <span className="text-sm text-muted">
              {sel.label} · Ziel {sel.target.min}–{sel.target.max} Sätze
            </span>
          </>
        ) : (
          <>
            <span className="stretch-display font-display text-3xl font-bold tabular-nums leading-none text-fg">
              {fmt(total)}
            </span>
            <span className="text-sm text-muted">Sätze diese Woche</span>
          </>
        )}
      </div>
      <BalanceRadar axes={axes} ghost={ghost} selected={selected} onSelect={setSelected} />
      {ghost && (
        <p className="mt-1 text-center font-mono text-xs text-faint">
          gestrichelte Kontur = Vorwoche
        </p>
      )}
      <div className="mt-3 space-y-2">
        {ratios.map((r) => (
          <div key={r.key} className="flex items-center justify-between gap-3 text-sm">
            <span className="text-muted">{r.label}</span>
            <div className="flex items-center gap-2">
              <span className="font-mono tabular-nums text-muted">
                {fmt(r.a)} : {fmt(r.b)}
              </span>
              <span
                className={cn(
                  "rounded-sm px-1.5 py-0.5 text-xs font-medium text-on-color",
                  r.status === "balanced" ? "bg-accent-volume" : "bg-status-over",
                )}
              >
                {r.status === "balanced" ? "im Lot" : "Ungleichgewicht"}
              </span>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
