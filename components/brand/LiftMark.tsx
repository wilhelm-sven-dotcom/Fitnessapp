import { phaseArt } from "@/lib/phasen/figur-art";

/**
 * Die Marke des Labors: die Endphase der Referenzfigur — dieselbe Silhouette,
 * die im App-Icon die volle Spur anführt (Icon I1, `lib/icon-art.tsx`).
 * Zeichnet in `currentColor`, trägt also überall die Tinte ihres Kontexts.
 *
 * Bewusst NUR die Endphase statt der dreifachen Spur: im Kopf der App steht
 * sie bei 17 px, dort würden die Ghosts zu Grieß. Die volle Spur zeigt
 * `MareySpur` (Onboarding-Platte, große Flächen).
 *
 * Die viewBox schneidet die Phase eng zu (Bounding-Box inklusive
 * Strichstärken: x 11,5–40,5 · y 12,5–46,5), damit die Figur ein
 * quadratisches Feld füllt statt in einer Ecke zu sitzen.
 */
export function LiftMark({
  size = 24,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="8 11 36 36"
      className={className}
      style={{ display: "block" }}
      aria-hidden="true"
    >
      {phaseArt(2, "currentColor")}
    </svg>
  );
}
