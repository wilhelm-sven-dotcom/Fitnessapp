"use client";

import { useState } from "react";
import { Pressable } from "@/components/ui/pressable";
import { Sheet } from "@/components/ui/sheet";
import { readinessScore } from "@/lib/readiness";
import { cn } from "@/lib/utils";
import type { Readiness } from "@/lib/types";

const ROWS = [
  { key: "sleep", label: "Schlaf" },
  { key: "energy", label: "Energie" },
  { key: "back", label: "Rücken" },
] as const;
const OPTS = [
  { v: 1, label: "schlecht" },
  { v: 2, label: "ok" },
  { v: 3, label: "gut" },
] as const;

export function ReadinessGate({
  open,
  onClose,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (r: Readiness) => void;
}) {
  const [vals, setVals] = useState<{ sleep?: number; energy?: number; back?: number }>({});
  const complete = !!vals.sleep && !!vals.energy && !!vals.back;

  const submit = () => {
    if (!complete) return;
    const base = { sleep: vals.sleep!, energy: vals.energy!, back: vals.back! };
    onSubmit({ ...base, score: readinessScore(base) } as Readiness);
  };

  return (
    <Sheet open={open} onClose={onClose} title="Tagesform">
      <p className="mb-4 text-sm text-neutral-400">
        Kurz einschätzen — die Einheit passt sich an.
      </p>
      <div className="space-y-3">
        {ROWS.map((row) => (
          <div key={row.key}>
            <p className="mb-1.5 text-sm text-neutral-300">{row.label}</p>
            <div className="flex gap-2">
              {OPTS.map((o) => (
                <Pressable
                  key={o.v}
                  onClick={() => setVals((v) => ({ ...v, [row.key]: o.v }))}
                  className={cn(
                    "flex-1 rounded-xl py-2.5 text-sm focus:outline-none",
                    vals[row.key] === o.v
                      ? "bg-accent-sessions text-neutral-950"
                      : "bg-neutral-800 text-neutral-400",
                  )}
                >
                  {o.label}
                </Pressable>
              ))}
            </div>
          </div>
        ))}
      </div>
      <Pressable
        onClick={submit}
        disabled={!complete}
        className="mt-5 w-full rounded-2xl bg-neutral-100 py-3.5 text-base font-semibold text-neutral-950 focus:outline-none disabled:opacity-40"
      >
        Los geht&apos;s
      </Pressable>
      <Pressable
        onClick={onClose}
        className="mt-2 w-full rounded-xl py-2.5 text-sm text-neutral-400 focus:outline-none"
      >
        Überspringen
      </Pressable>
    </Sheet>
  );
}
