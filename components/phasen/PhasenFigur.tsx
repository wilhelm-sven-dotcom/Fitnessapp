"use client";

import { useReducedMotion } from "framer-motion";
import type { PhasenFigurDef, PhasenPrimitive, Punkt } from "@/lib/phasen/figuren";

/**
 * Renderer der Phasenfiguren — drei Betriebsarten des Apparats:
 * · freeze: EIN Standbild (Default: Endphase — Regel 9, erledigte Kader)
 * · zoetrop: 3 gestapelte Phasen blinken hart via CSS-Klassen zp1-3
 *   (globals.css, 8 B/s, Folge 1-2-3-2 — kein JS-Timer); Gate: `zoetropOn`
 *   (Setting) UND prefers-reduced-motion ⇒ sonst Freeze auf der Endphase
 * · marey: Chronofotografie — Nachbilder versetzt (10 Einheiten) in
 *   0,22/0,4, aktive Phase voll in `color` (Referenz: Heute.dc, Marey-Karte)
 * Eine Farbe je Figur (Regel 6): `color` — Tinte oder Siegellack/Messing.
 */

const RASTER_48 =
  "M8 0V48M16 0V48M24 0V48M32 0V48M40 0V48M0 8H48M0 16H48M0 24H48M0 32H48M0 40H48";
const RASTER_88 =
  "M8 0V48M16 0V48M24 0V48M32 0V48M40 0V48M48 0V48M56 0V48M64 0V48M72 0V48M80 0V48M0 8H88M0 16H88M0 24H88M0 32H88M0 40H88";

function pts(list: readonly Punkt[]): string {
  return list.map(([x, y]) => `${x},${y}`).join(" ");
}

function Primitive({ p }: { p: PhasenPrimitive }) {
  switch (p.t) {
    case "torso":
      return (
        <line x1={p.a[0]} y1={p.a[1]} x2={p.b[0]} y2={p.b[1]} strokeWidth={9} />
      );
    case "limb":
      return <polyline points={pts(p.pts)} strokeWidth={5} />;
    case "head":
      return <circle cx={p.c[0]} cy={p.c[1]} r={3.5} fill="currentColor" stroke="none" />;
    case "bar":
      return (
        <>
          <line x1={p.a[0]} y1={p.a[1]} x2={p.b[0]} y2={p.b[1]} strokeWidth={2} />
          <circle cx={p.a[0]} cy={p.a[1]} r={2.5} fill="currentColor" stroke="none" />
          <circle cx={p.b[0]} cy={p.b[1]} r={2.5} fill="currentColor" stroke="none" />
        </>
      );
    case "strich":
      return (
        <line x1={p.a[0]} y1={p.a[1]} x2={p.b[0]} y2={p.b[1]} strokeWidth={p.w ?? 2} />
      );
    case "scheibe":
      return <circle cx={p.c[0]} cy={p.c[1]} r={p.r ?? 2.5} fill="currentColor" stroke="none" />;
  }
}

function Phase({ prims }: { prims: readonly PhasenPrimitive[] }) {
  return (
    <g stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round">
      {prims.map((p, i) => (
        <Primitive key={i} p={p} />
      ))}
    </g>
  );
}

/** Bei >3 Phasen nimmt das Zoetrop erste/mittlere/letzte. */
function dreiPhasen(figur: PhasenFigurDef): readonly (readonly PhasenPrimitive[])[] {
  const n = figur.phases.length;
  if (n <= 3) return figur.phases;
  return [figur.phases[0], figur.phases[Math.floor((n - 1) / 2)], figur.phases[n - 1]];
}

export function PhasenFigur({
  figur,
  mode = "freeze",
  color = "var(--fg)",
  raster = false,
  freezeIndex,
  zoetropOn = true,
  unten = false,
  buehne = false,
  className,
}: {
  figur: PhasenFigurDef;
  mode?: "freeze" | "zoetrop" | "marey";
  /** DIE eine Farbe der Figur (Regel 6). */
  color?: string;
  /** Fadenraster (0,5 px alle 8 Einheiten) in --line-card hinterlegen. */
  raster?: boolean;
  /** freeze: Phasen-Index (Default letzte = Endphase). */
  freezeIndex?: number;
  /** Zoetrop-Gate (settings.zoetrope) — false ⇒ Freeze auf Endphase. */
  zoetropOn?: boolean;
  /** Im Kader: Figur steht auf der Unterkante (xMidYMax), füllt die Box. */
  unten?: boolean;
  /** Bühne des Fokus-Modus: 88×48-Raster, Figur bei x=20 (Fokus.dc). */
  buehne?: boolean;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const laufend = mode === "zoetrop" && zoetropOn && !reduce;
  const marey = mode === "marey";
  const phasen = dreiPhasen(figur);
  const svgProps = {
    className,
    preserveAspectRatio: unten ? ("xMidYMax meet" as const) : undefined,
    style: unten
      ? ({ display: "block", width: "100%", height: "100%" } as const)
      : ({ display: "block", width: "100%" } as const),
  };

  // Marey/Bühne brauchen die breite Bühne (88er-Raster).
  const vb = marey || buehne ? "0 0 88 48" : figur.vb ?? "0 0 48 48";
  const versatz = buehne ? "translate(20 0)" : undefined;

  if (marey) {
    const aktiv = phasen.length - 1;
    return (
      <svg viewBox={vb} {...svgProps} aria-hidden="true">
        {raster && <path d={RASTER_88} stroke="var(--line-card)" strokeWidth={0.4} fill="none" />}
        {phasen.map((prims, i) => (
          <g
            key={i}
            style={{ color: i === aktiv ? color : "var(--fg)" }}
            opacity={i === aktiv ? 1 : 0.22 + i * 0.18}
            transform={`translate(${9 + i * 10} 0)`}
          >
            <Phase prims={prims} />
          </g>
        ))}
      </svg>
    );
  }

  if (laufend) {
    const klassen = ["zp1", "zp2", "zp3"];
    return (
      <svg viewBox={vb} {...svgProps} style={{ ...svgProps.style, color }} aria-hidden="true">
        {raster && (
          <path
            d={buehne ? RASTER_88 : RASTER_48}
            stroke="var(--line-card)"
            strokeWidth={buehne ? 0.4 : 0.5}
            fill="none"
          />
        )}
        {phasen.map((prims, i) => (
          <g key={i} className={klassen[i] ?? "zp3"} transform={versatz}>
            <Phase prims={prims} />
          </g>
        ))}
      </svg>
    );
  }

  // Freeze: Endphase (Regel 9), außer freezeIndex sagt etwas anderes.
  const idx = Math.min(freezeIndex ?? figur.phases.length - 1, figur.phases.length - 1);
  return (
    <svg viewBox={vb} {...svgProps} style={{ ...svgProps.style, color }} aria-hidden="true">
      {raster && (
        <path
          d={buehne ? RASTER_88 : RASTER_48}
          stroke="var(--line-card)"
          strokeWidth={buehne ? 0.4 : 0.5}
          fill="none"
        />
      )}
      <g transform={versatz}>
        <Phase prims={figur.phases[idx]} />
      </g>
    </svg>
  );
}
