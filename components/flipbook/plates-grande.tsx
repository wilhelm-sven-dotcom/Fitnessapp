/* eslint-disable react/no-unescaped-entities */
/**
 * Daumenkino-Tafeln (Boot-Animation) — „Das große Archiv".
 * Maximalistisch wie das Fable-Intro: dichte Sammelbögen, Schwärme, ein
 * Buchstabe aus Geräten, knallige Zwischenkarten — und ein Finale, über das
 * die Motive hinausfliegen. Handkolorierte Lithografie-Palette.
 */
import type { FlipConcept } from "./types";

const PAPER = "#EFE8D6";
const BLUSH = "#F0DFD0";
const SAGE = "#E5E8D2";
const SKY = "#DCE6EA";
const INK = "#29231B";
const FAINT = "#8A7D66";
const RED = "#C13A2C";
const BLUE = "#3E6E9E";
const GREEN = "#6F8B4F";
const GOLD = "#C9A227";
const OCHRE = "#D9A441";
const PETROL = "#3E6E71";

const serif = { fontFamily: "var(--font-newsreader), Georgia, serif" } as const;
const serifIt = { ...serif, fontStyle: "italic" } as const;
const anton = { fontFamily: "var(--font-anton), Arial Black, sans-serif" } as const;

/* ── kleine Vignetten, frei platzierbar (x/y = Zentrum, s = Skalierung) ── */
const Hantel = ({ x, y, s = 1, c = INK, r = 0 }: { x: number; y: number; s?: number; c?: string; r?: number }) => (
  <g transform={`translate(${x} ${y}) rotate(${r}) scale(${s})`}>
    <line x1="-26" y1="0" x2="26" y2="0" stroke={INK} strokeWidth="5" strokeLinecap="round" />
    <circle cx="-24" cy="0" r="11" fill={c} stroke={INK} strokeWidth="1.6" />
    <circle cx="24" cy="0" r="11" fill={c} stroke={INK} strokeWidth="1.6" />
  </g>
);
const Kugel = ({ x, y, s = 1, c = PETROL }: { x: number; y: number; s?: number; c?: string }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    <path d="M-14,-16 C-14,-34 14,-34 14,-16" fill="none" stroke={INK} strokeWidth="5" strokeLinecap="round" />
    <circle cx="0" cy="2" r="18" fill={c} fillOpacity="0.55" stroke={INK} strokeWidth="1.8" />
  </g>
);
const Keule = ({ x, y, s = 1, r = 0, c = GREEN }: { x: number; y: number; s?: number; r?: number; c?: string }) => (
  <g transform={`translate(${x} ${y}) rotate(${r}) scale(${s})`}>
    <circle cx="0" cy="-28" r="3.5" fill={RED} />
    <line x1="0" y1="-24" x2="0" y2="6" stroke={INK} strokeWidth="5" strokeLinecap="round" />
    <path d="M-4,2 C-12,10 -11,32 0,35 C11,32 12,10 4,2" fill={c} fillOpacity="0.4" stroke={INK} strokeWidth="1.6" />
  </g>
);
const Ringe = ({ x, y, s = 1 }: { x: number; y: number; s?: number }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    <line x1="-9" y1="-26" x2="-7" y2="-8" stroke={INK} strokeWidth="1.6" />
    <line x1="9" y1="-26" x2="7" y2="-8" stroke={INK} strokeWidth="1.6" />
    <circle cx="-8" cy="4" r="10" fill="none" stroke={GOLD} strokeWidth="4" />
    <circle cx="8" cy="4" r="10" fill="none" stroke={GOLD} strokeWidth="4" />
  </g>
);
const Ball = ({ x, y, s = 1, c = OCHRE }: { x: number; y: number; s?: number; c?: string }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    <circle cx="0" cy="0" r="16" fill={c} fillOpacity="0.5" stroke={INK} strokeWidth="1.8" />
    <path d="M0,-16 C10,-8 10,8 0,16 M0,-16 C-10,-8 -10,8 0,16" fill="none" stroke={INK} strokeWidth="1" />
  </g>
);
const Medaille = ({ x, y, s = 1, c = GOLD, r = 0 }: { x: number; y: number; s?: number; c?: string; r?: number }) => (
  <g transform={`translate(${x} ${y}) rotate(${r}) scale(${s})`}>
    <path d="M-7,-22 L0,-8 L7,-22 z" fill={RED} stroke={INK} strokeWidth="1" />
    <circle cx="0" cy="2" r="11" fill={c} stroke={INK} strokeWidth="1.6" />
    <circle cx="0" cy="2" r="6.5" fill="none" stroke={INK} strokeWidth="0.8" />
  </g>
);
const Uhr = ({ x, y, s = 1, c = GOLD }: { x: number; y: number; s?: number; c?: string }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    <rect x="-4" y="-27" width="8" height="7" fill={c} stroke={INK} strokeWidth="1" />
    <circle cx="0" cy="0" r="19" fill={PAPER} stroke={c} strokeWidth="3.5" />
    <circle cx="0" cy="0" r="21.5" fill="none" stroke={INK} strokeWidth="0.9" />
    <line x1="0" y1="0" x2="0" y2="-12" stroke={INK} strokeWidth="1.8" />
    <line x1="0" y1="0" x2="9" y2="5" stroke={RED} strokeWidth="1.4" />
  </g>
);
const Handschuh = ({ x, y, s = 1, r = 0 }: { x: number; y: number; s?: number; r?: number }) => (
  <g transform={`translate(${x} ${y}) rotate(${r}) scale(${s})`}>
    <circle cx="0" cy="0" r="13" fill={RED} stroke={INK} strokeWidth="1.6" />
    <path d="M-11,6 q-7,2 -5,10 l7,2" fill={RED} stroke={INK} strokeWidth="1.4" />
  </g>
);
const Seil = ({ x, y, s = 1 }: { x: number; y: number; s?: number }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    <line x1="-18" y1="-18" x2="-13" y2="-6" stroke={INK} strokeWidth="4" strokeLinecap="round" />
    <line x1="18" y1="-18" x2="13" y2="-6" stroke={INK} strokeWidth="4" strokeLinecap="round" />
    <path d="M-13,-4 C-10,22 10,22 13,-4" fill="none" stroke={RED} strokeWidth="2" />
  </g>
);

