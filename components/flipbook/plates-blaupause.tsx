/* eslint-disable react/no-unescaped-entities */
/**
 * Daumenkino-Tafeln (Boot-Animation) — „Die Blaupause".
 * Technische Konstruktions-Tafeln: Raster, Bemaßung, Schnitt-Schraffur,
 * Passermarken — Stahlblau auf tiefem Zeichenkarton, roter Index.
 */
import type { FlipConcept } from "./types";

const BG = "#0D1420";
const GRID = "rgba(110,144,190,0.14)";
const STEEL = "#6E90BE";
const BRIGHT = "#A9C6EA";
const RED = "#FF375F";
const TXT = "#E8ECF2";
/* Mehrfarb-Tusche — wie ein Plansatz mit farbigen Ebenen */
const CYAN = "#4CC3FF";
const AMBERI = "#FFB020";
const GREENI = "#34D399";

const mono = { fontFamily: "var(--font-jbmono), ui-monospace, monospace" } as const;
const disp = { fontFamily: "var(--font-archivo), Arial, sans-serif", fontWeight: 800 } as const;

function Plate({
  no,
  caption,
  children,
}: {
  no: string;
  caption: string;
  children: React.ReactNode;
}) {
  const gid = `bp-grid-${no.replace(/\W/g, "")}`;
  return (
    <svg viewBox="0 0 300 360" style={{ display: "block", width: "100%" }}>
      <defs>
        <pattern id={gid} width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M20 0 H0 V20" fill="none" stroke={GRID} strokeWidth="1" />
        </pattern>
      </defs>
      <rect width="300" height="360" fill={BG} />
      <rect width="300" height="360" fill={`url(#${gid})`} />
      {/* Passermarken */}
      <g stroke={STEEL} strokeWidth="1" opacity="0.8">
        <path d="M14,26 h14 M26,14 v14" fill="none" />
        <path d="M286,26 h-14 M274,14 v14" fill="none" />
        <path d="M14,334 h14 M26,346 v-14" fill="none" />
        <path d="M286,334 h-14 M274,346 v-14" fill="none" />
      </g>
      <text x="20" y="44" fontSize="9" letterSpacing="2" fill={STEEL} style={mono}>
        ENTWURF {no}
      </text>
      {children}
      <text x="150" y="336" textAnchor="middle" fontSize="10" letterSpacing="2" fill={BRIGHT} style={mono}>
        {caption}
      </text>
    </svg>
  );
}

function DimH({ x1, x2, y, label }: { x1: number; x2: number; y: number; label: string }) {
  return (
    <g stroke={STEEL} strokeWidth="1" fill="none">
      <line x1={x1} y1={y} x2={x2} y2={y} />
      <line x1={x1} y1={y - 5} x2={x1} y2={y + 5} />
      <line x1={x2} y1={y - 5} x2={x2} y2={y + 5} />
      <path d={`M${x1 + 7},${y - 3} L${x1},${y} L${x1 + 7},${y + 3}`} />
      <path d={`M${x2 - 7},${y - 3} L${x2},${y} L${x2 - 7},${y + 3}`} />
      <text x={(x1 + x2) / 2} y={y - 7} textAnchor="middle" fontSize="10" fill={AMBERI} stroke="none" style={mono}>
        {label}
      </text>
    </g>
  );
}

