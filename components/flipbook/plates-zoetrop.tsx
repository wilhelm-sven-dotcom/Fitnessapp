/* eslint-disable react/no-unescaped-entities */
/**
 * Daumenkino-Tafeln (Boot-Animation) — „Das Zoetrop".
 * EINE kraftvolle Bewegung (Kniebeuge) als schnelle Serienbild-Studie:
 * großformatige Bernstein-Silhouette, Kamera-Passermarken, Phasen-Zähler,
 * Filmstreifen-Perforation. Posen parametrisch konstruiert (keine Alt-Figuren).
 */
import type { FlipConcept } from "./types";

const BG = "#0E0F12";
const DIM = "#3A3E47";
const FAINT = "#5E626B";
const TXT = "#ECEEF2";

const mono = { fontFamily: "var(--font-jbmono), ui-monospace, monospace" } as const;
const sora = { fontFamily: "var(--font-sora), Arial, sans-serif", fontWeight: 700 } as const;

const RAD = Math.PI / 180;

/** Seitliche Kniebeuge-Pose aus Tiefe d (0 = stehend … 1 = tief). */
function pose(d: number) {
  const A = { x: 138, y: 272 };
  const Ls = 62, Lt = 64, Lo = 72;
  const a1 = (6 + 30 * d) * RAD;
  const a2 = (8 + 88 * d) * RAD;
  const a3 = (4 + 34 * d) * RAD;
  const knee = { x: A.x + Ls * Math.sin(a1), y: A.y - Ls * Math.cos(a1) };
  const hip = { x: knee.x - Lt * Math.sin(a2), y: knee.y - Lt * Math.cos(a2) };
  const sh = { x: hip.x + Lo * Math.sin(a3), y: hip.y - Lo * Math.cos(a3) };
  const head = { x: sh.x + 22 * Math.sin(a3), y: sh.y - 22 * Math.cos(a3) };
  const hand = { x: sh.x + 56, y: sh.y + 6 + 16 * d };
  return { A, knee, hip, sh, head, hand };
}

/* Ausgeflippt: jede Phase hat ihre eigene Leuchtfarbe — Pop-Art-Zoetrop. */
const HUES = ["#FF9F0A", "#FF6B1A", "#FF375F", "#E14FCE", "#8B5CF6", "#38BDF8", "#34D399", "#FFD60A"];

function Frame({ d, idx, total }: { d: number; idx: number; total: number }) {
  const p = pose(d);
  const nn = String(idx + 1).padStart(2, "0");
  const hue = HUES[idx % HUES.length];
  return (
    <svg viewBox="0 0 300 360" style={{ display: "block", width: "100%" }}>
      <rect width="300" height="360" fill={BG} />
      {/* riesige Phasen-Ziffer in der Phasen-Farbe hinter der Figur */}
      <text x="262" y="292" textAnchor="end" fontSize="150" fill={hue} opacity="0.2" style={sora}>
        {idx + 1}
      </text>
      {/* Kamera-Passermarken */}
      <g stroke={FAINT} strokeWidth="2" fill="none">
        <path d="M22,42 v-14 h14 M278,42 v-14 h-14 M22,296 v14 h14 M278,296 v14 h-14" />
      </g>
      <text x="24" y="62" fontSize="9" letterSpacing="2" fill={FAINT} style={mono}>
        STUDIE · KNIEBEUGE
      </text>
      <text x="276" y="62" textAnchor="end" fontSize="9" letterSpacing="2" fill={hue} style={mono}>
        PHASE {nn}/{String(total).padStart(2, "0")}
      </text>
      {/* Boden + Figur (leicht nach unten versetzt, damit die Kopfzeile frei bleibt) */}
      <g transform="translate(4 30)">
        <line x1="56" y1="272" x2="248" y2="272" stroke={DIM} strokeWidth="2" />
        <g stroke={hue} strokeWidth="15" strokeLinecap="round" strokeLinejoin="round" fill="none">
          <polyline points={`${p.A.x - 14},${p.A.y} ${p.A.x + 26},${p.A.y}`} strokeWidth="11" />
          <polyline points={`${p.A.x},${p.A.y} ${p.knee.x},${p.knee.y} ${p.hip.x},${p.hip.y} ${p.sh.x},${p.sh.y}`} />
          <line x1={p.sh.x} y1={p.sh.y} x2={p.hand.x} y2={p.hand.y} strokeWidth="12" />
        </g>
        <circle cx={p.head.x} cy={p.head.y} r="14" fill={hue} />
      </g>
      {/* Filmstreifen-Perforation */}
      <g fill={DIM}>
        {Array.from({ length: 9 }).map((_, i) => (
          <rect key={i} x={34 + i * 28} y="330" width="12" height="9" rx="2" />
        ))}
      </g>
    </svg>
  );
}

const DEPTHS = [0, 0.18, 0.42, 0.68, 0.9, 1, 0.62, 0.28];

const frames = DEPTHS.map((d, i) => <Frame key={i} d={d} idx={i} total={DEPTHS.length} />);

const end = (
  <svg viewBox="0 0 300 360" style={{ display: "block", width: "100%" }}>
    <rect width="300" height="360" fill={BG} />
    <g stroke={FAINT} strokeWidth="2" fill="none">
      <path d="M22,42 v-14 h14 M278,42 v-14 h-14 M22,296 v14 h14 M278,296 v14 h-14" />
    </g>
    {/* Instrument-Bogen, der sich gerade gefüllt hat */}
    {/* Regenbogen-Bogen: alle Phasen-Farben laufen im Finale zusammen */}
    <path d="M78,168 A82,82 0 0 1 222,168" fill="none" stroke={DIM} strokeWidth="8" strokeLinecap="round" />
    <path d="M78,168 A82,82 0 0 1 92,124" fill="none" stroke="#FF9F0A" strokeWidth="8" strokeLinecap="round" />
    <path d="M92,124 A82,82 0 0 1 122,96" fill="none" stroke="#FF375F" strokeWidth="8" />
    <path d="M122,96 A82,82 0 0 1 160,87" fill="none" stroke="#E14FCE" strokeWidth="8" />
    <path d="M160,87 A82,82 0 0 1 196,104" fill="none" stroke="#38BDF8" strokeWidth="8" />
    <circle cx="196" cy="104" r="7" fill="#34D399" />
    <text x="150" y="216" textAnchor="middle" fontSize="34" fill={TXT} style={sora}>
      Training
    </text>
    <text x="150" y="248" textAnchor="middle" fontSize="10" letterSpacing="3" fill={FAINT} style={mono}>
      BEREIT, WENN DU ES BIST
    </text>
    <g fill={DIM}>
      {Array.from({ length: 9 }).map((_, i) => (
        <rect key={i} x={34 + i * 28} y="330" width="12" height="9" rx="2" />
      ))}
    </g>
  </svg>
);

export const ZOETROP: FlipConcept = {
  id: "zoetrop",
  title: "Das Zoetrop",
  sub: "Eine Bewegung, acht Phasen — Serienbild-Studie in Bernstein",
  bg: "#0A0B0E",
  fg: TXT,
  frames,
  end,
  heroIndex: 5,
};
