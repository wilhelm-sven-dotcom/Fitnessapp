/* eslint-disable react/no-unescaped-entities */
/**
 * Daumenkino-Tafeln (Boot-Animation) — „Das Archiv".
 * Tafeln wie aus einem alten Athletik-Lehrbuch: Gravur-Optik auf Knochen-Papier,
 * Tafel-Nummern, Bildunterschriften in Serifen-Kursive. Roter Akzent sparsam.
 */
import type { FlipConcept } from "./types";

const PAPER = "#EFE8D6";
const INK = "#29231B";
const FAINT = "#8A7D66";
const RED = "#C13A2C";
/* Handkolorierung — gedeckte Lithografie-Farben */
const BLUE = "#5F7E9E";
const GREEN = "#6F8B4F";
const OCHRE = "#D9A441";
const PETROL = "#3E6E71";

const serif = { fontFamily: "var(--font-newsreader), Georgia, serif" } as const;
const serifIt = { ...serif, fontStyle: "italic" } as const;
const anton = { fontFamily: "var(--font-anton), Arial Black, sans-serif" } as const;

function Plate({
  no,
  caption,
  children,
}: {
  no: string;
  caption: string;
  children: React.ReactNode;
}) {
  return (
    <svg viewBox="0 0 300 360" style={{ display: "block", width: "100%" }}>
      <rect width="300" height="360" fill={PAPER} />
      <rect x="10" y="10" width="280" height="340" fill="none" stroke={INK} strokeWidth="1.6" />
      <rect x="16" y="16" width="268" height="328" fill="none" stroke={INK} strokeWidth="0.6" />
      <text x="268" y="38" textAnchor="end" fontSize="12" fill={FAINT} style={serifIt}>
        {no}
      </text>
      {children}
      <text x="150" y="332" textAnchor="middle" fontSize="13" fill={INK} style={serifIt}>
        {caption}
      </text>
    </svg>
  );
}

/** Bemaßungslinie mit Pfeilspitzen + Label (Gravur-Stil). */
function Dim({ x1, x2, y, label }: { x1: number; x2: number; y: number; label: string }) {
  return (
    <g stroke={FAINT} strokeWidth="1" fill="none">
      <line x1={x1} y1={y} x2={x2} y2={y} />
      <path d={`M${x1 + 7},${y - 3.5} L${x1},${y} L${x1 + 7},${y + 3.5}`} />
      <path d={`M${x2 - 7},${y - 3.5} L${x2},${y} L${x2 - 7},${y + 3.5}`} />
      <text x={(x1 + x2) / 2} y={y - 6} textAnchor="middle" fontSize="11" fill={FAINT} stroke="none" style={serifIt}>
        {label}
      </text>
    </g>
  );
}

/** Schraffur-Bögen für Kugel-Schattierung (unten links). */
function SphereShade({ cx, cy, r }: { cx: number; cy: number; r: number }) {
  return (
    <g stroke={INK} strokeWidth="0.8" fill="none" opacity="0.55">
      {[0.86, 0.7, 0.54, 0.38].map((k, i) => (
        <path
          key={i}
          d={`M ${cx - r * k} ${cy + r * 0.12} A ${r * k} ${r * k} 0 0 0 ${cx + r * k * 0.25} ${cy + r * k * 0.95}`}
        />
      ))}
    </g>
  );
}