const frames = [
  /* Nr. 01 — Langhantel, Aufriss */
  <Plate key="b1" no="Nr. 01" caption="LANGHANTEL · AUFRISS · M 1:20">
    <DimH x1={36} x2={264} y={120} label="2200" />
    <g stroke={BRIGHT} strokeWidth="2" fill="none">
      <line x1="36" y1="190" x2="264" y2="190" strokeWidth="4" />
      <rect x="58" y="171" width="14" height="38" />
      <rect x="228" y="171" width="14" height="38" />
      <rect x="40" y="158" width="16" height="64" />
      <rect x="244" y="158" width="16" height="64" />
    </g>
    <g stroke={STEEL} strokeWidth="1">
      {Array.from({ length: 12 }).map((_, i) => (
        <line key={i} x1={122 + i * 5} y1="186" x2={122 + i * 5} y2="194" />
      ))}
    </g>
    <line x1="150" y1="140" x2="150" y2="240" stroke={STEEL} strokeWidth="0.8" strokeDasharray="8 4 2 4" />
  </Plate>,

  /* Nr. 02 — Scheibe, Schnitt */
  <Plate key="b2" no="Nr. 02" caption="SCHEIBE 20 KG · SCHNITT A–A">
    <defs>
      <clipPath id="bp-disc-clip">
        <circle cx="150" cy="190" r="81" />
      </clipPath>
    </defs>
    <circle cx="150" cy="190" r="82" fill="none" stroke={BRIGHT} strokeWidth="2.2" />
    <circle cx="150" cy="190" r="64" fill="none" stroke={STEEL} strokeWidth="0.8" />
    <circle cx="150" cy="190" r="13" fill="none" stroke={BRIGHT} strokeWidth="1.6" />
    <g stroke={STEEL} strokeWidth="0.9" opacity="0.8" clipPath="url(#bp-disc-clip)">
      {Array.from({ length: 8 }).map((_, i) => (
        <line key={i} x1={70 + i * 9} y1={252 - i * 9} x2={100 + i * 9} y2={282 - i * 9} />
      ))}
    </g>
    <line x1="150" y1="190" x2="216" y2="132" stroke={STEEL} strokeWidth="1" />
    <text x="222" y="128" fontSize="10" fill={BRIGHT} style={mono}>
      R 225
    </text>
    <line x1="150" y1="190" x2="196" y2="230" stroke={STEEL} strokeWidth="0.8" />
    <text x="202" y="242" fontSize="10" fill={BRIGHT} style={mono}>
      ⌀ 50
    </text>
    <line x1="56" y1="190" x2="244" y2="190" stroke={STEEL} strokeWidth="0.8" strokeDasharray="10 4 2 4" />
  </Plate>,

  /* Nr. 03 — Hantelbahn */
  <Plate key="b3" no="Nr. 03" caption="HANTELBAHN · KNIEBEUGE">
    <g stroke={STEEL} strokeWidth="1">
      <line x1="60" y1="80" x2="60" y2="280" />
      <line x1="60" y1="280" x2="256" y2="280" />
      {Array.from({ length: 6 }).map((_, i) => (
        <line key={`t${i}`} x1="55" y1={100 + i * 34} x2="60" y2={100 + i * 34} />
      ))}
    </g>
    <line x1="150" y1="80" x2="150" y2="280" stroke={STEEL} strokeWidth="0.8" strokeDasharray="4 6" />
    <path d="M150,96 C150,150 128,168 128,204 C128,240 146,252 150,268" fill="none" stroke={CYAN} strokeWidth="2.6" />
    {[
      [150, 96],
      [136, 168],
      [128, 204],
      [142, 246],
      [150, 268],
    ].map(([cx, cy], i) => (
      <circle key={i} cx={cx} cy={cy} r="3.4" fill={BG} stroke={RED} strokeWidth="2" />
    ))}
    <path d="M150,240 A38,38 0 0 1 128,222" fill="none" stroke={RED} strokeWidth="1.2" />
    <text x="164" y="238" fontSize="10" fill={RED} style={mono}>
      92°
    </text>
  </Plate>,

  /* Nr. 04 — Winkelmesser */
  <Plate key="b4" no="Nr. 04" caption="GELENKWINKEL · SOLL 90°">
    <path d="M62,240 A88,88 0 0 1 238,240" fill="none" stroke={BRIGHT} strokeWidth="2" />
    {Array.from({ length: 19 }).map((_, i) => {
      const a = Math.PI - (i * Math.PI) / 18;
      const r1 = 88;
      const r2 = i % 3 === 0 ? 74 : 80;
      const x1 = 150 + r1 * Math.cos(a);
      const y1 = 240 - r1 * Math.sin(a);
      const x2 = 150 + r2 * Math.cos(a);
      const y2 = 240 - r2 * Math.sin(a);
      return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={STEEL} strokeWidth={i % 3 === 0 ? 1.6 : 0.8} />;
    })}
    <line x1="150" y1="240" x2="238" y2="240" stroke={BRIGHT} strokeWidth="2.4" />
    <line x1="150" y1="240" x2="150" y2="152" stroke={RED} strokeWidth="2.4" />
    <path d="M186,240 A36,36 0 0 0 150,204" fill="none" stroke={RED} strokeWidth="1.2" />
    <circle cx="150" cy="240" r="5" fill={BG} stroke={BRIGHT} strokeWidth="2" />
    <text x="196" y="212" fontSize="12" fill={RED} style={mono}>
      90°
    </text>
  </Plate>,

  /* Nr. 05 — Das Gerüst */
  <Plate key="b5" no="Nr. 05" caption="DAS GERÜST · ANSICHT VORN">
    <g stroke={BRIGHT} strokeWidth="2.2" fill="none">
      <line x1="92" y1="82" x2="92" y2="286" />
      <line x1="208" y1="82" x2="208" y2="286" />
      <line x1="80" y1="82" x2="220" y2="82" />
      <line x1="76" y1="286" x2="116" y2="286" />
      <line x1="184" y1="286" x2="224" y2="286" />
    </g>
    {Array.from({ length: 9 }).map((_, i) => (
      <g key={i}>
        <circle cx="92" cy={108 + i * 20} r="2.6" fill="none" stroke={STEEL} strokeWidth="1" />
        <circle cx="208" cy={108 + i * 20} r="2.6" fill="none" stroke={STEEL} strokeWidth="1" />
      </g>
    ))}
    <path d="M92,168 h14 v8 h-8" fill="none" stroke={RED} strokeWidth="2" />
    <path d="M208,168 h-14 v8 h8" fill="none" stroke={RED} strokeWidth="2" />
    <g stroke={STEEL} strokeWidth="1" fill="none">
      <line x1="248" y1="82" x2="248" y2="286" />
      <path d="M245,89 L248,82 L251,89 M245,279 L248,286 L251,279" />
    </g>
    <text x="256" y="188" fontSize="10" fill={BRIGHT} style={mono}>
      2130
    </text>
  </Plate>,

  /* Nr. 06 — Rundgewicht */
  <Plate key="b6" no="Nr. 06" caption="RUNDGEWICHT · RADIEN">
    <line x1="150" y1="70" x2="150" y2="300" stroke={STEEL} strokeWidth="0.8" strokeDasharray="10 4 2 4" />
    <path d="M116,158 C116,116 184,116 184,158" fill="none" stroke={BRIGHT} strokeWidth="9" strokeLinecap="round" />
    <circle cx="150" cy="204" r="52" fill="none" stroke={BRIGHT} strokeWidth="2.2" />
    <line x1="104" y1="242" x2="196" y2="242" stroke={BRIGHT} strokeWidth="2.2" />
    <g stroke={STEEL} strokeWidth="1" fill="none">
      <line x1="150" y1="204" x2="188" y2="166" />
      <line x1="150" y1="132" x2="196" y2="108" />
    </g>
    <text x="194" y="160" fontSize="10" fill={GREENI} style={mono}>
      R 52
    </text>
    <text x="202" y="104" fontSize="10" fill={GREENI} style={mono}>
      R 34
    </text>
    <circle cx="150" cy="204" r="3" fill={RED} />
  </Plate>,

  /* Nr. 07 — Zugmesser */
  <Plate key="b7" no="Nr. 07" caption="ZUGMESSER · 0–100 KG">
    <g stroke={CYAN} strokeWidth="2" fill="none">
      <path d="M150,74 q-12,10 0,20 q12,10 0,20 q-12,10 0,20 q12,10 0,20" />
      <path d="M142,64 a8,8 0 1 1 16,0 M150,60 v14" />
    </g>
    <rect x="122" y="158" width="56" height="120" rx="6" fill="none" stroke={BRIGHT} strokeWidth="2" />
    {Array.from({ length: 11 }).map((_, i) => (
      <line key={i} x1="130" y1={168 + i * 10} x2={i % 5 === 0 ? 148 : 141} y2={168 + i * 10} stroke={STEEL} strokeWidth={i % 5 === 0 ? 1.6 : 0.8} />
    ))}
    <line x1="130" y1="212" x2="170" y2="206" stroke={RED} strokeWidth="2.4" />
    <text x="184" y="212" fontSize="10" fill={RED} style={mono}>
      44
    </text>
    <path d="M150,278 v18 m-8,-6 a8,10 0 1 0 16,0" fill="none" stroke={BRIGHT} strokeWidth="2" />
  </Plate>,

  /* Nr. 08 — Verschluss, zerlegt */
  <Plate key="b8" no="Nr. 08" caption="VERSCHLUSS · ZERLEGT">
    <line x1="50" y1="190" x2="250" y2="190" stroke={STEEL} strokeWidth="0.8" strokeDasharray="10 4 2 4" />
    <circle cx="92" cy="190" r="30" fill="none" stroke={BRIGHT} strokeWidth="2.2" />
    <circle cx="92" cy="190" r="15" fill="none" stroke={STEEL} strokeWidth="1" />
    <g fill="none" stroke={BRIGHT} strokeWidth="2.2">
      <rect x="152" y="176" width="34" height="28" rx="4" />
      <line x1="169" y1="176" x2="169" y2="156" />
      <circle cx="169" cy="150" r="7" />
    </g>
    <g fill="none" stroke={BRIGHT} strokeWidth="2.2">
      <path d="M226,166 l16,48" />
      <circle cx="224" cy="160" r="8" />
    </g>
    <g stroke={STEEL} strokeWidth="0.9" fill="none">
      <line x1="92" y1="152" x2="92" y2="122" />
      <line x1="169" y1="140" x2="169" y2="120" />
      <line x1="230" y1="146" x2="230" y2="120" />
    </g>
    {["a", "b", "c"].map((c, i) => (
      <text key={c} x={[92, 169, 230][i]} y="112" textAnchor="middle" fontSize="11" fill={BRIGHT} style={mono}>
        {c}
      </text>
    ))}
  </Plate>,
];

