import { FIGUR_KNIEBEUGE, type PhasenPrimitive, type Punkt } from "@/lib/phasen/figuren";

/**
 * Marken-Zeichnung „Marey-Spur" (Nachtrag 2, Icon I1) — die EINE Stelle, an
 * der aus Phasen-Primitiven statisches SVG wird. Zwei sehr unterschiedliche
 * Konsumenten teilen sie, damit Homescreen-Icon und App-Marke nie driften:
 *
 *  · `lib/icon-art.tsx` → Satori/next-og (Icon-Routen, Edge-Runtime)
 *  · `components/brand/*` → das DOM
 *
 * Deshalb bewusst hooks- und zustandsfrei, ohne "use client", und beschränkt
 * auf den SVG-Wortschatz, den Satori sicher durchreicht: <g>, <path>, <line>,
 * <circle>. KEIN <polyline> (PhasenFigur darf das, Satori nicht) und keine
 * verschachtelten Transforms — jede Phase bekommt genau EIN <g transform>.
 *
 * Die Farbe kommt als Argument: das DOM übergibt "currentColor", Satori einen
 * festen Hex (es liest keine CSS-Variablen).
 */

/** Die drei Phasen der Referenzfigur, überlagert wie eine Chronofotografie:
 *  versetzt um je 3,5 Einheiten, Opazität 24 / 40 / 100 % (Handoff-Regel 7). */
const SPUR = [
  { transform: "translate(4, 8) scale(0.66)", opacity: 0.24 },
  { transform: "translate(7.5, 8) scale(0.66)", opacity: 0.4 },
  { transform: "translate(11, 8) scale(0.66)", opacity: 1 },
] as const;

/** Polyline als Pfad — `d` statt `points`, siehe Satori-Hinweis oben. */
function pfad(pts: readonly Punkt[]): string {
  return pts.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x} ${y}`).join(" ");
}

/** Eine Phase als Liste von SVG-Elementen (Stroke/Caps setzt das <g> außen). */
function primitive(p: PhasenPrimitive, key: number, color: string) {
  switch (p.t) {
    case "torso":
      return (
        <line key={key} x1={p.a[0]} y1={p.a[1]} x2={p.b[0]} y2={p.b[1]} strokeWidth={9} />
      );
    case "limb":
      return <path key={key} d={pfad(p.pts)} strokeWidth={5} />;
    case "head":
      return <circle key={key} cx={p.c[0]} cy={p.c[1]} r={3.5} fill={color} stroke="none" />;
    case "bar":
      return (
        <g key={key}>
          <line x1={p.a[0]} y1={p.a[1]} x2={p.b[0]} y2={p.b[1]} strokeWidth={2} />
          <circle cx={p.a[0]} cy={p.a[1]} r={2.5} fill={color} stroke="none" />
          <circle cx={p.b[0]} cy={p.b[1]} r={2.5} fill={color} stroke="none" />
        </g>
      );
    case "strich":
      return (
        <line key={key} x1={p.a[0]} y1={p.a[1]} x2={p.b[0]} y2={p.b[1]} strokeWidth={p.w ?? 2} />
      );
    case "scheibe":
      return (
        <circle key={key} cx={p.c[0]} cy={p.c[1]} r={p.r ?? 2.5} fill={color} stroke="none" />
      );
  }
}

/** EINE Phase der Referenzfigur (0 = Stand, 2 = Endphase) — die Marke.
 *  Transform UND Opazität sitzen auf demselben <g>: eine Ebene, wie sie das
 *  bestehende Icon schon nachweislich durch Satori bringt. */
export function phaseArt(
  index: number,
  color: string,
  opts: { transform?: string; opacity?: number; key?: number } = {},
) {
  const prims = FIGUR_KNIEBEUGE.phases[index] ?? FIGUR_KNIEBEUGE.phases[0];
  return (
    <g
      key={opts.key}
      transform={opts.transform}
      opacity={opts.opacity}
      stroke={color}
      fill="none"
      strokeWidth={5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {prims.map((p, i) => primitive(p, i, color))}
    </g>
  );
}

/** Alle drei Phasen als Marey-Spur — das App-Icon, viewBox „0 0 48 48". */
export function mareyArt(color: string) {
  return SPUR.map((s, i) =>
    phaseArt(i, color, { transform: s.transform, opacity: s.opacity, key: i }),
  );
}
