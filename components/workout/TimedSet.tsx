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
      <div className="min-w-0 flex-1 rounded-xl bg-neutral-800 py-2.5 text-center font-mono text-lg tabular-nums text-neutral-100">
        {fmtClock(el)}
      </div>
      <Pressable
        onClick={toggle}
        className={cn(
          "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl focus:outline-none",
          run ? "bg-amber-400 text-neutral-950" : "bg-neutral-800 text-amber-400",
        )}
      >
        {run ? <Pause size={18} strokeWidth={2.5} /> : <Play size={18} strokeWidth={2.5} />}
      </Pressable>
      <Pressable
        onClick={reset}
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-neutral-800 text-neutral-400 focus:outline-none"
      >
        <RotateCcw size={16} />
      </Pressable>
    </div>
  );
}