const end = (
  <svg viewBox="0 0 300 360" style={{ display: "block", width: "100%" }}>
    <defs>
      <pattern id="bp-grid-end" width="20" height="20" patternUnits="userSpaceOnUse">
        <path d="M20 0 H0 V20" fill="none" stroke={GRID} strokeWidth="1" />
      </pattern>
    </defs>
    <rect width="300" height="360" fill={BG} />
    <rect width="300" height="360" fill="url(#bp-grid-end)" />
    <g stroke={STEEL} strokeWidth="1" opacity="0.55">
      <line x1="0" y1="180" x2="300" y2="180" />
      <line x1="150" y1="0" x2="150" y2="360" />
    </g>
    <g stroke={STEEL} strokeWidth="1" opacity="0.8">
      <path d="M14,26 h14 M26,14 v14 M286,26 h-14 M274,14 v14 M14,334 h14 M26,346 v-14 M286,334 h-14 M274,346 v-14" fill="none" />
    </g>
    <text x="150" y="170" textAnchor="middle" fontSize="42" letterSpacing="4" fill={TXT} style={disp}>
      TRAINING
    </text>
    <line x1="98" y1="192" x2="128" y2="192" stroke={AMBERI} strokeWidth="3" />
    <line x1="134" y1="192" x2="166" y2="192" stroke={RED} strokeWidth="3" />
    <line x1="172" y1="192" x2="202" y2="192" stroke={CYAN} strokeWidth="3" />
    <text x="150" y="222" textAnchor="middle" fontSize="10" letterSpacing="4" fill={GREENI} style={mono}>
      SYSTEM BEREIT
    </text>
  </svg>
);

export const BLAUPAUSE: FlipConcept = {
  id: "blaupause",
  title: "Die Blaupause",
  sub: "Konstruktions-Tafeln — Bemaßung, Schnitte, Hantelbahn in Stahlblau + Rot",
  bg: "#0A101A",
  fg: TXT,
  frames,
  end,
  heroIndex: 2,
};
