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

/**
 * Die drei Phasen der Referenzfigur, überlagert wie eine Chronofotografie.
 *
 * Die Maße weichen bewusst vom Handoff ab (dort: scale .66, Versatz 3,5,
 * Opazität 24/40/100, Hantel in jeder Phase). Nachgerechnet und gerendert
 * hält diese Vorgabe ihr eigenes Versprechen nicht: bei Versatz 3,5 auf
 * scale .66 überlappen die Torso-Kapseln (Stroke 9 → 5,9) so weit, dass die
 * drei Phasen zu EINEM Klumpen verschmelzen — bei 32 px liest gar nichts
 * mehr, und die Bounding-Box ragt mit Halbdiagonale 19,8 aus dem
 * Maskable-Sicherheitskreis (r 19,2) heraus. Drei Punkte lösen das:
 *
 *  · Versatz 8,3 statt 3,5 — die Körper stehen frei nebeneinander, wie auf
 *    einer echten Marey-Platte.
 *  · scale 0,57 statt 0,66 — schafft den Platz dafür.
 *  · Die Hantel trägt nur noch die Endphase. Sie ist mit 24 Einheiten das
 *    breiteste Element; dreifach überlagert zieht sie Querbalken durchs
 *    ganze Bild und ist der Hauptgrund fürs Verschmelzen.
 *
 * Damit hält die Zeichnung die Handoff-Absicht („bei 16 px liest die volle
 * Endphase, die Ghosts werden Textur") statt nur ihre Zahlen.
 *
 * Herleitung der Verschiebung — gerechnet mit der ECHTEN Tinte je Phase, denn
 * die Ghosts haben keine Hantel mehr und sind dadurch schmaler:
 *   p0/p1 ohne Gerät x 19,5–32,5 bzw. 15,5–33,5 · p2 mit Hantel x 11,5–40,5
 *   y für alle 3,5 … 46,5
 *   ty  = 24 − 25·s                        (y-Mitte von 3,5/46,5)
 *   tx₀ = 24 − (19,5·s + 2·d + 40,5·s) / 2 (x-Mitte: linkes p0, rechtes p2)
 * Ergibt eine Tintenfläche 28,6 × 24,5 mittig auf 24/24 — Halbdiagonale
 * 18,8, also komplett im Maskable-Sicherheitskreis (r 19,2). Das negative
 * tx₀ ist kein Vertipper, sondern genau diese Rechnung.
 */
const SPUR = [
  { transform: "translate(-1.4, 9.75) scale(0.57)", opacity: 0.18, ohneGeraet: true },
  { transform: "translate(6.9, 9.75) scale(0.57)", opacity: 0.33, ohneGeraet: true },
  { transform: "translate(15.2, 9.75) scale(0.57)", opacity: 1, ohneGeraet: false },
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

/** Gerät, nicht Körper — fällt in den Ghosts der Spur weg (siehe SPUR). */
const GERAET = new Set<PhasenPrimitive["t"]>(["bar", "strich", "scheibe"]);

/** EINE Phase der Referenzfigur (0 = Stand, 2 = Endphase) — die Marke.
 *  Transform UND Opazität sitzen auf demselben <g>: eine Ebene, wie sie das
 *  bestehende Icon schon nachweislich durch Satori bringt. */
export function phaseArt(
  index: number,
  color: string,
  opts: { transform?: string; opacity?: number; key?: number; ohneGeraet?: boolean } = {},
) {
  const alle = FIGUR_KNIEBEUGE.phases[index] ?? FIGUR_KNIEBEUGE.phases[0];
  const prims = opts.ohneGeraet ? alle.filter((p) => !GERAET.has(p.t)) : alle;
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
    phaseArt(i, color, {
      transform: s.transform,
      opacity: s.opacity,
      ohneGeraet: s.ohneGeraet,
      key: i,
    }),
  );
}
