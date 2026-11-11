import { ImageResponse } from "next/og";
import { MARKE_VIEWBOX, markeArt } from "@/lib/marke-art";
import { MARKE } from "@/lib/grundfarben";

/**
 * Der OS-Splash für iOS im Standalone-Modus. Android und Chrome bauen ihn
 * aus dem Manifest (background_color + Icon); Safari kennt das nicht und
 * zeigt ohne `apple-touch-startup-image` einen WEISSEN Frame — ausgerechnet
 * vor einem Startbild, dessen ganzer Witz die unsichtbare Naht ist.
 *
 * Deshalb hier dasselbe Zeichen wie im In-App-Startbild (Sprechblase mit
 * Hantel auf Elektroblau), zentriert und ohne Text (Satori bettet keine
 * Schrift ein). Der In-App-Splash übernimmt danach auf demselben Blau und mit
 * dem Zeichen an derselben Stelle — kein Farbsprung, kein Bruch.
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

export async function GET(_req: Request, { params }: { params: Promise<{ spec: string }> }) {
  const gewuenscht = (await params).spec;
  const spec = MASSE.has(gewuenscht) ? gewuenscht : "1170x2532";
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
          background: MARKE.blau,
        }}
      >
        {/* 0,45 der Breite, genau mittig: wie das Zeichen im In-App-Startbild
            danach (splash-css.ts), damit es an der Naht nicht springt. */}
        <svg width={Math.round(w * 0.45)} height={Math.round(w * 0.45)} viewBox={MARKE_VIEWBOX}>
          {markeArt()}
        </svg>
      </div>
    ),
    { width: w, height: h },
  );
}
