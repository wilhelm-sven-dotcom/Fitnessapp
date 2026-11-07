"use client";

import { Play } from "lucide-react";
import { useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/Button";
import { Pressable } from "@/components/ui/pressable";
import { Sheet } from "@/components/ui/sheet";
import { tap } from "@/lib/haptics";
import { cn } from "@/lib/utils";

/** Fünf Stufen; alles dazwischen geht über „frei“. */
export const BUDGETS = [20, 30, 45, 60, 90];

/**
 * Zeit und Start über der Tab-Leiste (Portal in den NavSlot): die Stufen,
 * „frei“ für jede andere Minutenzahl und „Training starten“. Kein
 * Eingabefeld im Dock — „frei“ öffnet ein Blatt mit dem Feld (die
 * iOS-Tastatur verträgt sich nicht mit festen Elementen). Das Blatt bleibt
 * im normalen Baum, nur der Dock-Inhalt wandert ins Portal.
 */
export function StartDock({
  slot,
  budgetMin,
  onBudget,
  onStart,
  locked,
}: {
  /** Ziel über der Tab-Leiste; null → Inhalt steht an Ort und Stelle. */
  slot: HTMLElement | null;
  budgetMin: number;
  onBudget: (min: number) => void;
  onStart: () => void;
  /** Einheit läuft schon: nur „Training fortsetzen“, keine Zeitwahl. */
  locked?: boolean;
}) {
  const [freiOffen, setFreiOffen] = useState(false);
  const [frei, setFrei] = useState("");
  const istFrei = !BUDGETS.includes(budgetMin);

  const uebernehme = () => {
    const n = Math.round(Number(frei.replace(",", ".")));
    if (!Number.isFinite(n) || n < 10 || n > 180) return;
    setFreiOffen(false);
    if (n !== budgetMin) onBudget(n);
  };
  const freiGueltig = (() => {
    const n = Math.round(Number(frei.replace(",", ".")));
    return frei.trim() !== "" && Number.isFinite(n) && n >= 10 && n <= 180;
  })();

  const chip = (aktiv: boolean) =>
    cn(
      "flex h-10 min-w-0 flex-1 items-center justify-center rounded-pill text-sm font-semibold tabular-nums focus:outline-none focus-visible:ring-2 focus-visible:ring-fokus",
      aktiv ? "bg-strong text-on-strong" : "border border-line text-fg",
    );

  const dock = (
    <div className="mx-auto max-w-md">
      {!locked && (
        <div className="mb-2.5 flex items-center gap-1.5">
          <span className="mr-0.5 text-3xs font-semibold uppercase tracking-label text-muted">
            Zeit
          </span>
          {BUDGETS.map((b) => (
            <Pressable
              key={b}
              onClick={() => onBudget(b)}
              aria-label={`Zeitbudget ${b} Minuten`}
              aria-pressed={budgetMin === b}
              className={chip(budgetMin === b)}
            >
              {b}
            </Pressable>
          ))}
          <Pressable
            onClick={() => {
              setFrei(istFrei ? String(budgetMin) : "");
              setFreiOffen(true);
            }}
            aria-label={istFrei ? `Zeitbudget frei, ${budgetMin} Minuten` : "Zeitbudget frei wählen"}
            aria-pressed={istFrei}
            className={chip(istFrei)}
          >
            {istFrei ? budgetMin : "frei"}
          </Pressable>
        </div>
      )}
      <Button
        data-testid="start"
        size="lg"
        full
        onClick={() => {
          tap();
          onStart();
        }}
      >
        <Play size={18} strokeWidth={2.5} aria-hidden />
        {locked ? "Training fortsetzen" : "Training starten"}
      </Button>
    </div>
  );

  return (
    <>
      {slot ? createPortal(dock, slot) : dock}
      <Sheet open={freiOffen} onClose={() => setFreiOffen(false)} title="Zeit frei wählen">
        <p className="mb-3 text-sm text-muted">
          Zwischen 10 und 180 Minuten. ATLAS stellt die Einheit dafür neu zusammen.
        </p>
        <div className="flex items-center gap-2">
          <input
            type="number"
            inputMode="numeric"
            min={10}
            max={180}
            value={frei}
            autoFocus
            onChange={(e) => setFrei(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") uebernehme();
            }}
            aria-label="Zeitbudget in Minuten"
            placeholder="z. B. 50"
            className="min-w-0 flex-1 rounded-inner border border-line bg-surface-1 px-3 py-3 text-lg tabular-nums text-fg placeholder:text-faint focus:outline-none focus-visible:ring-2 focus-visible:ring-fokus"
          />
          <span className="text-base text-muted">Min</span>
        </div>
        <Button size="lg" full onClick={uebernehme} disabled={!freiGueltig} className="mt-4">
          Übernehmen
        </Button>
      </Sheet>
    </>
  );
}
