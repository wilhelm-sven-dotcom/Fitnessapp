"use client";

import { Clock } from "lucide-react";

export function SessionTimeBar({
  estMin,
  budgetMin,
}: {
  estMin: number;
  budgetMin: number;
}) {
  const pct = Math.min(100, (estMin / Math.max(budgetMin, 1)) * 100);
  return (
    <div className="mb-4 rounded-2xl bg-neutral-900 px-4 py-3">
      <div className="flex items-center justify-between text-sm">
        <span className="flex items-center gap-1.5 text-neutral-300">
          <Clock size={15} /> ca. {estMin} Min
        </span>
        <span className="text-xs text-neutral-500">Ziel {budgetMin} Min</span>
      </div>
      <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-neutral-800">
        <div
          className="h-full rounded-full bg-accent-coverage transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
