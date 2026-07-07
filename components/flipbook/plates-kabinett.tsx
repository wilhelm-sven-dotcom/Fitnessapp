/* eslint-disable react/no-unescaped-entities */
/**
 * Daumenkino-Tafeln (Boot-Animation) — „Das Kabinett".
 * Alte Sport-Sammelbilder: cremefarbene Karten mit Doppelrahmen und Serien-
 * Unterschrift blättern durch — Boxer, Ruderer, Bahnrad, Stoppuhr … → Wortmarke.
 */
import type { FlipConcept } from "./types";

const BG = "#121814";
const CARD = "#EDE6D2";
const BAND = "#E2D8BF";
const INK = "#2B2620";
const FAINT = "#8A7D66";
const RED = "#C13A2C";
/* Handkolorierung — Sammelbilder waren farbige Lithografien */
const GOLD = "#C9A227";
const BLUE = "#3E6E9E";
const GREEN = "#4E7A46";
const TAN = "#C98F5A";

const serif = { fontFamily: "var(--font-newsreader), Georgia, serif" } as const;
const inter = { fontFamily: "var(--font-inter), Arial, sans-serif" } as const;
const anton = { fontFamily: "var(--font-anton), Arial Black, sans-serif" } as const;

function Card({
  name,
  nr,
  children,
}: {
  name: string;
  nr: number;
  children: React.ReactNode;
}) {
  return (
    <svg viewBox="0 0 300 360" style={{ display: "block", width: "100%" }}>
      <rect width="300" height="360" fill={BG} />
      <rect x="44" y="22" width="212" height="306" rx="3" fill={CARD} />
      <rect x="52" y="30" width="196" height="290" fill="none" stroke={INK} strokeWidth="1.4" />
      <rect x="56" y="34" width="188" height="282" fill="none" stroke={INK} strokeWidth="0.5" />
      <rect x="146" y="42" width="8" height="8" transform="rotate(45 150 46)" fill={RED} />
      {children}
      <rect x="56" y="266" width="188" height="50" fill={BAND} />
      <line x1="56" y1="266" x2="244" y2="266" stroke={INK} strokeWidth="0.8" />
      <text x="150" y="288" textAnchor="middle" fontSize="15" letterSpacing="1" fill={INK} style={serif}>
        {name}
      </text>
      <text x="150" y="305" textAnchor="middle" fontSize="8" letterSpacing="2.5" fill={FAINT} style={inter}>
        SERIE: ATHLETIK · BILD {nr}
      </text>
    </svg>
  );
}

