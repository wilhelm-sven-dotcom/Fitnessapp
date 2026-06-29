"use client";

/**
 * The home signature — weekly tonnage as a calibrated instrument. Ships both
 * skin variants and reveals one via the global .only-blueprint/.only-tactile
 * toggle (data-skin, set pre-paint → no JS branch, no hydration flash):
 *   · blueprint — a machinist's measuring ruler with a red index marker.
 *   · tactile   — a machined half-dial with an amber needle.
 * Colours come from --accent / --accent-2 / token classes, so each variant
 * also respects light/dark.
 */

interface Props {
  /** This week's tonnage (display value). */
  valueT: number;
  /** Weekly tonnage target = the ruler/dial full scale. */
  targetT: number;
}

// Half-dial geometry (tactile): points along the arc, left = 0 → right = max.
const CX = 132;
const CY = 128;
const R = 106;
const polar = (frac: number, rad: number): [number, number] => {
  const t = ((180 - frac * 180) * Math.PI) / 180;
  return [CX + rad * Math.cos(t), CY - rad * Math.sin(t)];
};
const arcPath = (from: number, to: number, rad: number, steps = 56) =>
  Array.from({ length: steps + 1 }, (_, k) => polar(from + ((to - from) * k) / steps, rad))
    .map(([x, y], k) => `${k ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`)
    .join(" ");

export function VolumeGauge({ valueT, targetT }: Props) {
  const max = targetT > 0 ? targetT : Math.max(valueT, 1);
  const frac = Math.max(0, Math.min(1, valueT / max));
  const pct = Math.round(frac * 100);
  const value = valueT.toLocaleString("de-DE", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const goal = max.toLocaleString("de-DE", { maximumFractionDigits: max >= 10 ? 0 : 1 });
  const [nx, ny] = polar(frac, R - 18);

  return (
    <div>
      <div className="flex items-baseline justify-between">
        <p className="font-mono text-xs uppercase tracking-widest text-accent-2">
          Volumen · diese Woche
        </p>
        <p className="font-mono text-xs uppercase tracking-widest text-faint">
          {pct}% vom Ziel
        </p>
      </div>

      {/* ── Blueprint: measuring ruler ─────────────────────────────────── */}
      <div className="only-blueprint">
        <div className="mt-1.5 flex items-baseline gap-2">
          <span className="font-display text-6xl font-extrabold leading-none tracking-tight text-fg tabular-nums">
            {value}
          </span>
          <span className="text-lg text-muted">t</span>
        </div>
        <div className="relative mt-5 h-6 border-t border-line">
          {Array.from({ length: 21 }).map((_, i) => (
            <span
              key={i}
              aria-hidden
              className={i % 5 === 0 ? "absolute top-0 w-px bg-accent-2" : "absolute top-0 w-px bg-line"}
              style={{ left: `${i * 5}%`, height: i % 5 === 0 ? 10 : 5 }}
            />
          ))}
          <span
            aria-hidden
            className="absolute -top-0.5 w-0.5 bg-accent-sessions"
            style={{ left: `${pct}%`, height: 16 }}
          />
          <span
            aria-hidden
            className="absolute -top-2.5 -translate-x-1/2 text-xs text-accent-sessions"
            style={{ left: `${pct}%` }}
          >
            ▼
          </span>
          <span className="absolute top-3 left-0 font-mono text-xs text-faint">0</span>
          <span className="absolute top-3 right-0 font-mono text-xs text-faint">
            {goal} t · Ziel
          </span>
        </div>
      </div>

      {/* ── Tactile: machined half-dial ────────────────────────────────── */}
      <div className="only-tactile">
        <div className="relative mt-1">
          <svg viewBox="0 0 264 150" className="block w-full">
            <path d={arcPath(0, 1, R)} fill="none" stroke="var(--surface-2)" strokeWidth={10} strokeLinecap="round" />
            <path d={arcPath(0, frac, R)} fill="none" stroke="var(--accent)" strokeWidth={10} strokeLinecap="round" />
            {Array.from({ length: 11 }).map((_, i) => {
              const f = i / 10;
              const [ox, oy] = polar(f, R - 16);
              const [ix, iy] = polar(f, i % 5 === 0 ? R - 30 : R - 24);
              return (
                <line
                  key={i}
                  x1={ox}
                  y1={oy}
                  x2={ix}
                  y2={iy}
                  stroke={i % 5 === 0 ? "var(--muted)" : "var(--line)"}
                  strokeWidth={i % 5 === 0 ? 2 : 1}
                />
              );
            })}
            <line x1={CX} y1={CY} x2={nx} y2={ny} stroke="var(--accent)" strokeWidth={3} strokeLinecap="round" />
            <circle cx={CX} cy={CY} r={9} fill="var(--card)" stroke="var(--line)" strokeWidth={2} />
            <circle cx={CX} cy={CY} r={3} fill="var(--accent)" />
          </svg>
          <div className="absolute inset-x-0 bottom-0.5 text-center">
            <span className="font-mono text-4xl font-bold tracking-tight text-fg tabular-nums">{value}</span>
            <span className="ml-1 text-base text-muted">t</span>
          </div>
        </div>
        <div className="flex justify-between font-mono text-xs text-faint">
          <span>0</span>
          <span>{goal} t · Ziel</span>
        </div>
      </div>
    </div>
  );
}
