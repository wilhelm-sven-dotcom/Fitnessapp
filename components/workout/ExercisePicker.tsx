"use client";

import { Check } from "lucide-react";
import { Pressable } from "@/components/ui/pressable";
import { Sheet } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import type { Exercise } from "@/lib/types";

export function ExercisePicker({
  open,
  onClose,
  pool,
  currentId,
  onPick,
}: {
  open: boolean;
  onClose: () => void;
  pool: Exercise[];
  currentId: string;
  onPick: (id: string) => void;
}) {
  return (
    <Sheet open={open} onClose={onClose} title="Übung wählen">
      <div className="space-y-1.5">
        {pool.map((opt) => {
          const active = opt.id === currentId;
          return (
            <Pressable
              key={opt.id}
              onClick={() => {
                onPick(opt.id);
                onClose();
              }}
              className={cn(
                "flex w-full items-center justify-between gap-2 rounded-xl px-4 py-3 text-left focus:outline-none",
                active ? "bg-amber-950" : "bg-neutral-800",
              )}
            >
              <span className="text-sm text-neutral-100">{opt.name}</span>
              {active ? (
                <Check size={16} className="shrink-0 text-amber-400" />
              ) : (
                <span className="shrink-0 font-mono text-xs text-neutral-500">
                  {opt.tag}
                </span>
              )}
            </Pressable>
          );
        })}
      </div>
    </Sheet>
  );
}