const frames = [
  /* 1 — Der Boxer (Büste mit Deckung) */
  <Card key="k1" name="Der Boxer" nr={1}>
    <circle cx="150" cy="112" r="16" fill="none" stroke={INK} strokeWidth="2.6" />
    {/* Büste */}
    <path d="M104,232 C106,168 124,148 150,148 C176,148 194,168 196,232" fill="none" stroke={INK} strokeWidth="2.6" />
    <line x1="150" y1="188" x2="150" y2="226" stroke={INK} strokeWidth="0.8" opacity="0.5" />
    {/* Unterarme hoch zur Deckung */}
    <g stroke={INK} strokeWidth="10" strokeLinecap="round">
      <line x1="114" y1="204" x2="126" y2="152" />
      <line x1="186" y1="204" x2="174" y2="152" />
    </g>
    {/* Handschuhe am Kinn — natürlich rot */}
    <circle cx="127" cy="140" r="13" fill={RED} stroke={INK} strokeWidth="1.6" />
    <circle cx="173" cy="140" r="13" fill={RED} stroke={INK} strokeWidth="1.6" />
    <path d="M118,146 q-6,4 -4,10 M182,146 q6,4 4,10" fill="none" stroke={RED} strokeWidth="2.4" />
  </Card>,

  /* 2 — Der Ruderer (sitzend, im Zug) */
  <Card key="k2" name="Der Ruderer" nr={2}>
    <path d="M74,226 Q150,250 226,226" fill="none" stroke={BLUE} strokeWidth="2.8" />
    <line x1="66" y1="240" x2="234" y2="240" stroke={BLUE} strokeWidth="1" strokeDasharray="6 5" opacity="0.7" />
    {/* Riemen mit Blatt */}
    <line x1="86" y1="130" x2="196" y2="222" stroke={TAN} strokeWidth="3.4" />
    <path d="M80,124 l14,12 l-10,12 l-14,-12 z" fill={RED} stroke={INK} strokeWidth="1.2" />
    {/* Figur: Beine angewinkelt, Rücken in Zuglage, Arme am Griff */}
    <g stroke={INK} strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" fill="none">
      <polyline points="188,218 162,208 140,214" />
      <polyline points="140,214 122,196 116,174" />
      <line x1="122" y1="194" x2="140" y2="180" />
    </g>
    <circle cx="110" cy="160" r="10" fill={INK} />
    <line x1="132" y1="220" x2="150" y2="222" stroke={INK} strokeWidth="3" />
  </Card>,

  /* 3 — Das Bahnrad */
  <Card key="k3" name="Das Bahnrad" nr={3}>
    {[96, 204].map((cx) => (
      <g key={cx}>
        <circle cx={cx} cy="214" r="38" fill="none" stroke={INK} strokeWidth="2.6" />
        <circle cx={cx} cy="214" r="4" fill={INK} />
        {[0, 60, 120].map((a) => (
          <line
            key={a}
            x1={cx - 34 * Math.cos((a * Math.PI) / 180)}
            y1={214 - 34 * Math.sin((a * Math.PI) / 180)}
            x2={cx + 34 * Math.cos((a * Math.PI) / 180)}
            y2={214 + 34 * Math.sin((a * Math.PI) / 180)}
            stroke={INK}
            strokeWidth="0.8"
          />
        ))}
      </g>
    ))}
    <g stroke={GREEN} strokeWidth="3" fill="none">
      <polyline points="96,214 138,158 196,164 150,218 96,214" />
      <line x1="150" y1="218" x2="138" y2="158" />
      <line x1="196" y1="164" x2="204" y2="214" />
    </g>
    <g stroke={INK} strokeWidth="2.6" fill="none">
      <line x1="132" y1="150" x2="146" y2="150" />
      <path d="M198,156 q14,-4 12,10" />
    </g>
    <circle cx="150" cy="218" r="8" fill="none" stroke={INK} strokeWidth="1.6" />
  </Card>,

  /* 4 — Die Stoppuhr */
  <Card key="k4" name="Die Stoppuhr" nr={4}>
    <rect x="143" y="98" width="14" height="13" fill={GOLD} stroke={INK} strokeWidth="1.6" />
    <circle cx="150" cy="178" r="62" fill="none" stroke={GOLD} strokeWidth="5" />
    <circle cx="150" cy="178" r="65" fill="none" stroke={INK} strokeWidth="1.2" />
    <circle cx="150" cy="178" r="59" fill="none" stroke={INK} strokeWidth="1" />
    <circle cx="150" cy="178" r="55" fill="none" stroke={FAINT} strokeWidth="0.7" />
    {Array.from({ length: 12 }).map((_, i) => {
      const a = (i * 30 * Math.PI) / 180;
      return (
        <line
          key={i}
          x1={150 + 48 * Math.sin(a)}
          y1={178 - 48 * Math.cos(a)}
          x2={150 + (i % 3 === 0 ? 40 : 44) * Math.sin(a)}
          y2={178 - (i % 3 === 0 ? 40 : 44) * Math.cos(a)}
          stroke={INK}
          strokeWidth={i % 3 === 0 ? 2 : 1}
        />
      );
    })}
    <circle cx="150" cy="202" r="11" fill="none" stroke={FAINT} strokeWidth="1" />
    <line x1="150" y1="178" x2="150" y2="140" stroke={INK} strokeWidth="3" strokeLinecap="round" />
    <line x1="150" y1="178" x2="182" y2="200" stroke={RED} strokeWidth="2" strokeLinecap="round" />
    <circle cx="150" cy="178" r="4" fill={INK} />
  </Card>,

  /* 5 — Die Startnummer */
  <Card key="k5" name="Die Startnummer" nr={5}>
    <g transform="rotate(-5 150 180)">
      <rect x="98" y="118" width="104" height="122" fill="#F6F0DF" stroke={INK} strokeWidth="2" />
      <path d="M202,214 l-22,26 l22,0 z" fill={BAND} stroke={INK} strokeWidth="1.2" />
      <circle cx="108" cy="128" r="4" fill="none" stroke={INK} strokeWidth="1.6" />
      <circle cx="192" cy="128" r="4" fill="none" stroke={INK} strokeWidth="1.6" />
      <text x="150" y="212" textAnchor="middle" fontSize="64" fill={RED} style={serif}>
        7
      </text>
    </g>
  </Card>,

  /* 6 — Das Hantelpaar */
  <Card key="k6" name="Das Hantelpaar" nr={6}>
    {[-26, 26].map((rot) => (
      <g key={rot} transform={`rotate(${rot} 150 180)`}>
        <line x1="96" y1="180" x2="204" y2="180" stroke={INK} strokeWidth="6" strokeLinecap="round" />
        <rect x="92" y="162" width="13" height="36" rx="4" fill={BLUE} stroke={INK} strokeWidth="1.4" />
        <rect x="80" y="168" width="9" height="24" rx="3" fill={RED} stroke={INK} strokeWidth="1.4" />
        <rect x="195" y="162" width="13" height="36" rx="4" fill={BLUE} stroke={INK} strokeWidth="1.4" />
        <rect x="211" y="168" width="9" height="24" rx="3" fill={RED} stroke={INK} strokeWidth="1.4" />
      </g>
    ))}
  </Card>,

  /* 7 — Der Medizinball */
  <Card key="k7" name="Der Medizinball" nr={7}>
    <circle cx="150" cy="180" r="61" fill={TAN} fillOpacity="0.55" stroke={INK} strokeWidth="2.6" />
    <path d="M150,118 C 188,144 188,216 150,242" fill="none" stroke={INK} strokeWidth="1.6" />
    <path d="M150,118 C 112,144 112,216 150,242" fill="none" stroke={INK} strokeWidth="1.6" />
    <ellipse cx="150" cy="180" rx="62" ry="16" fill="none" stroke={FAINT} strokeWidth="0.9" />
    <g stroke={INK} strokeWidth="1.2">
      {Array.from({ length: 7 }).map((_, i) => (
        <line key={i} x1={146} y1={130 + i * 15} x2={154} y2={134 + i * 15} />
      ))}
    </g>
  </Card>,

  /* 8 — Der Pokal */
  <Card key="k8" name="Der Pokal" nr={8}>
    <path d="M112,110 h76 v16 c0,34 -16,52 -38,52 c-22,0 -38,-18 -38,-52 z" fill={GOLD} fillOpacity="0.6" stroke={INK} strokeWidth="2.6" />
    <path d="M112,122 c-26,2 -24,36 8,38" fill="none" stroke={INK} strokeWidth="2" />
    <path d="M188,122 c26,2 24,36 -8,38" fill="none" stroke={INK} strokeWidth="2" />
    <rect x="142" y="178" width="16" height="20" fill="none" stroke={INK} strokeWidth="2" />
    <rect x="122" y="198" width="56" height="10" fill="none" stroke={INK} strokeWidth="2" />
    <rect x="112" y="208" width="76" height="12" fill="none" stroke={INK} strokeWidth="2.4" />
    <text x="150" y="152" textAnchor="middle" fontSize="24" fill={INK} style={serif}>
      1.
    </text>
    <path d="M128,238 q22,12 44,0" fill="none" stroke={RED} strokeWidth="2" />
  </Card>,
];

