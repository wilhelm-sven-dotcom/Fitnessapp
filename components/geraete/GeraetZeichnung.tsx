/**
 * Gezeichnete Geräte im Look „spotter“: Seitenansichten mit dicker Kontur,
 * Polster in Blau, Gewichtsblock in Sonne. Eine Zeichnung je Gerät-Key
 * (`m_*` und `cable`), alle im Feld 200 × 140 auf einer Bodenlinie, damit sie
 * nebeneinander gleich groß wirken. Steht weder ein eigenes Foto noch ein
 * mitgeliefertes Bild (`public/geraete/`) bereit, zeigt `GeraetBild` diese
 * Zeichnung.
 *
 * Varianten: `hell` (Tokens, folgt Hell/Dunkel) und `auf-blau` (weiße Kontur,
 * Polster in Sonne — für die blaue Übungskarte im Training).
 */

export type GeraetKey =
  | "m_beinpresse"
  | "m_hacksquat"
  | "m_beinstrecker"
  | "m_beinbeuger"
  | "m_rueckenstrecker"
  | "m_brustpresse"
  | "m_butterfly"
  | "m_schulterpresse"
  | "m_rudern"
  | "m_waden"
  | "cable";

interface Farben {
  rand: string;
  polster: string;
  block: string;
  metall: string;
}

const FARBEN: Record<"hell" | "auf-blau", Farben> = {
  hell: { rand: "var(--rand)", polster: "var(--accent)", block: "var(--sonne)", metall: "var(--card)" },
  "auf-blau": { rand: "#ffffff", polster: "var(--sonne)", block: "var(--sonne)", metall: "transparent" },
};

const BODEN = 128;
const S = 4.5; // Konturstärke

type T = (f: Farben) => React.ReactNode;

/** Gewichtsblock: Turm mit Führungsstangen, Platten unten, Rolle oben. */
function Turm(f: Farben, x: number, w = 34, h = 104) {
  const y = BODEN - h;
  const platten = Array.from({ length: 6 }, (_, i) => BODEN - 10 - i * 7);
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={4} fill={f.metall} stroke={f.rand} strokeWidth={S} />
      <line x1={x + w / 2} y1={y + 14} x2={x + w / 2} y2={BODEN - 52} stroke={f.rand} strokeWidth={3} />
      {platten.map((py) => (
        <rect key={py} x={x + 6} y={py - 5} width={w - 12} height={6} rx={1.5} fill={f.block} stroke={f.rand} strokeWidth={2.5} />
      ))}
      <circle cx={x + w / 2} cy={y + 10} r={6} fill={f.metall} stroke={f.rand} strokeWidth={3} />
    </g>
  );
}

/** Gepolsterte Fläche (gedreht um ihre Mitte, Winkel in Grad). */
function Polster(f: Farben, x: number, y: number, w: number, h: number, winkel = 0) {
  return (
    <rect
      x={x}
      y={y}
      width={w}
      height={h}
      rx={Math.min(h, w) / 2.4}
      fill={f.polster}
      stroke={f.rand}
      strokeWidth={S}
      transform={winkel ? `rotate(${winkel} ${x + w / 2} ${y + h / 2})` : undefined}
    />
  );
}

/** Rahmenzug aus Punkten. */
function Rahmen(f: Farben, punkte: [number, number][], breite = S) {
  return (
    <polyline
      points={punkte.map((p) => p.join(",")).join(" ")}
      fill="none"
      stroke={f.rand}
      strokeWidth={breite}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  );
}

/** Runde Polsterrolle (Fuß-/Knöchelrolle). */
function Rolle(f: Farben, cx: number, cy: number, r = 8) {
  return <circle cx={cx} cy={cy} r={r} fill={f.polster} stroke={f.rand} strokeWidth={S} />;
}

