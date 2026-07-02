"use client";

import { Clock } from "lucide-react";

export function DurationBadge({ min }: { min: number }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-card bg-surface-2 px-2.5 py-1 text-xs font-medium text-muted">
      <Clock size={13} /> ca. {min} Min
    </span>
  );
}
