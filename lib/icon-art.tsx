/**
 * App-Icon „Platte 311": Kollodium-dunkle Fototafel (#141210) mit dem
 * Gewichtheber in der Schluss-Phase (ob-lift-Referenzgeometrie, 48er-Raster)
 * und der Plattennummer „311" — als Stroke-Pfade, denn Satori (next/og)
 * bettet keine Fonts ein und liest keine CSS-Variablen; deshalb hier feste
 * Hexes (Spiegel von --base/--fg dunkel). Selbstständig, keine App-Imports.
 * Unter 48 px fällt die Beschriftung weg (plain: nur Tafel + Figur), damit
 * das Favicon nicht verrauscht.
 */

const TAFEL = "#141210";
const TINTE = "#e9e1ce";

/** Rasterlinien alle 8 Einheiten — ausgeschrieben, Satori-sicher. */
const GRID = [8, 16, 24, 32, 40];

export function iconArt(size: number) {
  const plain = size < 48;
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        background: TAFEL,
      }}
    >
      <svg width={size} height={size} viewBox="0 0 48 48">
        {!plain &&
          GRID.map((x) => (
            <line
              key={`v${x}`}
              x1={x}
              y1={0}
              x2={x}
              y2={48}
              stroke={TINTE}
              strokeOpacity={0.18}
              strokeWidth={0.35}
            />
          ))}
        {!plain &&
          GRID.map((y) => (
            <line
              key={`h${y}`}
              x1={0}
              y1={y}
              x2={48}
              y2={y}
              stroke={TINTE}
              strokeOpacity={0.18}
              strokeWidth={0.35}
            />
          ))}
        {/* Figur: ob-lift (Kopf/Torso/Arme/Hantel/Beine) — im Maskable-
            Sicherheitskreis zentriert (scale 0.58), plain füllt die Tafel. */}
        <g
          transform={
            plain ? "translate(2, 1) scale(0.92)" : "translate(10.4, 3.5) scale(0.58)"
          }
          stroke={TINTE}
          fill="none"
          strokeWidth={5}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="24" cy="7" r="3.5" fill={TINTE} stroke="none" />
          <line x1="24" y1="17" x2="24" y2="31" strokeWidth={9} />
          <path d="M24 17 L18 10 L17 4" />
          <path d="M24 17 L30 10 L31 4" />
          <line x1="8" y1="3" x2="40" y2="3" strokeWidth={2} />
          <circle cx="8" cy="3" r="2.5" fill={TINTE} stroke="none" />
          <circle cx="40" cy="3" r="2.5" fill={TINTE} stroke="none" />
          <path d="M24 31 L20 38 L20 44" />
          <path d="M24 31 L28 38 L28 44" />
        </g>
        {/* „311" als Strichzüge (kein Font): 3 · 1 · 1 auf 4×6-Raster. */}
        {!plain && (
          <g
            transform="translate(17.5, 35)"
            stroke={TINTE}
            fill="none"
            strokeWidth={1.3}
            strokeLinecap="square"
          >
            <path d="M0 0 L4 0 L4 3 L1.5 3 M4 3 L4 6 L0 6" />
            <path d="M6.5 1 L8 0 L8 6" />
            <path d="M11 1 L12.5 0 L12.5 6" />
          </g>
        )}
      </svg>
    </div>
  );
}
