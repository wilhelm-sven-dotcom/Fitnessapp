"use client";

import { Clock } from "lucide-react";

export function DurationBadge({ min }: { min: number }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-lg bg-neutral-800 px-2.5 py-1 text-xs font-medium text-neutral-300">
      <Clock size={13} /> ca. {min} Min
    </span>
  );
}