/** Kleine Serienbild-Silhouette (Kniebeuge, Seitenansicht) für die Studien-Tafel. */
function Mini({ x, y, d }: { x: number; y: number; d: number }) {
  // d = 0 stehend … 1 tiefe Beuge; grob konstruierte Gelenkpunkte.
  const ax = 26, ay = 78;
  const knee: [number, number] = [ax + 14 * d, ay - 22 + 4 * d];
  const hip: [number, number] = [knee[0] - 16 * d, knee[1] - 20 + 8 * d];
  const sh: [number, number] = [hip[0] + 10 * d, hip[1] - 24 + 4 * d];
  const head: [number, number] = [sh[0] + 3 * d, sh[1] - 8];
  const hand: [number, number] = [sh[0] + 14 + 4 * d, sh[1] + 4 + 4 * d];
  const P = (p: [number, number]) => `${x + p[0]},${y + p[1]}`;
  return (
    <g stroke={INK} strokeWidth="5.5" strokeLinecap="round" fill="none">
      <line x1={x + 10} y1={y + ay} x2={x + 46} y2={y + ay} strokeWidth="1" opacity="0.6" />
      <polyline points={`${x + ax},${y + ay} ${P(knee)} ${P(hip)} ${P(sh)}`} />
      <line x1={P(sh).split(",")[0]} y1={P(sh).split(",")[1]} x2={P(hand)[0] ? x + hand[0] : 0} y2={y + hand[1]} />
      <circle cx={x + head[0]} cy={y + head[1]} r="5" fill={INK} stroke="none" />
      <line x1={x + ax} y1={y + ay} x2={x + ax + 9} y2={y + ay} strokeWidth="4" />
    </g>
  );
}