function Plate({
  no,
  caption,
  paper = PAPER,
  children,
}: {
  no: string;
  caption: string;
  paper?: string;
  children: React.ReactNode;
}) {
  return (
    <svg viewBox="0 0 300 360" style={{ display: "block", width: "100%" }}>
      <rect width="300" height="360" fill={paper} />
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

/** Mini-Kniebeuge (Seitenansicht) für den Studienbogen. */
function Fig({ x, y, d, c = INK }: { x: number; y: number; d: number; c?: string }) {
  const ax = 24, ay = 62;
  const knee: [number, number] = [ax + 11 * d, ay - 18 + 3 * d];
  const hip: [number, number] = [knee[0] - 13 * d, knee[1] - 16 + 6 * d];
  const sh: [number, number] = [hip[0] + 8 * d, hip[1] - 19 + 3 * d];
  return (
    <g stroke={c} strokeWidth="4.5" strokeLinecap="round" fill="none">
      <polyline points={`${x + ax},${y + ay} ${x + knee[0]},${y + knee[1]} ${x + hip[0]},${y + hip[1]} ${x + sh[0]},${y + sh[1]}`} />
      <line x1={x + sh[0]} y1={y + sh[1]} x2={x + sh[0] + 12} y2={y + sh[1] + 4 + 3 * d} />
      <circle cx={x + sh[0] + 2 * d} cy={y + sh[1] - 7} r="4.5" fill={c} stroke="none" />
      <line x1={x + ax} y1={y + ay} x2={x + ax + 8} y2={y + ay} strokeWidth="3.5" />
    </g>
  );
}

const frames = [
  /* I — Die Gerätewand (dichter Sammelbogen, 3×3) */
  <Plate key="g1" no="Taf. I." caption="Die Gerätewand — das Inventar der Kraft.">
    <g stroke={FAINT} strokeWidth="0.6">
      <line x1="105" y1="48" x2="105" y2="300" />
      <line x1="195" y1="48" x2="195" y2="300" />
      <line x1="24" y1="132" x2="276" y2="132" />
      <line x1="24" y1="216" x2="276" y2="216" />
    </g>
    <Hantel x={64} y={86} c={BLUE} s={0.9} />
    <Kugel x={150} y={90} s={0.95} />
    <Keule x={240} y={82} r={8} s={0.85} />
    <Ringe x={64} y={172} s={1.05} />
    <Ball x={150} y={172} s={1} />
    <Uhr x={240} y={172} s={0.85} />
    <Handschuh x={64} y={256} s={1} r={-10} />
    <Seil x={150} y={258} s={1} />
    <Medaille x={240} y={258} s={1} />
    {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((n, i) => (
      <text key={n} x={36 + (i % 3) * 90} y={124 + Math.floor(i / 3) * 84} fontSize="9" fill={RED} style={serifIt}>
        {n}.
      </text>
    ))}
  </Plate>,

  /* II — Das große T (Geräte formen den Buchstaben) */
  <Plate key="g2" no="Taf. II." caption="Studie: das T, gelegt aus dem Gerät.">
    <Hantel x={82} y={92} c={RED} s={0.85} r={-4} />
    <Hantel x={150} y={88} c={BLUE} s={0.9} />
    <Hantel x={218} y={92} c={GREEN} s={0.85} r={4} />
    <Kugel x={150} y={140} s={0.9} />
    <Ball x={150} y={186} s={0.95} c={RED} />
    <Keule x={136} y={232} r={-8} s={0.8} />
    <Keule x={164} y={232} r={8} s={0.8} />
    <Medaille x={150} y={286} s={1.05} />
    <g stroke={FAINT} strokeWidth="0.7" strokeDasharray="3 4" fill="none">
      <rect x="44" y="66" width="212" height="46" />
      <rect x="118" y="112" width="64" height="190" />
    </g>
  </Plate>,

  /* III — Der Schwarm (wie die Schmetterlings-Tafel) */
  <Plate key="g3" no="Taf. III." caption="Der Schwarm — Trophäen in freier Wildbahn." paper={BLUSH}>
    {[
      { x: 62, y: 82, s: 1.15, c: GOLD, r: -14 },
      { x: 140, y: 66, s: 0.8, c: BLUE, r: 10 },
      { x: 216, y: 88, s: 1.3, c: RED, r: 6 },
      { x: 96, y: 148, s: 0.9, c: GREEN, r: 18 },
      { x: 178, y: 138, s: 1.05, c: GOLD, r: -8 },
      { x: 250, y: 156, s: 0.75, c: PETROL, r: -18 },
      { x: 56, y: 216, s: 0.85, c: RED, r: 12 },
      { x: 130, y: 206, s: 1.2, c: BLUE, r: -6 },
      { x: 208, y: 222, s: 0.9, c: GOLD, r: 16 },
      { x: 90, y: 278, s: 0.7, c: PETROL, r: -12 },
      { x: 162, y: 272, s: 0.95, c: GREEN, r: 8 },
      { x: 234, y: 282, s: 1.1, c: RED, r: -4 },
    ].map((m, i) => (
      <Medaille key={i} {...m} />
    ))}
    {[
      [40, 120], [268, 60], [270, 246], [40, 300], [150, 108], [216, 306],
    ].map(([x, y], i) => (
      <circle key={i} cx={x} cy={y} r="3" fill={[RED, BLUE, GOLD, GREEN, PETROL, OCHRE][i]} />
    ))}
  </Plate>,

  /* IV — Der Studienbogen (2×4 Serienbild) */
  <Plate key="g4" no="Taf. IV." caption="Bewegungsstudie — die Beuge, zweimal vier Phasen.">
    {[OCHRE, GREEN, BLUE, RED, PETROL, GOLD, RED, BLUE].map((c, i) => (
      <rect key={i} x={30 + (i % 4) * 60} y={i < 4 ? 66 : 190} width="60" height="104" fill={c} opacity="0.2" />
    ))}
    <g stroke={INK} strokeWidth="0.9" fill="none">
      <rect x="30" y="66" width="240" height="104" />
      <rect x="30" y="190" width="240" height="104" />
      {[90, 150, 210].map((x) => (
        <g key={x}>
          <line x1={x} y1="66" x2={x} y2="170" />
          <line x1={x} y1="190" x2={x} y2="294" />
        </g>
      ))}
    </g>
    {[0, 0.35, 0.7, 1].map((d, i) => (
      <Fig key={`a${i}`} x={34 + i * 60} y={86} d={d} />
    ))}
    {[1, 0.7, 0.35, 0].map((d, i) => (
      <Fig key={`b${i}`} x={34 + i * 60} y={210} d={d} c={RED} />
    ))}
  </Plate>,

  /* V — Der Athlet (Anatomie, koloriert + nummeriert) */
  <Plate key="g5" no="Taf. V." caption="Der Athlet — die Werkzeuge, nummeriert." paper={SAGE}>
    <circle cx="150" cy="88" r="16" fill="none" stroke={INK} strokeWidth="2.2" />
    <path d="M116,236 C114,160 126,120 150,118 C174,120 186,160 184,236" fill="none" stroke={INK} strokeWidth="2.2" />
    <ellipse cx="132" cy="146" rx="12" ry="18" fill={GOLD} opacity="0.55" />
    <ellipse cx="168" cy="146" rx="12" ry="18" fill={GOLD} opacity="0.55" />
    <ellipse cx="150" cy="170" rx="20" ry="16" fill={RED} opacity="0.5" />
    <ellipse cx="138" cy="210" rx="10" ry="20" fill={BLUE} opacity="0.5" />
    <ellipse cx="162" cy="210" rx="10" ry="20" fill={BLUE} opacity="0.5" />
    <g stroke={INK} strokeWidth="7" strokeLinecap="round" fill="none">
      <line x1="118" y1="136" x2="96" y2="196" />
      <line x1="182" y1="136" x2="204" y2="196" />
      <line x1="136" y1="238" x2="132" y2="296" />
      <line x1="164" y1="238" x2="168" y2="296" />
    </g>
    <g stroke={FAINT} strokeWidth="0.9" fill="none">
      <line x1="132" y1="146" x2="70" y2="120" />
      <line x1="150" y1="170" x2="232" y2="150" />
      <line x1="138" y1="210" x2="70" y2="232" />
    </g>
    {[
      { n: "1.", x: 60, y: 118 },
      { n: "2.", x: 240, y: 148 },
      { n: "3.", x: 60, y: 240 },
    ].map((l) => (
      <text key={l.n} x={l.x} y={l.y} fontSize="12" fill={RED} style={serif}>
        {l.n}
      </text>
    ))}
  </Plate>,

  /* VI — Zwischenkarte ROT (invertierte Kugel) */
  <svg key="g6" viewBox="0 0 300 360" style={{ display: "block", width: "100%" }}>
    <rect width="300" height="360" fill={RED} />
    <rect x="16" y="16" width="268" height="328" fill="none" stroke={PAPER} strokeWidth="1" opacity="0.7" />
    <path d="M116,150 C116,96 184,96 184,150" fill="none" stroke={PAPER} strokeWidth="14" strokeLinecap="round" />
    <circle cx="150" cy="204" r="58" fill={PAPER} />
    <text x="150" y="216" textAnchor="middle" fontSize="34" fill={RED} style={serif}>
      16
    </text>
    <text x="150" y="316" textAnchor="middle" fontSize="12" letterSpacing="3" fill={PAPER} style={serifIt}>
      Rot: das Arbeitsgewicht.
    </text>
  </svg>,

  /* VII — Die Zielscheibe (bunt) */
  <Plate key="g7" no="Taf. VII." caption="Die Zielscheibe — jede Woche ein Ring weiter." paper={SKY}>
    <circle cx="150" cy="182" r="92" fill={BLUE} opacity="0.4" stroke={INK} strokeWidth="1.6" />
    <circle cx="150" cy="182" r="70" fill={GREEN} opacity="0.45" stroke={INK} strokeWidth="1.2" />
    <circle cx="150" cy="182" r="48" fill={GOLD} opacity="0.55" stroke={INK} strokeWidth="1.2" />
    <circle cx="150" cy="182" r="26" fill={RED} opacity="0.75" stroke={INK} strokeWidth="1.4" />
    <circle cx="150" cy="182" r="6" fill={INK} />
    <g stroke={INK} strokeWidth="2.4" fill="none">
      <line x1="196" y1="128" x2="156" y2="176" />
      <path d="M204,110 l-6,22 l-16,-14 z" fill={INK} />
    </g>
  </Plate>,

  /* VIII — Der Plansatz (Blaupause auf Papier) */
  <Plate key="g8" no="Taf. VIII." caption="Der Plansatz — das Gerüst, Blatt 4.">
    <rect x="40" y="58" width="220" height="240" fill="#E9E4D2" stroke={INK} strokeWidth="1" />
    <line x1="150" y1="58" x2="150" y2="298" stroke={FAINT} strokeWidth="0.6" strokeDasharray="6 5" />
    <g stroke={BLUE} strokeWidth="2" fill="none">
      <line x1="96" y1="90" x2="96" y2="266" />
      <line x1="204" y1="90" x2="204" y2="266" />
      <line x1="84" y1="90" x2="216" y2="90" />
    </g>
    {Array.from({ length: 7 }).map((_, i) => (
      <g key={i}>
        <circle cx="96" cy={116 + i * 22} r="2.4" fill="none" stroke={BLUE} strokeWidth="1" />
        <circle cx="204" cy={116 + i * 22} r="2.4" fill="none" stroke={BLUE} strokeWidth="1" />
      </g>
    ))}
    <path d="M96,178 h13 v7 h-7 M204,178 h-13 v7 h7" fill="none" stroke={RED} strokeWidth="2" />
    <g stroke={RED} strokeWidth="1" fill="none">
      <line x1="240" y1="90" x2="240" y2="266" />
      <path d="M237,97 L240,90 L243,97 M237,259 L240,266 L243,259" />
    </g>
    <text x="248" y="182" fontSize="9" fill={RED} style={serif}>
      2130
    </text>
  </Plate>,

  /* IX — Die Stunden (Uhren-Collage) */
  <Plate key="g9" no="Taf. IX." caption="Die Stunden — gemessen wird immer." paper={BLUSH}>
    <Uhr x={116} y={150} s={1.7} c={GOLD} />
    <Uhr x={212} y={196} s={1.15} c={BLUE} />
    <Uhr x={92} y={252} s={0.85} c={RED} />
    <text x="222" y="106" fontSize="26" fill={RED} style={serif}>
      62
    </text>
    <text x="222" y="122" fontSize="9" letterSpacing="2" fill={FAINT} style={serifIt}>
      Schläge/Min.
    </text>
  </Plate>,

  /* X — Zwischenkarte PETROL (Langhantel-Silhouette) */
  <svg key="g10" viewBox="0 0 300 360" style={{ display: "block", width: "100%" }}>
    <rect width="300" height="360" fill={PETROL} />
    <rect x="16" y="16" width="268" height="328" fill="none" stroke={PAPER} strokeWidth="1" opacity="0.7" />
    <line x1="42" y1="180" x2="258" y2="180" stroke={PAPER} strokeWidth="7" />
    <rect x="58" y="146" width="16" height="68" rx="4" fill={PAPER} />
    <rect x="78" y="158" width="12" height="44" rx="4" fill={PAPER} />
    <rect x="226" y="146" width="16" height="68" rx="4" fill={PAPER} />
    <rect x="210" y="158" width="12" height="44" rx="4" fill={PAPER} />
    <text x="150" y="316" textAnchor="middle" fontSize="12" letterSpacing="3" fill={PAPER} style={serifIt}>
      Petrol: die Langhantel.
    </text>
  </svg>,

  /* XI — Das Plakat (Letterpress) */
  <Plate key="g11" no="Taf. XI." caption="Aus dem Anschlagkasten des Vereins.">
    <line x1="40" y1="72" x2="260" y2="72" stroke={INK} strokeWidth="2" />
    <text x="150" y="122" textAnchor="middle" fontSize="46" fill={RED} style={anton}>
      KRAFT!
    </text>
    <text x="150" y="152" textAnchor="middle" fontSize="17" fill={INK} style={serifIt}>
      &amp; Form &amp; Fortschritt
    </text>
    <line x1="70" y1="170" x2="230" y2="170" stroke={INK} strokeWidth="0.8" />
    <text x="150" y="198" textAnchor="middle" fontSize="12" letterSpacing="2" fill={INK} style={serif}>
      DREIMAL WÖCHENTLICH
    </text>
    <text x="150" y="222" textAnchor="middle" fontSize="12" letterSpacing="2" fill={BLUE} style={serif}>
      GANZKÖRPER · A B C
    </text>
    <Hantel x={110} y={262} c={RED} s={0.7} r={-6} />
    <Medaille x={190} y={262} s={0.8} />
    <line x1="40" y1="296" x2="260" y2="296" stroke={INK} strokeWidth="2" />
  </Plate>,
];

/* Finale: rote Karte, die Motive fliegen ÜBER die Ränder */
const end = (
  <svg viewBox="0 0 300 360" style={{ display: "block", width: "100%" }}>
    <rect width="300" height="360" fill="#C84B31" />
    <g stroke={PAPER} opacity="0.9">
      <line x1="34" y1="70" x2="266" y2="70" strokeWidth="1.8" />
      <line x1="34" y1="76" x2="266" y2="76" strokeWidth="0.6" />
      <line x1="34" y1="284" x2="266" y2="284" strokeWidth="0.6" />
      <line x1="34" y1="290" x2="266" y2="290" strokeWidth="1.8" />
    </g>
    <text x="150" y="134" textAnchor="middle" fontSize="11" letterSpacing="4" fill={PAPER} opacity="0.85" style={serif}>
      DAS GROSSE ARCHIV DER KRAFT
    </text>
    <g stroke={PAPER} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" fill="none">
      <path d="M140,162 L150,152 L160,162" />
      <path d="M140,174 L150,164 L160,174" />
    </g>
    <text x="150" y="232" textAnchor="middle" fontSize="52" letterSpacing="2" fill={PAPER} style={anton}>
      TRAINING
    </text>
    <text x="150" y="262" textAnchor="middle" fontSize="13" fill={PAPER} opacity="0.85" style={serifIt}>
      Kraft · Form · Fortschritt
    </text>
    {/* die Sammlung fliegt über die Karte hinaus */}
    <Medaille x={36} y={52} s={1.25} r={-16} />
    <Medaille x={270} y={318} s={1.1} r={14} />
    <Ball x={266} y={54} s={0.95} c={BLUE} />
    <Handschuh x={40} y={310} s={1.1} r={-14} />
    <Keule x={282} y={168} r={18} s={0.75} />
    <Kugel x={22} y={182} s={0.7} c={GOLD} />
    {[
      [96, 44, GOLD],
      [204, 40, PAPER],
      [120, 320, PAPER],
      [186, 316, GOLD],
      [284, 236, PAPER],
      [16, 118, PAPER],
    ].map(([x, y, c], i) => (
      <circle key={i} cx={x as number} cy={y as number} r="3.2" fill={c as string} />
    ))}
  </svg>
);

export const GRANDE: FlipConcept = {
  id: "grande",
  title: "Das große Archiv",
  sub: "Maximalistisch wie das Fable-Intro: volle Sammelbögen, Schwärme, Zwischenkarten in Knallfarben",
  bg: "#E7DFC9",
  fg: INK,
  frames,
  end,
  heroIndex: 2,
};
