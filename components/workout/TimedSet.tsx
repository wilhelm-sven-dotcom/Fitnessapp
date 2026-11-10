"use client";

import { Pause, Play, RotateCcw } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Pressable } from "@/components/ui/pressable";
import { fmtClock } from "@/lib/format";
import { cn } from "@/lib/utils";

export function TimedSet({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [run, setRun] = useState(false);
  const [el, setEl] = useState(Number(value) || 0);
  const t0 = useRef(0);

  useEffect(() => {
    if (!run) return;
    t0.current = Date.now() - el * 1000;
    const id = setInterval(
      () => setEl(Math.round((Date.now() - t0.current) / 1000)),
      250,
    );
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run]);

  const toggle = () => {
    if (run) {
      setRun(false);
      onChange(String(el));
    } else {
      setRun(true);
    }
  };
  const reset = () => {
    setRun(false);
    setEl(0);
    onChange("");
  };

  return (
    <div className="flex min-w-0 flex-1 items-center gap-2">
      <div
        role="timer"
        aria-label="Gehaltene Zeit"
        className="min-w-0 flex-1 rounded-card bg-surface-2 py-3 text-center font-mono text-2xl tabular-nums text-fg"
      >
        {fmtClock(el)}
      </div>
      <Pressable
        onClick={toggle}
        aria-label={run ? "Stoppuhr anhalten" : "Stoppuhr starten"}
        className={cn(
          "flex h-11 w-11 shrink-0 items-center justify-center rounded-card focus:outline-none focus-visible:ring-2 focus-visible:ring-fokus",
          run ? "bg-accent text-on-accent" : "bg-surface-2 text-accent-ink",
        )}
      >
        {run ? <Pause size={18} strokeWidth={2.5} /> : <Play size={18} strokeWidth={2.5} />}
      </Pressable>
      <Pressable
        onClick={reset}
        aria-label="Stoppuhr zurücksetzen"
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-card bg-surface-2 text-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-fokus"
      >
        <RotateCcw size={16} />
      </Pressable>
    </div>
  );
}