const frames = [
  /* Taf. I — Die Kugelhantel */
  <Plate key="a1" no="Taf. I." caption="Die Kugelhantel — Modell zu 26 Zoll.">
    <Dim x1={44} x2={256} y={118} label="26 Zoll" />
    {/* Kolorierung: blaue Kugeln, roter Griff-Bund */}
    <circle cx="84" cy="196" r="38" fill={BLUE} opacity="0.4" />
    <circle cx="216" cy="196" r="38" fill={BLUE} opacity="0.4" />
    <g stroke={INK} strokeWidth="2.2" fill="none">
      <circle cx="84" cy="196" r="40" />
      <circle cx="216" cy="196" r="40" />
      <rect x="118" y="187" width="64" height="18" rx="9" fill={PAPER} />
      <line x1="124" y1="183" x2="124" y2="209" stroke={RED} strokeWidth="2.4" />
      <line x1="176" y1="183" x2="176" y2="209" stroke={RED} strokeWidth="2.4" />
    </g>
    <SphereShade cx={84} cy={196} r={40} />
    <SphereShade cx={216} cy={196} r={40} />
    <ellipse cx="96" cy="180" rx="9" ry="5" fill="none" stroke={FAINT} strokeWidth="0.8" transform="rotate(-30 96 180)" />
    <line x1="60" y1="262" x2="240" y2="262" stroke={FAINT} strokeWidth="1" />
  </Plate>,

  /* Taf. II — Bewegungsstudie */
  <Plate key="a2" no="Taf. II." caption="Bewegungsstudie Nr. 12 — die Kniebeuge.">
    {/* Kolorierte Zellen — jede Phase ein anderer Farbton */}
    {[OCHRE, GREEN, BLUE, RED].map((c, i) => (
      <rect key={c} x={30 + i * 60} y="90" width="60" height="130" fill={c} opacity="0.22" />
    ))}
    <g stroke={INK} strokeWidth="1" fill="none">
      <rect x="30" y="90" width="240" height="130" />
      <line x1="90" y1="90" x2="90" y2="220" />
      <line x1="150" y1="90" x2="150" y2="220" />
      <line x1="210" y1="90" x2="210" y2="220" />
    </g>
    {[0, 0.45, 1, 0.3].map((d, i) => (
      <Mini key={i} x={32 + i * 60} y={112} d={d} />
    ))}
    {["1", "2", "3", "4"].map((n, i) => (
      <text key={n} x={60 + i * 60} y="238" textAnchor="middle" fontSize="11" fill={RED} style={serif}>
        {n}
      </text>
    ))}
    <line x1="30" y1="70" x2="270" y2="70" stroke={FAINT} strokeWidth="0.8" />
  </Plate>,

  /* Taf. III — Der Armbeuger (klassische Beuge-Pose, Seitenansicht) */
  <Plate key="a3" no="Taf. III." caption="Der Armbeuger, im Zustande der Spannung.">
    {/* Oberarm waagerecht, Unterarm senkrecht zur Faust — die klassische Pose */}
    <ellipse cx="140" cy="190" rx="96" ry="70" fill={OCHRE} opacity="0.2" />
    <g stroke={INK} strokeWidth="26" strokeLinecap="round" fill="none">
      <line x1="92" y1="206" x2="182" y2="206" />
      <line x1="182" y1="206" x2="168" y2="122" />
    </g>
    <circle cx="166" cy="108" r="15" fill={INK} />
    {/* Bizeps-Wölbung als Gravur-Bogen + Schraffur */}
    <path d="M100,192 Q136,124 176,190" fill="none" stroke={INK} strokeWidth="1.8" />
    <g stroke={INK} strokeWidth="0.8" fill="none" opacity="0.5">
      <path d="M116,182 Q138,146 160,184" />
      <path d="M126,188 Q142,160 156,190" />
    </g>
    <g stroke={FAINT} strokeWidth="0.9" fill="none">
      <line x1="138" y1="150" x2="196" y2="96" />
      <line x1="196" y1="170" x2="242" y2="150" />
      <line x1="96" y1="222" x2="62" y2="252" />
    </g>
    {[
      { n: "1.", x: 204, y: 94 },
      { n: "2.", x: 250, y: 152 },
      { n: "3.", x: 50, y: 260 },
    ].map((l) => (
      <text key={l.n} x={l.x} y={l.y} fontSize="13" fill={INK} style={serif}>
        {l.n}
      </text>
    ))}
  </Plate>,

  /* Taf. IV — Die Rundhantel */
  <Plate key="a4" no="Taf. IV." caption="Die Rundhantel zu 16 Kilogramm.">
    <path d="M108,164 C108,112 192,112 192,164" fill="none" stroke={INK} strokeWidth="13" strokeLinecap="round" />
    <path d="M118,160 C118,124 182,124 182,160" fill="none" stroke={PAPER} strokeWidth="5" />
    <circle cx="150" cy="212" r="52" fill={PETROL} opacity="0.38" />
    <circle cx="150" cy="212" r="54" fill="none" stroke={INK} strokeWidth="2.4" />
    <SphereShade cx={150} cy={212} r={54} />
    <text x="150" y="222" textAnchor="middle" fontSize="30" fill={RED} style={serif}>
      16
    </text>
    <text x="150" y="240" textAnchor="middle" fontSize="10" letterSpacing="3" fill={FAINT} style={serif}>
      KILO
    </text>
    <Dim x1={96} x2={204} y={288} label="⌀ 27 cm" />
  </Plate>,

  /* Taf. V — Das Sprungseil (Griffe oben, Seil hängt im Bogen) */
  <Plate key="a5" no="Taf. V." caption="Das Sprungseil, im Schwunge gedacht.">
    <g stroke={INK} strokeWidth="10" strokeLinecap="round">
      <line x1="88" y1="102" x2="102" y2="140" />
      <line x1="212" y1="102" x2="198" y2="140" />
    </g>
    <circle cx="86" cy="96" r="5" fill={INK} />
    <circle cx="214" cy="96" r="5" fill={INK} />
    <path d="M102,144 C 112,226 188,226 198,144" fill="none" stroke={RED} strokeWidth="3.2" />
    <path d="M104,142 C 118,196 182,196 196,142" fill="none" stroke={FAINT} strokeWidth="1" strokeDasharray="3 5" />
    <g stroke={FAINT} strokeWidth="1" fill="none">
      <path d="M70,160 q -8,14 -6,30" />
      <path d="M230,160 q 8,14 6,30" />
    </g>
  </Plate>,

  /* Taf. VI — Die Ringe */
  <Plate key="a6" no="Taf. VI." caption="Die Ringe, am Riemen hängend.">
    <g stroke={INK} strokeWidth="2" fill="none">
      <line x1="120" y1="46" x2="110" y2="150" />
      <line x1="180" y1="46" x2="190" y2="150" />
      <rect x="114" y="40" width="12" height="9" />
      <rect x="174" y="40" width="12" height="9" />
    </g>
    <circle cx="110" cy="184" r="31" fill="none" stroke={OCHRE} strokeWidth="7" />
    <circle cx="190" cy="184" r="31" fill="none" stroke={OCHRE} strokeWidth="7" />
    <circle cx="110" cy="184" r="34.5" fill="none" stroke={INK} strokeWidth="1.4" />
    <circle cx="190" cy="184" r="34.5" fill="none" stroke={INK} strokeWidth="1.4" />
    <circle cx="110" cy="184" r="27.5" fill="none" stroke={INK} strokeWidth="1.4" />
    <circle cx="190" cy="184" r="27.5" fill="none" stroke={INK} strokeWidth="1.4" />
    <circle cx="110" cy="184" r="23" fill="none" stroke={FAINT} strokeWidth="0.8" />
    <circle cx="190" cy="184" r="23" fill="none" stroke={FAINT} strokeWidth="0.8" />
    <line x1="60" y1="252" x2="240" y2="252" stroke={FAINT} strokeWidth="1" />
  </Plate>,

  /* Taf. VII — Die Schwingkeulen (das Paar, nebeneinander) */
  <Plate key="a7" no="Taf. VII." caption="Die Schwingkeulen, das Paar.">
    {[
      { x: 116, r: -7 },
      { x: 184, r: 7 },
    ].map((c) => (
      <g key={c.x} transform={`rotate(${c.r} ${c.x} 180)`}>
        <circle cx={c.x} cy="92" r="6" fill={RED} />
        <line x1={c.x} y1="98" x2={c.x} y2="176" stroke={INK} strokeWidth="9" strokeLinecap="round" />
        <path
          d={`M${c.x - 6},170 C${c.x - 24},186 ${c.x - 22},244 ${c.x},250 C${c.x + 22},244 ${c.x + 24},186 ${c.x + 6},170`}
          fill={GREEN}
          fillOpacity="0.32"
          stroke={INK}
          strokeWidth="2.4"
        />
        <path d={`M${c.x - 12},206 q 12,-8 24,0`} fill="none" stroke={INK} strokeWidth="0.8" opacity="0.5" />
        <path d={`M${c.x - 14},222 q 14,-8 28,0`} fill="none" stroke={INK} strokeWidth="0.8" opacity="0.5" />
      </g>
    ))}
    <line x1="70" y1="266" x2="230" y2="266" stroke={FAINT} strokeWidth="1" />
  </Plate>,

  /* Taf. VIII — Der Motor (rot) */
  <Plate key="a8" no="Taf. VIII." caption="Der Motor — 62 Schläge in der Minute.">
    <path
      d="M150,146 C132,112 90,116 90,152 C90,192 128,210 150,236 C172,210 210,192 210,152 C210,116 168,112 150,146 Z"
      fill={RED}
      fillOpacity="0.82"
      stroke={INK}
      strokeWidth="2.6"
    />
    <g stroke={PAPER} strokeWidth="1" opacity="0.7" fill="none">
      <path d="M104,150 Q120,138 128,158" />
      <path d="M100,166 Q120,154 132,176" />
      <path d="M106,182 Q124,170 136,192" />
    </g>
    <g stroke={INK} strokeWidth="1.8" fill="none">
      <path d="M138,120 l-4,-16 M150,118 l0,-18 M162,120 l4,-16" />
    </g>
    <polyline
      points="34,270 110,270 122,244 136,290 150,270 266,270"
      fill="none"
      stroke={RED}
      strokeWidth="2.4"
      strokeLinejoin="round"
    />
  </Plate>,

  /* Taf. IX — Dem Beharrlichen */
  <Plate key="a9" no="Taf. IX." caption="Dem Beharrlichen.">
    {/* Zweig-Bögen, auf denen die Blätter sitzen */}
    <path d="M78,244 A 86,86 0 0 1 118,102" fill="none" stroke={GREEN} strokeWidth="1.8" />
    <path d="M222,244 A 86,86 0 0 0 182,102" fill="none" stroke={GREEN} strokeWidth="1.8" />
    {Array.from({ length: 9 }).map((_, i) => {
      const a = (114 + i * 10.5) * (Math.PI / 180);
      const cx = 150 + 84 * Math.cos(a);
      const cy = 176 + 84 * Math.sin(a);
      const rot = (a * 180) / Math.PI + 90;
      return (
        <g key={`l${i}`}>
          <ellipse cx={cx} cy={cy} rx="15" ry="5.5" fill={GREEN} fillOpacity="0.4" stroke={GREEN} strokeWidth="1.8" transform={`rotate(${rot} ${cx} ${cy})`} />
          <ellipse cx={300 - cx} cy={cy} rx="15" ry="5.5" fill={GREEN} fillOpacity="0.4" stroke={GREEN} strokeWidth="1.8" transform={`rotate(${-rot} ${300 - cx} ${cy})`} />
        </g>
      );
    })}
    <text x="150" y="196" textAnchor="middle" fontSize="46" fill={RED} style={serif}>
      I.
    </text>
    {/* Schleifen-Band unten */}
    <path d="M150,258 l-20,22 l14,-2 M150,258 l20,22 l-14,-2" fill="none" stroke={RED} strokeWidth="2.2" strokeLinejoin="round" />
  </Plate>,
];

