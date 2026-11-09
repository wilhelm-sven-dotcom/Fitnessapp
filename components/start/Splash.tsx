import { SPLASH_CSS } from "@/components/start/splash-css";
import { SCHEIBEN } from "@/lib/marke-art";
import { TINTE_DUNKEL } from "@/lib/grundfarben";

/**
 * Das Startbild im Look „Regionen“: die Stange zieht ein, die vier Scheiben
 * (Rot, Blau, Gelb, Grün — die Regionsfarben) rasten nacheinander auf, dann
 * steht die Wortmarke. Zeichnung wie Icon und iOS-Startbild
 * (`lib/marke-art.tsx`), damit an der Naht nichts springt.
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
 * globals.css). Der Splash liegt IMMER im Dunkel (GRUND_DUNKEL): das
 * Manifest kennt nur eine background_color — modusgleich gäbe es an der
 * Naht zum OS-Splash einen Farbsprung.
 */
export function Splash() {
  return (
    <>
      {/* Kritisches Inline-Stylesheet — muss VOR dem Markup stehen. */}
      <style dangerouslySetInnerHTML={{ __html: SPLASH_CSS }} />
      <div id="splash" aria-hidden="true">
        <div className="sp-buehne">
          <svg className="sp-marke" viewBox="0 0 48 48">
            <g strokeLinecap="round" fill="none">
              <line
                className="sp-stange"
                x1={6.5}
                y1={24}
                x2={41.5}
                y2={24}
                stroke={TINTE_DUNKEL}
                strokeWidth={2.6}
              />
              <line
                className="sp-verschluss"
                x1={13.5}
                y1={18.5}
                x2={13.5}
                y2={29.5}
                stroke={TINTE_DUNKEL}
                strokeWidth={2.6}
              />
              {SCHEIBEN.map(([x, h, w, farbe], i) => (
                <line
                  key={x}
                  className="sp-scheibe"
                  data-i={i}
                  x1={x}
                  y1={24 - h}
                  x2={x}
                  y2={24 + h}
                  stroke={farbe}
                  strokeWidth={w}
                />
              ))}
            </g>
          </svg>
          <div className="sp-wort">
            <div className="sp-kicker">Krafttraining mit ATLAS</div>
            <div className="sp-titel">Platte 311</div>
          </div>
        </div>
      </div>
    </>
  );
}
