"use client";

import { Zap } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Pressable } from "@/components/ui/pressable";
import { beep, beepEnd, primeAudio } from "@/lib/beep";
import { detectJump, jumpBand, type JumpBand, type JumpSample } from "@/lib/jump";
import { cn } from "@/lib/utils";

const WINDOW_MS = 6000;

type Phase = "idle" | "measuring" | "done" | "failed" | "unsupported";

interface DeviceMotionCtor {
  requestPermission?: () => Promise<string>;
}

/**
 * Der Zünd-Check im Tagesform-Sheet: iPhone an die Brust, ein Strecksprung —
 * 6-Sekunden-Messfenster, Freifall-Detektion, Sprunghöhe gegen den eigenen
 * 7-Tage-Schnitt. Meldet das Ergebnis nach oben (Persistenz + Energie-Ampel
 * übernimmt das Gate).
 */
export function JumpCheck({
  baseline,
  onResult,
}: {
  baseline: number | null;
  onResult: (heightCm: number, band: JumpBand | null) => void;
}) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [leftMs, setLeftMs] = useState(WINDOW_MS);
  const [result, setResult] = useState<{ heightCm: number; band: JumpBand | null } | null>(
    null,
  );
  const samples = useRef<JumpSample[]>([]);
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => () => cleanupRef.current?.(), []);

  const start = async () => {
    primeAudio();
    if (typeof window === "undefined" || !("DeviceMotionEvent" in window)) {
      setPhase("unsupported");
      return;
    }
    // iOS verlangt eine explizite Freigabe — muss in der Tap-Geste passieren.
    const ctor = window.DeviceMotionEvent as unknown as DeviceMotionCtor;
    if (typeof ctor.requestPermission === "function") {
      try {
        const perm = await ctor.requestPermission();
        if (perm !== "granted") {
          setPhase("unsupported");
          return;
        }
      } catch {
        setPhase("unsupported");
        return;
      }
    }

    samples.current = [];
    setResult(null);
    setPhase("measuring");
    setLeftMs(WINDOW_MS);
    beep();

    const onMotion = (e: DeviceMotionEvent) => {
      const g = e.accelerationIncludingGravity;
      if (!g) return;
      const a = Math.hypot(g.x ?? 0, g.y ?? 0, g.z ?? 0);
      samples.current.push({ t: performance.now(), a });
    };
    window.addEventListener("devicemotion", onMotion);

    const t0 = performance.now();
    const tick = window.setInterval(() => {
      setLeftMs(Math.max(0, WINDOW_MS - (performance.now() - t0)));
    }, 250);

    const finish = window.setTimeout(() => {
      cleanupRef.current?.();
      const jump = detectJump(samples.current);
      if (!jump) {
        setPhase("failed");
        return;
      }
      const band = jumpBand(jump.heightCm, baseline);
      setResult({ heightCm: jump.heightCm, band });
      setPhase("done");
      beepEnd();
      onResult(jump.heightCm, band);
    }, WINDOW_MS);

    cleanupRef.current = () => {
      window.removeEventListener("devicemotion", onMotion);
      window.clearInterval(tick);
      window.clearTimeout(finish);
      cleanupRef.current = null;
    };
  };

  const bandText =
    result?.band === "high"
      ? "über deinem Schnitt — Zündung stark"
      : result?.band === "low"
        ? "unter deinem Schnitt — heute eher schonen"
        : result?.band === "mid"
          ? "auf deinem Schnitt — normal belastbar"
          : "erste Messungen — dein Referenzwert entsteht";

  return (
    <div className="mb-4 rounded-card bg-surface-2 p-3" data-testid="jump-check">
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 font-mono text-xs uppercase tracking-widest text-accent-2">
          <Zap size={13} className="text-accent-ink" /> Zünd-Check
        </p>
        {phase !== "measuring" && (
          <Pressable
            onClick={() => void start()}
            className="rounded-pill bg-strong px-3 py-1.5 text-xs font-semibold text-on-strong focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-sessions"
          >
            {phase === "done" || phase === "failed" ? "Nochmal" : "Messen"}
          </Pressable>
        )}
      </div>
      {phase === "idle" && (
        <p className="mt-1.5 text-xs leading-relaxed text-muted">
          iPhone an die Brust, ein Strecksprung — die Sprunghöhe misst deine Tagesform
          objektiv{baseline ? ` (dein Schnitt: ${baseline.toFixed(1).replace(".", ",")} cm)` : ""}.
        </p>
      )}
      {phase === "measuring" && (
        <p className="mt-1.5 text-sm font-medium text-fg">
          Bereit… spring jetzt!{" "}
          <span className="font-mono tabular-nums text-muted">
            {(leftMs / 1000).toFixed(0)} s
          </span>
        </p>
      )}
      {phase === "done" && result && (
        <p className="mt-1.5 text-sm text-fg">
          <span
            className={cn(
              "font-display text-2xl font-bold tabular-nums",
              result.band === "low" ? "text-status-danger" : "text-accent-ink",
            )}
          >
            {String(result.heightCm).replace(".", ",")} cm
          </span>{" "}
          <span className="text-xs text-muted">— {bandText}</span>
        </p>
      )}
      {phase === "failed" && (
        <p className="mt-1.5 text-xs leading-relaxed text-muted">
          Kein Sprung erkannt — Handy fest an die Brust und beidbeinig abspringen.
        </p>
      )}
      {phase === "unsupported" && (
        <p className="mt-1.5 text-xs leading-relaxed text-muted">
          Bewegungssensor nicht freigegeben — der Check läuft nur am Handy.
        </p>
      )}
    </div>
  );
}
