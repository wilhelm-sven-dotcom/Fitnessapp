import { SPLASH_CSS } from "@/components/start/splash-css";
import { BLASE_D, MARKE_VIEWBOX, SCHEIBEN_SPOTTER } from "@/lib/marke-art";
import { MARKE, TINTE_HELL } from "@/lib/grundfarben";
import { APP_NAME, CLAIM } from "@/lib/marke";

/**
 * Das Startbild im Look „spotter“: Elektroblau, in der Mitte die Sprechblase
 * mit der Hantel (wie Icon und iOS-Startbild, `lib/marke-art.tsx`), darunter
 * die Wortmarke und der Sticker mit dem Claim („Eine geht noch.“). Die Blase steht von Anfang
 * an da (an der Naht zum iOS-Startbild springt nichts); sie nickt einmal, die
 * Scheiben pumpen, dann kommen Wortmarke und Sticker.
 *
 * Warum statisches Markup im initialen HTML statt einer React-Komponente:
 * Der Splash soll GENAU die Lücke überbrücken, die React noch nicht sieht —
 * Bundle laden, parsen, hydrieren. Als SSR-Knoten mit reinen CSS-Keyframes
 * läuft er ab dem ersten Paint. Sichtbar macht ihn allein `data-splash` auf
 * <html> (Pre-Paint-Skript in `app/layout.tsx`); die gespeicherten Werte
 * v1/v2/v3/zufall zeigen alle diese eine Choreografie, „aus“ zeigt nichts.
 * Ohne Attribut bleibt alles unsichtbar (Fail-Safe).
 *
 * Der Abgang gehört `SplashGate`; die Gestaltung steht als kritisches
 * Inline-Stylesheet in `splash-css.ts` (dort steht, warum nicht in
 * globals.css). Der Splash liegt IMMER auf Blau (Markenfarbe): das Manifest
 * kennt nur eine background_color, an der Naht zum OS-Splash darf nichts
 * springen.
 */
export function Splash() {
  return (
    <>
      {/* Kritisches Inline-Stylesheet — muss VOR dem Markup stehen. */}
      <style dangerouslySetInnerHTML={{ __html: SPLASH_CSS }} />
      <div id="splash" aria-hidden="true">
        <div className="sp-buehne">
          <svg className="sp-marke" viewBox={MARKE_VIEWBOX}>
            <path d={BLASE_D} fill="#ffffff" stroke={TINTE_HELL} strokeWidth={4} strokeLinejoin="round" />
            <path d="M14 29h36" fill="none" stroke={TINTE_HELL} strokeWidth={4} strokeLinecap="round" />
            {SCHEIBEN_SPOTTER.map(([x, y, w, h], i) => (
              <rect
                key={x}
                className="sp-scheibe"
                data-i={i}
                x={x}
                y={y}
                width={w}
                height={h}
                rx={2.5}
                fill={MARKE.blau}
                stroke={TINTE_HELL}
                strokeWidth={3}
              />
            ))}
          </svg>
          <div className="sp-wort">
            <div className="sp-titel">{APP_NAME}</div>
            <div className="sp-sticker">{CLAIM}</div>
          </div>
        </div>
      </div>
    </>
  );
}