/** Hantelscheibe (für Geräte mit Scheiben statt Block). */
function Scheibe(f: Farben, cx: number, cy: number, r = 15) {
  return (
    <g>
      <circle cx={cx} cy={cy} r={r} fill={f.block} stroke={f.rand} strokeWidth={S} />
      <circle cx={cx} cy={cy} r={3.5} fill={f.rand} />
    </g>
  );
}

/** Griff: kurzer dicker Strich mit Endkappen. */
function Griff(f: Farben, x1: number, y1: number, x2: number, y2: number) {
  return <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={f.rand} strokeWidth={7} strokeLinecap="round" />;
}

function Boden(f: Farben) {
  return <line x1={8} y1={BODEN + 2} x2={192} y2={BODEN + 2} stroke={f.rand} strokeWidth={S} strokeLinecap="round" />;
}

const ZEICHNUNG: Record<GeraetKey, T> = {
  // 45°-Beinpresse: Sitz unten links, Schlitten mit Scheiben auf der Schiene.
  m_beinpresse: (f) => (
    <g>
      {Rahmen(f, [[22, BODEN], [180, BODEN], [180, 40], [40, BODEN]])}
      {Polster(f, 24, 92, 46, 13, -12)}
      {Polster(f, 14, 62, 13, 42, -28)}
      {Polster(f, 112, 40, 15, 46, 45)}
      {Scheibe(f, 146, 70, 17)}
    </g>
  ),
  // Hack-Squat: steile Schiene, Rücken- und Schulterpolster, Fußplatte unten.
  m_hacksquat: (f) => (
    <g>
      {Rahmen(f, [[30, BODEN], [168, BODEN], [168, 18], [150, 18], [50, BODEN - 4]])}
      {Polster(f, 92, 30, 14, 66, 34)}
      {Polster(f, 112, 22, 26, 12, 34)}
      {Rahmen(f, [[36, 112], [74, 112]], 7)}
      {Scheibe(f, 140, 74, 15)}
    </g>
  ),
  // Beinstrecker: Sitz mit Lehne, Hebel mit Schienbeinrolle, Block dahinter.
  m_beinstrecker: (f) => (
    <g>
      {Turm(f, 150)}
      {Rahmen(f, [[42, BODEN], [42, 86], [124, 86], [124, BODEN]])}
      {Rahmen(f, [[124, 30], [150, 30]], 3)}
      {Polster(f, 46, 72, 74, 14)}
      {Polster(f, 104, 22, 15, 56, 10)}
      {Rahmen(f, [[46, 80], [30, 112]], 5)}
      {Rolle(f, 28, 112, 9)}
    </g>
  ),
  // Liegender Beinbeuger: Liegepolster, Hebel mit Fersenrolle, Block.
  m_beinbeuger: (f) => (
    <g>
      {Turm(f, 154)}
      {Rahmen(f, [[30, BODEN], [44, 84], [126, 84], [134, BODEN]])}
      {Polster(f, 30, 66, 110, 16, -4)}
      {Rahmen(f, [[36, 70], [24, 46]], 5)}
      {Rolle(f, 24, 42, 9)}
      {Rahmen(f, [[140, 76], [154, 40]], 3)}
    </g>
  ),
  // 45°-Rückenstrecker: Hüftpolster schräg, Fußplatte mit Knöchelrolle.
  m_rueckenstrecker: (f) => (
    <g>
      {Rahmen(f, [[28, BODEN], [168, BODEN], [98, 40], [28, BODEN]])}
      {Polster(f, 84, 34, 54, 16, 38)}
      {Rahmen(f, [[150, BODEN - 4], [170, BODEN - 22]], 7)}
      {Rolle(f, 156, 84, 9)}
    </g>
  ),
  // Brustpresse: Sitz und Lehne, Griffe nach vorn, Block hinten.
  m_brustpresse: (f) => (
    <g>
      {Turm(f, 152)}
      {Rahmen(f, [[78, BODEN], [78, 92], [140, 92], [140, BODEN]])}
      {Polster(f, 74, 80, 54, 13)}
      {Polster(f, 116, 24, 15, 60)}
      {Rahmen(f, [[140, 44], [104, 44], [70, 54]], 5)}
      {Griff(f, 62, 46, 62, 66)}
    </g>
  ),
  // Butterfly: Sitz, hohe Lehne, Armpolster an Schwenkarmen von oben.
  m_butterfly: (f) => (
    <g>
      {Turm(f, 154)}
      {Rahmen(f, [[70, BODEN], [70, 94], [128, 94], [128, BODEN]])}
      {Polster(f, 66, 82, 52, 13)}
      {Polster(f, 106, 16, 15, 70)}
      {Rahmen(f, [[154, 22], [96, 18], [60, 30]], 5)}
      {Polster(f, 46, 34, 14, 40)}
    </g>
  ),
  // Schulterpresse: Sitz, senkrechte Lehne, Griffe über Schulterhöhe.
  m_schulterpresse: (f) => (
    <g>
      {Turm(f, 152)}
      {Rahmen(f, [[66, BODEN], [66, 96], [126, 96], [126, BODEN]])}
      {Polster(f, 62, 84, 52, 13)}
      {Polster(f, 104, 28, 15, 60)}
      {Rahmen(f, [[134, 22], [84, 22], [84, 30]], 5)}
      {Griff(f, 72, 30, 96, 30)}
    </g>
  ),
  // Rudermaschine: Brustpolster vorn, Sitz, Griffe am vorderen Rahmen.
  m_rudern: (f) => (
    <g>
      {Turm(f, 154)}
      {Rahmen(f, [[26, BODEN], [26, 96], [96, 96], [96, BODEN]])}
      {Polster(f, 30, 84, 54, 13)}
      {Rahmen(f, [[96, 96], [124, 50], [150, 50]], 5)}
      {Polster(f, 108, 44, 14, 46, -8)}
      {Griff(f, 132, 40, 132, 62)}
    </g>
  ),
  // Wadenmaschine sitzend: Sitz, Kniepolster, Fußtritt, Scheibe am Hebel.
  m_waden: (f) => (
    <g>
      {Rahmen(f, [[30, BODEN], [30, 92], [104, 92], [104, BODEN]])}
      {Polster(f, 26, 80, 72, 13)}
      {Rahmen(f, [[104, 108], [138, 108]], 7)}
      {Rahmen(f, [[60, 46], [150, 46], [150, BODEN]])}
      {Polster(f, 74, 52, 40, 13)}
      {Scheibe(f, 168, 46, 15)}
    </g>
  ),
  // Kabelzug: hoher Turm mit Rolle oben, Seil zum Griff.
  cable: (f) => (
    <g>
      {Turm(f, 120, 40, 112)}
      {Rahmen(f, [[120, 24], [92, 24]], 5)}
      <circle cx={92} cy={24} r={6} fill={f.metall} stroke={f.rand} strokeWidth={3} />
      <line x1={92} y1={30} x2={70} y2={84} stroke={f.rand} strokeWidth={3} />
      {Griff(f, 58, 88, 82, 88)}
      {Rahmen(f, [[166, BODEN], [166, 16], [120, 16]])}
    </g>
  ),
};

export function GeraetZeichnung({
  geraet,
  variante = "hell",
  className,
  titel,
}: {
  geraet: GeraetKey;
  variante?: "hell" | "auf-blau";
  className?: string;
  /** Vorlesetext; ohne Titel ist die Zeichnung Dekoration. */
  titel?: string;
}) {
  const f = FARBEN[variante];
  return (
    <svg
      viewBox="0 0 200 140"
      className={className}
      role={titel ? "img" : undefined}
      aria-label={titel}
      aria-hidden={titel ? undefined : true}
    >
      {Boden(f)}
      {ZEICHNUNG[geraet](f)}
    </svg>
  );
}

export const GERAET_KEYS = Object.keys(ZEICHNUNG) as GeraetKey[];