const end = (
  <svg viewBox="0 0 300 360" style={{ display: "block", width: "100%" }}>
    {/* Knallige Schlusskarte — wie die rote Fable-Karte, nur in Sport */}
    <rect width="300" height="360" fill="#C84B31" />
    <g stroke={PAPER} opacity="0.9">
      <line x1="34" y1="64" x2="266" y2="64" strokeWidth="1.8" />
      <line x1="34" y1="70" x2="266" y2="70" strokeWidth="0.6" />
      <line x1="34" y1="290" x2="266" y2="290" strokeWidth="0.6" />
      <line x1="34" y1="296" x2="266" y2="296" strokeWidth="1.8" />
    </g>
    {/* ein paar Tafel-Motive schweben als Geister im Hintergrund */}
    <g stroke={PAPER} opacity="0.28" fill="none" strokeWidth="2">
      <circle cx="58" cy="112" r="16" />
      <circle cx="94" cy="112" r="16" />
      <rect x="70" y="108" width="28" height="8" rx="4" />
      <path d="M236,246 C236,226 268,226 268,246" strokeWidth="5" strokeLinecap="round" />
      <circle cx="252" cy="264" r="18" />
      <path d="M226,96 a16,16 0 1 0 22,-14" strokeWidth="3" />
    </g>
    <text x="150" y="128" textAnchor="middle" fontSize="11" letterSpacing="4" fill={PAPER} opacity="0.85" style={serif}>
      EIN ARCHIV DER KRAFT
    </text>
    <g stroke={PAPER} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" fill="none">
      <path d="M140,158 L150,148 L160,158" />
      <path d="M140,170 L150,160 L160,170" />
    </g>
    <text x="150" y="228" textAnchor="middle" fontSize="52" letterSpacing="2" fill={PAPER} style={anton}>
      TRAINING
    </text>
    <line x1="120" y1="246" x2="180" y2="246" stroke={PAPER} strokeWidth="2.6" />
    <text x="150" y="272" textAnchor="middle" fontSize="13" fill={PAPER} opacity="0.85" style={serifIt}>
      Kraft · Form · Fortschritt
    </text>
  </svg>
);

export const ARCHIV: FlipConcept = {
  id: "archiv",
  title: "Das Archiv",
  sub: "Tafeln aus einem alten Athletik-Lehrbuch — Gravur auf Knochen-Papier",
  bg: "#E7DFC9",
  fg: INK,
  frames,
  end,
  heroIndex: 3,
};