const end = (
  <svg viewBox="0 0 300 360" style={{ display: "block", width: "100%" }}>
    <rect width="300" height="360" fill={BG} />
    <rect x="44" y="22" width="212" height="306" rx="3" fill={CARD} />
    <rect x="52" y="30" width="196" height="290" fill="none" stroke={INK} strokeWidth="1.4" />
    <rect x="56" y="34" width="188" height="282" fill="none" stroke={INK} strokeWidth="0.5" />
    <g stroke={RED} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" fill="none">
      <path d="M140,108 L150,98 L160,108" />
      <path d="M140,120 L150,110 L160,120" />
    </g>
    <text x="150" y="182" textAnchor="middle" fontSize="40" letterSpacing="1" fill={INK} style={anton}>
      TRAINING
    </text>
    <line x1="118" y1="200" x2="182" y2="200" stroke={RED} strokeWidth="2.4" />
    <text x="150" y="224" textAnchor="middle" fontSize="11" fill={FAINT} style={{ ...serif, fontStyle: "italic" }}>
      Ein Programm für Kraft
    </text>
    <circle cx="150" cy="258" r="15" fill={RED} />
    <path d="M143,260 L150,253 L157,260 M143,266 L150,259 L157,266" fill="none" stroke={CARD} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    <rect x="56" y="288" width="188" height="28" fill={BAND} />
    <text x="150" y="306" textAnchor="middle" fontSize="7.5" letterSpacing="1.5" fill={FAINT} style={inter}>
      SERIE: ATHLETIK · VOLLSTÄNDIG
    </text>
  </svg>
);

export const KABINETT: FlipConcept = {
  id: "kabinett",
  title: "Das Kabinett",
  sub: "Alte Sport-Sammelbilder, Karte für Karte — die wörtlichste Claude-Anmutung",
  bg: "#0D120F",
  fg: "#EDE6D2",
  frames,
  end,
  heroIndex: 3,
};
