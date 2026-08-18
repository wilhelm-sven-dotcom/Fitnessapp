import { ImageResponse } from "next/og";
import { mareyArt } from "@/lib/phasen/figur-art";

/**
 * Der OS-Splash für iOS im Standalone-Modus. Android und Chrome bauen ihn
 * aus dem Manifest (background_color + Icon); Safari kennt das nicht und
 * zeigt ohne `apple-touch-startup-image` einen WEISSEN Frame — ausgerechnet
 * vor einem Startbild, dessen ganzer Witz die unsichtbare Naht ist.
 *
 * Deshalb hier dasselbe Bild wie das Icon: Marey-Spur in Kreide auf
 * Kollodium, zentriert. Der In-App-Splash übernimmt danach auf demselben
 * Grund — kein Farbsprung, kein Bruch.
 *
 * Die Maße sind eine Whitelist (Gerätepixel = CSS × DPR); Unbekanntes fällt
 * auf das häufigste Format. Die `<link>`-Zeilen dazu stehen als
 * `appleWebApp.startupImage` in app/layout.tsx.
 */

export const runtime = "edge";

const MASSE = new Set([
  "1290x2796", // 14 Pro Max · 15 Plus · 15/16 Pro Max
  "1179x2556", // 14 Pro · 15 · 15/16 Pro
  "1170x2532", // 12 · 13 · 14
  "1125x2436", // 12/13 mini · X · XS · 11 Pro
  "1242x2688", // XS Max · 11 Pro Max
  "828x1792", // XR · 11
  "1242x2208", // 8 Plus
  "750x1334", // SE · 8
]);

export function GET(_req: Request, { params }: { params: { spec: string } }) {
  const spec = MASSE.has(params.spec) ? params.spec : "1170x2532";
  const [w, h] = spec.split("x").map(Number);
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#141210",
        }}
      >
        {/* 0,55 der Breite: die Spur füllt davon rund 60 %, steht also so
            groß im Bild wie die Figur im In-App-Startbild danach. */}
        <svg width={Math.round(w * 0.55)} height={Math.round(w * 0.55)} viewBox="0 0 48 48">
          {mareyArt("#e9e1ce")}
        </svg>
      </div>
    ),
    { width: w, height: h },
  );
}
