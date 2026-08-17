import type { MyologieStufe } from "@/lib/heat";
import type { Muscle } from "@/lib/types";

/**
 * Tafel: Myologie — statische Frontalfiguren VORN/HINTEN nach den
 * Piktogramm-Regeln (48er-Raster, Kapsel-Torso, runde Glieder). Das Skelett
 * steht neutral im Kartenfaden; je Muskelgruppe liegt EIN Segment darüber
 * und trägt seine diskrete Blaustufe (I–IV, untrainiert = Faden).
 * Schema, keine Anatomie.
 */

type Strich = { a: readonly [number, number]; b: readonly [number, number]; w: number };
type Segment = { muscle: Muscle; striche: Strich[]; scheiben?: readonly [number, number][] };

const st = (x1: number, y1: number, x2: number, y2: number, w: number): Strich => ({
  a: [x1, y1],
  b: [x2, y2],
  w,
});

/** Neutral-Skelett (beide Seiten identisch). */
const BASIS: Strich[] = [
  st(24, 16, 24, 31, 9), // Torso-Kapsel
  st(24, 17, 16.5, 19, 5),
  st(16.5, 19, 14.5, 30, 5), // linker Arm
  st(24, 17, 31.5, 19, 5),
  st(31.5, 19, 33.5, 30, 5), // rechter Arm
  st(22, 31, 21, 39, 5.5),
  st(21, 39, 20.5, 45, 5), // linkes Bein
  st(26, 31, 27, 39, 5.5),
  st(27, 39, 27.5, 45, 5), // rechtes Bein
];

const VORN: Segment[] = [
  {
    muscle: "shoulders",
    striche: [st(19.5, 15.5, 17.2, 17.6, 5), st(28.5, 15.5, 30.8, 17.6, 5)],
  },
  { muscle: "chest", striche: [st(21, 19, 27, 19, 5)] },
  { muscle: "core", striche: [st(24, 23.5, 24, 29.5, 6)] },
  {
    muscle: "biceps",
    striche: [st(16.3, 19.5, 15.3, 24, 4.5), st(31.7, 19.5, 32.7, 24, 4.5)],
  },
  {
    muscle: "forearms",
    striche: [st(15, 25.5, 14.4, 29.8, 4), st(33, 25.5, 33.6, 29.8, 4)],
  },
  {
    muscle: "quads",
    striche: [st(21.8, 32.5, 21.1, 39.5, 5.5), st(26.2, 32.5, 26.9, 39.5, 5.5)],
  },
];

const HINTEN: Segment[] = [
  { muscle: "back", striche: [st(24, 17.5, 24, 23.5, 8)] },
  {
    muscle: "triceps",
    striche: [st(16.3, 19.5, 15.3, 24, 4.5), st(31.7, 19.5, 32.7, 24, 4.5)],
  },
  {
    muscle: "glutes",
    striche: [],
    scheiben: [
      [21.9, 31.3],
      [26.1, 31.3],
    ],
  },
  {
    muscle: "hamstrings",
    striche: [st(21.5, 33, 20.9, 40, 5.5), st(26.5, 33, 27.1, 40, 5.5)],
  },
  {
    muscle: "calves",
    striche: [st(20.9, 40.8, 20.5, 45, 4.5), st(27.1, 40.8, 27.5, 45, 4.5)],
  },
];

function stufeVar(n: MyologieStufe): string {
  return n === 0 ? "var(--line-card)" : `var(--stufe-${n})`;
}

export function MyologieFigur({
  seite,
  stufen,
  className,
}: {
  seite: "vorn" | "hinten";
  stufen: Map<Muscle, MyologieStufe>;
  className?: string;
}) {
  const segmente = seite === "vorn" ? VORN : HINTEN;
  return (
    <svg
      viewBox="0 0 48 48"
      className={className}
      style={{ display: "block", width: "100%" }}
      aria-hidden="true"
    >
      <g strokeLinecap="round" strokeLinejoin="round" fill="none">
        <circle cx={24} cy={7} r={3.5} fill="var(--line-card)" />
        {BASIS.map((b, i) => (
          <line
            key={`b${i}`}
            x1={b.a[0]}
            y1={b.a[1]}
            x2={b.b[0]}
            y2={b.b[1]}
            stroke="var(--line-card)"
            strokeWidth={b.w}
          />
        ))}
        {segmente.map((seg) => {
          const farbe = stufeVar(stufen.get(seg.muscle) ?? 0);
          return (
            <g key={seg.muscle}>
              {seg.striche.map((l, i) => (
                <line
                  key={i}
                  x1={l.a[0]}
                  y1={l.a[1]}
                  x2={l.b[0]}
                  y2={l.b[1]}
                  stroke={farbe}
                  strokeWidth={l.w}
                />
              ))}
              {(seg.scheiben ?? []).map(([cx, cy], i) => (
                <circle key={`s${i}`} cx={cx} cy={cy} r={2.8} fill={farbe} />
              ))}
            </g>
          );
        })}
      </g>
    </svg>
  );
}
