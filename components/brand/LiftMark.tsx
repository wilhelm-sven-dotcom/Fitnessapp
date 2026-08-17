/**
 * Die Marke des Labors: Muybridges Gewichtheber in der Schluss-Phase —
 * Hantel über Kopf (Referenzgeometrie „ob-lift" aus dem Design-Handoff,
 * 48er-Raster). Zeichnet in `currentColor`, damit sie überall die Tinte des
 * Kontexts trägt; die Icon-Routen spiegeln dieselbe Geometrie mit festen
 * Hexes (lib/icon-art.tsx — Satori kann keine CSS-Variablen lesen).
 */
export function LiftMark({
  size = 24,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 50"
      className={className}
      style={{ display: "block" }}
      aria-hidden="true"
    >
      <g
        stroke="currentColor"
        fill="none"
        strokeWidth={5}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="24" cy="7" r="3.5" fill="currentColor" stroke="none" />
        <line x1="24" y1="17" x2="24" y2="31" strokeWidth={9} />
        <path d="M24 17 L18 10 L17 4" />
        <path d="M24 17 L30 10 L31 4" />
        <line x1="8" y1="3" x2="40" y2="3" strokeWidth={2} />
        <circle cx="8" cy="3" r="2.5" fill="currentColor" stroke="none" />
        <circle cx="40" cy="3" r="2.5" fill="currentColor" stroke="none" />
        <path d="M24 31 L20 38 L20 44" />
        <path d="M24 31 L28 38 L28 44" />
      </g>
    </svg>
  );
}
