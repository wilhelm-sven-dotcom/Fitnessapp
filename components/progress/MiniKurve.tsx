"use client";

const W = 72;
const H = 28;
const PAD = 3;

/**
 * Mini-Kurve für Listenzeilen (Verläufe): Treppenlinie wie die große Kurve
 * (eine Messung gilt bis zur nächsten), Endpunkt als Punkt, keine Achsen.
 * Reine Grafik — der Wert steht als Text daneben.
 */
export function MiniKurve({ werte, farbe = "var(--info)" }: { werte: number[]; farbe?: string }) {
  const n = werte.length;
  if (n === 0) return null;
  const min = Math.min(...werte);
  const max = Math.max(...werte);
  const span = max - min || 1;
  const x = (i: number) => (n === 1 ? W / 2 : PAD + (i / (n - 1)) * (W - 2 * PAD));
  const y = (v: number) => (n === 1 ? H / 2 : H - PAD - ((v - min) / span) * (H - 2 * PAD));
  const pfad = werte
    .map((v, i) => (i === 0 ? `M${x(0).toFixed(1)} ${y(v).toFixed(1)}` : `H${x(i).toFixed(1)} V${y(v).toFixed(1)}`))
    .join(" ");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} aria-hidden className="shrink-0">
      {n > 1 && (
        <path d={pfad} fill="none" stroke={farbe} strokeWidth={2} vectorEffect="non-scaling-stroke" />
      )}
      <circle cx={x(n - 1)} cy={y(werte[n - 1])} r={3} fill={farbe} />
    </svg>
  );
}
