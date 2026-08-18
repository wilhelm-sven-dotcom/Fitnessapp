import { SPLASH_CSS } from "@/components/start/splash-css";
import { phaseArt } from "@/lib/phasen/figur-art";

/**
 * Das Startbild „Platte 311" (Design-Nachtrag 2) — drei Choreografien der
 * Bewegungssprache Filmtransport, aus denen das Pre-Paint-Skript in
 * `app/layout.tsx` eine auswürfelt (`html[data-splash="v1|v2|v3"]`).
 *
 * Warum statisches Markup im initialen HTML statt einer React-Komponente:
 * Der Splash soll GENAU die Lücke überbrücken, die React noch nicht sieht —
 * Bundle laden, parsen, hydrieren. Als SSR-Knoten mit reinen CSS-Keyframes
 * läuft er ab dem ersten Paint, ohne dass eine Zeile JavaScript ausgeführt
 * sein muss. Alle drei Varianten stehen im DOM (das Markup ist damit
 * unabhängig vom Würfel identisch, also hydrationssicher); sichtbar macht
 * eine CSS-Regel nur die gewählte. Ohne Attribut bleibt alles unsichtbar —
 * das ist der Fail-Safe, wenn das Skript nicht läuft oder der Athlet das
 * Startbild abgeschaltet hat.
 *
 * Der Abgang gehört `SplashGate`; die gesamte Gestaltung steht als kritisches
 * Inline-Stylesheet in `splash-css.ts` — dort steht auch, warum sie NICHT in
 * globals.css liegen darf.
 *
 * Der Splash liegt IMMER im Atelier (Kollodium #141210), unabhängig vom
 * App-Modus: Platten werden im Dunkeln entwickelt, und das Manifest kennt
 * nur eine background_color — modusgleich gäbe es an der Naht zum
 * OS-Splash zwangsläufig einen Farbsprung.
 */

const KREIDE = "#e9e1ce";

/** V2: das Messraster zeichnet sich strichweise, 12 Fäden à 40 ms. */
const RASTER_LINIEN = [8, 16, 24, 32, 40, 48];

/** V3: die drei Ziffernwalzen rasten auf 3 · 1 · 1 (Index 3 je Walze). */
const WALZEN = [
  ["7", "2", "9", "3", "8", "0"],
  ["4", "8", "0", "1", "5", "2"],
  ["6", "3", "2", "1", "9", "4"],
];

function Wortmarke({ titel }: { titel: string }) {
  return (
    <div className="sp-wort">
      <div className="sp-kicker">Das Bewegungslabor</div>
      <div className="sp-titel">{titel}</div>
    </div>
  );
}

export function Splash() {
  return (
    <>
      {/* Kritisches Inline-Stylesheet — muss VOR dem Markup stehen und darf
          nicht auf globals.css warten (Begründung in splash-css.ts). */}
      <style dangerouslySetInnerHTML={{ __html: SPLASH_CSS }} />
      <div id="splash" aria-hidden="true">
        {/* ── V1 „Belichtung" — der Kader wird belichtet ─────────────────── */}
        <div className="sp-buehne" data-v="1">
          <svg className="sp1-tafel" viewBox="0 0 48 48">
            {/* Kaderrahmen — das Standbild, das den OS-Splash fortsetzt. */}
            <rect
              x="1"
              y="1"
              width="46"
              height="46"
              fill="none"
              stroke={KREIDE}
              strokeWidth={1.4}
            />
            {/* Tintenfüllung steigt mit Überschuss und rastet ein. */}
            <rect
              className="sp1-fuell"
              x="2.4"
              y="2.4"
              width="43.2"
              height="43.2"
              fill={KREIDE}
            />
            {/* Die Silhouette invertiert hart, sobald die Füllung sie erreicht. */}
            <g className="sp1-figur">{phaseArt(2, "currentColor")}</g>
            {/* Der Blitz: EIN Kreide-Frame, kein Fade. */}
            <rect
              className="sp1-blitz"
              x="2.4"
              y="2.4"
              width="43.2"
              height="43.2"
              fill={KREIDE}
            />
          </svg>
          <Wortmarke titel="Platte 311" />
          <div className="sp1-striche">
            <i />
            <i />
            <i />
          </div>
        </div>

        {/* ── V2 „Zoetrop" — Raster zeichnet, dann dreht die Trommel an ──── */}
        <div className="sp-buehne" data-v="2">
          <svg className="sp2-tafel" viewBox="0 0 56 56">
            {RASTER_LINIEN.map((x, i) => (
              <line
                key={`v${x}`}
                className="sp2-faden"
                data-i={i}
                x1={x}
                y1={0}
                x2={x}
                y2={56}
                stroke="#2e2921"
                strokeWidth={0.5}
              />
            ))}
            {RASTER_LINIEN.map((y, i) => (
              <line
                key={`h${y}`}
                className="sp2-faden"
                data-i={i + 6}
                x1={0}
                y1={y}
                x2={56}
                y2={y}
                stroke="#2e2921"
                strokeWidth={0.5}
              />
            ))}
            {/* Marey-Nachbilder: die zwei früheren Phasen, hart eingeblendet. */}
            <g className="sp2-ghost sp2-ghost-2">
              {phaseArt(1, KREIDE, { transform: "translate(-1, 4)" })}
            </g>
            <g className="sp2-ghost sp2-ghost-1">
              {phaseArt(0, KREIDE, { transform: "translate(-6, 4)" })}
            </g>
            {/* Der Halte-Loop: 8 B/s, Folge 1-2-3-2 (Keyframes zp1-3). */}
            <g className="sp2-zp1">
              {phaseArt(0, KREIDE, { transform: "translate(4, 4)" })}
            </g>
            <g className="sp2-zp2">
              {phaseArt(1, KREIDE, { transform: "translate(4, 4)" })}
            </g>
            <g className="sp2-zp3">
              {phaseArt(2, KREIDE, { transform: "translate(4, 4)" })}
            </g>
          </svg>
          <Wortmarke titel="Platte 311" />
        </div>

        {/* ── V3 „Walze" — die Plattennummer rastet auf 311 ──────────────── */}
        <div className="sp-buehne" data-v="3">
          <div className="sp3-kicker">Platte Nr.</div>
          <div className="sp3-walzen">
            {WALZEN.map((ziffern, i) => (
              <div key={i} className="sp3-fenster">
                <div className="sp3-walze" data-w={i}>
                  {ziffern.map((z, k) => (
                    <span key={k}>{z}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="sp3-linie" />
          <Wortmarke titel="Muybridge, fortgesetzt" />
          <div className="sp3-punkt" />
        </div>
      </div>
    </>
  );
}
