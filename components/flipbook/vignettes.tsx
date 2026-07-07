/**
 * Erfolgs-Vignetten — kleine Gravur-Motive im Stil der Daumenkino-Tafeln
 * (Tusche auf Papier, sparsame Handkolorierung). Eine Vignette je Erfolg aus
 * `lib/achievements.ts`; `muted` zeichnet die „unentwickelte" Tafel (blasse
 * Tinte, keine Kolorierung) für noch gesperrte Erfolge.
 */
import {
  PLATE_BLUE,
  PLATE_FAINT,
  PLATE_GREEN,
  PLATE_INK,
  PLATE_OCHRE,
  PLATE_RED,
  PLATE_SERIF_IT,
} from "./PlateFrame";

/** Zeichen-Palette einer Vignette: Tinte + Kolorierung (bei muted aus). */
interface Ink {
  ink: string;
  faint: string;
  /** Kolorierungs-Farbe — bei muted "none" (nur Umriss bleibt). */
  tint: (c: string) => string;
}

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <svg viewBox="0 0 120 96" style={{ display: "block", width: "100%" }} aria-hidden>
      {children}
    </svg>
  );
}

/* ── Die 13 Motive ─────────────────────────────────────────────────────── */

const MOTIFS: Record<string, (k: Ink) => React.ReactNode> = {
  /* Erste Einheit — die Kugelhantel, № 1 des Archivs. */
  first_session: (k) => (
    <>
      <circle cx="36" cy="58" r="16" fill={k.tint(PLATE_BLUE)} opacity="0.4" />
      <circle cx="84" cy="58" r="16" fill={k.tint(PLATE_BLUE)} opacity="0.4" />
      <g stroke={k.ink} strokeWidth="2.2" fill="none">
        <circle cx="36" cy="58" r="17" />
        <circle cx="84" cy="58" r="17" />
        <rect x="50" y="53" width="20" height="10" rx="5" />
      </g>
      <text x="102" y="24" textAnchor="end" fontSize="12" fill={k.ink} style={PLATE_SERIF_IT}>
        № 1
      </text>
      <line x1="24" y1="82" x2="96" y2="82" stroke={k.faint} strokeWidth="1" />
    </>
  ),

  /* 50 Einheiten — die Strichliste des Chronisten. */
  fifty_sessions: (k) => (
    <>
      {[0, 1].map((row) =>
        [0, 1].map((col) => {
          const x = 22 + col * 46;
          const y = 26 + row * 26;
          return (
            <g key={`${row}${col}`} stroke={k.ink} strokeWidth="2" strokeLinecap="round">
              {[0, 8, 16, 24].map((dx) => (
                <line key={dx} x1={x + dx} y1={y} x2={x + dx} y2={y + 16} />
              ))}
              <line x1={x - 4} y1={y + 14} x2={x + 28} y2={y + 2} stroke={k.tint(PLATE_RED) === "none" ? k.ink : PLATE_RED} strokeWidth="2.2" />
            </g>
          );
        }),
      )}
      <text x="98" y="86" textAnchor="end" fontSize="11" fill={k.faint} style={PLATE_SERIF_IT}>
        u. s. w.
      </text>
    </>
  ),

  /* Eine Tonne am Stück — der Zirkus-Gewichtsstein. */
  ton_session: (k) => (
    <>
      <rect x="34" y="46" width="52" height="34" rx="3" fill={k.tint(PLATE_OCHRE)} opacity="0.35" />
      <g stroke={k.ink} strokeWidth="2.2" fill="none">
        <rect x="34" y="46" width="52" height="34" rx="3" />
        <path d="M46,46 C46,28 74,28 74,46" />
      </g>
      <text x="60" y="68" textAnchor="middle" fontSize="13" fill={k.ink} style={PLATE_SERIF_IT}>
        1000 kg
      </text>
    </>
  ),

  /* 10-Tonnen-Woche — der bestiegene Gipfel. */
  ten_ton_week: (k) => (
    <>
      <path d="M46,36 L54,26 L62,38 L54,44 Z" fill={k.tint(PLATE_BLUE)} opacity="0.35" />
      <path
        d="M14,80 L54,26 L72,50 L92,30 L108,80 Z"
        fill="none"
        stroke={k.ink}
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
      <line x1="54" y1="26" x2="54" y2="12" stroke={k.ink} strokeWidth="2" />
      <path d="M54,12 L68,16 L54,21 Z" fill={k.tint(PLATE_RED)} stroke={k.ink} strokeWidth="1.2" />
      <line x1="10" y1="80" x2="112" y2="80" stroke={k.faint} strokeWidth="1" />
    </>
  ),

  /* 10 Tonnen gesamt — der Steinstapel im Depot. */
  ten_ton_total: (k) => (
    <>
      <rect x="38" y="48" width="44" height="16" rx="2" fill={k.tint(PLATE_GREEN)} opacity="0.3" />
      <g stroke={k.ink} strokeWidth="2.2" fill="none">
        <rect x="30" y="66" width="60" height="16" rx="2" />
        <rect x="38" y="48" width="44" height="16" rx="2" />
        <rect x="46" y="32" width="28" height="14" rx="2" />
        <path d="M52,32 C52,22 68,22 68,32" strokeWidth="1.8" />
      </g>
    </>
  ),

  /* 10 Wochen am Stück — die Fackel, die nicht ausgeht. */
  streak_10: (k) => (
    <>
      <path
        d="M60,18 C50,32 46,40 52,48 C55,52 65,52 68,48 C74,40 70,32 60,18 Z"
        fill={k.tint(PLATE_RED)}
        opacity="0.45"
      />
      <path
        d="M60,28 C56,36 55,40 58,44 C60,47 64,46 65,43 C67,38 64,34 60,28 Z"
        fill={k.tint(PLATE_OCHRE)}
        opacity="0.55"
      />
      <path
        d="M60,18 C50,32 46,40 52,48 C55,52 65,52 68,48 C74,40 70,32 60,18 Z"
        fill="none"
        stroke={k.ink}
        strokeWidth="2"
      />
      <g stroke={k.ink} strokeWidth="2.2" fill="none">
        <path d="M50,56 L70,56 L66,64 L54,64 Z" />
        <line x1="60" y1="64" x2="60" y2="86" strokeWidth="3" />
      </g>
    </>
  ),

  /* Ganzkörper-Woche — die Studie des ganzen Athleten. */
  full_coverage: (k) => (
    <>
      <circle cx="60" cy="50" r="32" fill={k.tint(PLATE_BLUE)} opacity="0.15" />
      <circle cx="60" cy="50" r="32" fill="none" stroke={k.ink} strokeWidth="1.6" />
      <g stroke={k.ink} strokeWidth="3" strokeLinecap="round" fill="none">
        <line x1="60" y1="42" x2="60" y2="62" />
        <line x1="38" y1="48" x2="82" y2="48" />
        <line x1="60" y1="62" x2="46" y2="76" />
        <line x1="60" y1="62" x2="74" y2="76" />
      </g>
      <circle cx="60" cy="34" r="5.5" fill={k.ink} />
    </>
  ),

  /* Erster Rekord — die Medaille am Band. */
  first_pr: (k) => (
    <>
      <path d="M48,10 L58,10 L55,38 L48,36 Z" fill={k.tint(PLATE_RED)} opacity="0.4" stroke={k.ink} strokeWidth="1.4" />
      <path d="M72,10 L62,10 L65,38 L72,36 Z" fill={k.tint(PLATE_RED)} opacity="0.4" stroke={k.ink} strokeWidth="1.4" />
      <circle cx="60" cy="58" r="19" fill={k.tint(PLATE_OCHRE)} opacity="0.35" />
      <circle cx="60" cy="58" r="19" fill="none" stroke={k.ink} strokeWidth="2.2" />
      <path
        d="M60,48 L63,55 L70,55 L64.5,59.5 L66.5,66.5 L60,62.5 L53.5,66.5 L55.5,59.5 L50,55 L57,55 Z"
        fill={k.ink}
      />
    </>
  ),

  /* Zehn Rekorde — der Pokal auf dem Kaminsims. */
  pr_collector: (k) => (
    <>
      <path d="M42,24 L78,24 L78,40 A18,18 0 0 1 42,40 Z" fill={k.tint(PLATE_OCHRE)} opacity="0.4" />
      <g stroke={k.ink} strokeWidth="2.2" fill="none">
        <path d="M42,24 L78,24 L78,40 A18,18 0 0 1 42,40 Z" />
        <path d="M42,28 C30,30 30,42 44,44" />
        <path d="M78,28 C90,30 90,42 76,44" />
        <line x1="60" y1="58" x2="60" y2="68" strokeWidth="3" />
        <rect x="44" y="68" width="32" height="7" />
      </g>
      <line x1="34" y1="82" x2="86" y2="82" stroke={k.faint} strokeWidth="1" />
    </>
  ),

  /* PR-Hattrick — drei Stufen, ein Anstieg. */
  pr_hattrick: (k) => (
    <>
      <rect x="76" y="34" width="16" height="46" fill={k.tint(PLATE_GREEN)} opacity="0.3" />
      <g stroke={k.ink} strokeWidth="2.2" fill="none">
        <rect x="28" y="62" width="16" height="18" />
        <rect x="52" y="48" width="16" height="32" />
        <rect x="76" y="34" width="16" height="46" />
      </g>
      <g stroke={k.tint(PLATE_RED) === "none" ? k.ink : PLATE_RED} strokeWidth="2.5" fill="none" strokeLinecap="round">
        <line x1="26" y1="54" x2="92" y2="22" />
        <path d="M82,20 L92,22 L86,30" />
      </g>
    </>
  ),

  /* 100 Sätze — centum, in Stein gemeißelt. */
  hundred_sets: (k) => (
    <>
      <text
        x="60"
        y="62"
        textAnchor="middle"
        fontSize="52"
        fill={k.ink}
        style={{ ...PLATE_SERIF_IT, fontStyle: "normal" }}
      >
        C
      </text>
      <circle cx="82" cy="58" r="3" fill={k.tint(PLATE_RED) === "none" ? k.faint : PLATE_RED} />
      <line x1="38" y1="70" x2="82" y2="70" stroke={k.faint} strokeWidth="1" />
      <text x="60" y="86" textAnchor="middle" fontSize="11" fill={k.faint} style={PLATE_SERIF_IT}>
        centum.
      </text>
    </>
  ),

  /* Saubere Steuerung — der Pfeil sitzt. */
  clean_rir: (k) => (
    <>
      <circle cx="56" cy="54" r="10" fill={k.tint(PLATE_RED)} opacity="0.45" />
      <g stroke={k.ink} strokeWidth="2" fill="none">
        <circle cx="56" cy="54" r="28" />
        <circle cx="56" cy="54" r="19" />
        <circle cx="56" cy="54" r="10" />
      </g>
      <g stroke={k.ink} strokeWidth="2.5" strokeLinecap="round" fill="none">
        <line x1="92" y1="18" x2="62" y2="48" />
        <path d="M71,46 L62,48 L64,39" strokeWidth="2" />
        <path d="M85,13 L92,18 L87,25" strokeWidth="1.8" />
      </g>
    </>
  ),

  /* Deload-Disziplin — das Schild der Vernunft. */
  deload_discipline: (k) => (
    <>
      <path d="M30,42 L90,30 L90,42 L30,54 Z" fill={k.tint(PLATE_BLUE)} opacity="0.35" />
      <path
        d="M60,12 L92,22 L92,52 C92,70 78,80 60,88 C42,80 28,70 28,52 L28,22 Z"
        fill="none"
        stroke={k.ink}
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
      <g stroke={k.faint} strokeWidth="0.9" opacity="0.7">
        {[62, 68, 74].map((y) => (
          <line key={y} x1="40" y1={y} x2="80" y2={y - 6} />
        ))}
      </g>
    </>
  ),
};

/* ─────────────────────────────────────────────────────────────────────── */

export function AchievementVignette({ id, muted = false }: { id: string; muted?: boolean }) {
  const k: Ink = {
    ink: muted ? PLATE_FAINT : PLATE_INK,
    faint: PLATE_FAINT,
    tint: (c) => (muted ? "none" : c),
  };
  const draw = MOTIFS[id] ?? MOTIFS.first_session;
  return <Frame>{draw(k)}</Frame>;
}
