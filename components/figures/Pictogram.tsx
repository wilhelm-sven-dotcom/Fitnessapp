import type { PictogramPose } from "@/lib/etappen";

/**
 * Piktogramm-Bühne — Marken-Silhouetten im Geist von Otl Aichers ’72er
 * Piktogrammen: strikte Diagonal-Geometrie, Kreiskopf mit Luft zum Körper,
 * EINE Tinte (currentColor), kein Gerät, kein Boden, keine Animation.
 * BEWUSST keine Übungsanleitung (die Ausführungsfiguren sind Geschichte) —
 * das hier ist Grafik. Nie neben Übungsnamen oder im Guide einsetzen.
 */

interface PoseDef {
  head: [number, number];
  /** Torso-Pfad (dickster Strich). */
  torso: string;
  /** Gliedmaßen-Pfade. */
  limbs: string[];
}

const POSES: Record<PictogramPose, PoseDef> = {
  // Dynamischer Lauf-/Ausfall-Moment — reine Diagonale.
  ganzkoerper: {
    head: [60, 13],
    torso: "M 55 26 L 44 52",
    limbs: [
      "M 53 31 L 70 42", // vorderer Arm
      "M 51 34 L 33 39", // hinterer Arm
      "M 44 52 L 63 61 L 58 82", // vorderes Bein (Kniehub)
      "M 44 52 L 27 70", // hinteres Bein gestreckt
    ],
  },
  // Tiefe Hocke als geometrisches Zickzack.
  unterkoerper: {
    head: [41, 17],
    torso: "M 44 30 L 39 51",
    limbs: [
      "M 43 34 L 66 30", // Arme waagerecht nach vorn
      "M 39 51 L 61 57 L 52 79", // Bein-Zickzack
    ],
  },
  // Diagonal-Stoß beider Arme nach schräg oben — bewusst kein Lehrbuch-Press.
  push: {
    head: [40, 13],
    torso: "M 45 26 L 39 54",
    limbs: [
      "M 47 30 L 71 15", // oberer Stoß-Arm
      "M 45 37 L 69 25", // unterer Stoß-Arm
      "M 39 54 L 45 78", // Standbein
      "M 39 54 L 25 72", // hinteres Bein
    ],
  },
  // Kletter-/Zug-Diagonale — Hände oben, Körper hängt.
  pull: {
    head: [50, 24],
    torso: "M 52 36 L 46 60",
    limbs: [
      "M 49 33 L 37 12", // Zug-Arm links hoch
      "M 55 32 L 67 11", // Zug-Arm rechts hoch
      "M 46 60 L 61 67 L 55 84", // angezogenes Bein
      "M 46 60 L 33 74", // freies Bein
    ],
  },
  // Brett-Silhouette — die horizontale Mitte.
  core: {
    head: [14, 42],
    torso: "M 27 48 L 56 54",
    limbs: [
      "M 56 54 L 82 60", // Beine in der Brettlinie
      "M 29 50 L 27 70", // Stütz-Arm
    ],
  },
};

export function Pictogram({
  pose,
  size = 96,
  className,
}: {
  pose: PictogramPose;
  size?: number;
  className?: string;
}) {
  const p = POSES[pose];
  return (
    <svg
      viewBox="0 0 96 96"
      width={size}
      height={size}
      aria-hidden="true"
      className={className}
    >
      <circle cx={p.head[0]} cy={p.head[1]} r="8.5" fill="currentColor" />
      <path
        d={p.torso}
        fill="none"
        stroke="currentColor"
        strokeWidth="12"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {p.limbs.map((d, i) => (
        <path
          key={i}
          d={d}
          fill="none"
          stroke="currentColor"
          strokeWidth="8.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
    </svg>
  );
}
