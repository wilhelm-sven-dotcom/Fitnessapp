/**
 * Das CSS des Startbilds — bewusst NICHT in globals.css, sondern als
 * kritisches Inline-Stylesheet direkt vor dem Markup (siehe Splash.tsx).
 *
 * Grund: Der Splash existiert, um genau die Lücke zu decken, in der noch
 * nichts geladen ist. Beim ersten Paint ist die externe Stylesheet-Datei noch
 * nicht wirksam — ein Overlay, das den ersten Frame trägt, darf auf keine
 * zweite Datei warten.
 *
 * Grundsätze:
 * · Der Splash liegt IMMER auf Elektroblau, unabhängig vom App-Modus.
 * · Nur transform und opacity.
 * · Basiszustand = ENDBILD, alle Animationen additiv: bei
 *   prefers-reduced-motion bleibt nach dem Abschalten ein Standbild übrig.
 * · Die Blase verschwindet nie (sie steht schon im iOS-Startbild davor).
 * · Ohne data-splash auf <html> bleibt alles unsichtbar (Fail-Safe).
 *
 * Ablauf (ab Einfügen): 80–340 ms die Blase nickt · 160/240 ms die Scheiben
 * pumpen · 320–520 ms Wortmarke · 560–860 ms Sticker springt auf. Fertig bei
 * ~860 ms; SplashGate hält bis MIN_MS.
 */
import { MARKE, TINTE_HELL } from "@/lib/grundfarben";

export const SPLASH_CSS = `
#splash{display:none;position:fixed;inset:0;z-index:100;background:${MARKE.blau};color:#ffffff;
  font-family:var(--font-body),system-ui,sans-serif}
html[data-splash="v1"] #splash,html[data-splash="v2"] #splash,html[data-splash="v3"] #splash{display:block}
html[data-splash="weg"] #splash{display:none}

/* Das Zeichen steht genau in der Mitte — wie im iOS-Startbild davor (dort
   0,45 der Breite), damit es an der Naht nicht springt. Die Wortmarke hängt
   darunter, ohne die Mitte zu verschieben. */
.sp-buehne{position:absolute;inset:0}
.sp-marke{position:absolute;left:50%;top:50%;display:block;width:45vw;max-width:220px;height:auto;
  aspect-ratio:1;transform:translate(-50%,-50%);overflow:visible;
  animation:sp-nick 260ms cubic-bezier(.3,1.5,.6,1) 80ms both}
@keyframes sp-nick{0%{transform:translate(-50%,-50%) scale(1)}45%{transform:translate(-50%,-50%) scale(1.07)}
  100%{transform:translate(-50%,-50%) scale(1)}}
.sp-scheibe{transform-box:fill-box;transform-origin:center;animation:sp-pump 200ms cubic-bezier(.3,1.6,.6,1) both}
.sp-scheibe[data-i="0"]{animation-delay:160ms}
.sp-scheibe[data-i="1"]{animation-delay:240ms}
@keyframes sp-pump{0%{transform:scaleY(1)}50%{transform:scaleY(1.22)}100%{transform:scaleY(1)}}

.sp-wort{position:absolute;left:0;right:0;top:calc(50% + min(18vw,88px) + 18px);display:flex;flex-direction:column;
  align-items:center;gap:14px;text-align:center}
.sp-titel{font-family:var(--font-display),system-ui,sans-serif;font-weight:800;font-size:52px;line-height:1;
  letter-spacing:-.02em;color:#ffffff;animation:sp-auf 200ms cubic-bezier(.2,.8,.3,1) 320ms both}
.sp-sticker{display:inline-block;padding:4px 12px;border:2.5px solid ${TINTE_HELL};border-radius:10px;
  background:${MARKE.sonne};color:${TINTE_HELL};font-family:var(--font-display),system-ui,sans-serif;font-weight:800;
  font-size:17px;line-height:1.3;transform:rotate(-3deg);animation:sp-sticker 300ms cubic-bezier(.3,1.6,.6,1) 560ms both}
@keyframes sp-auf{0%{opacity:0;transform:translateY(16px)}100%{opacity:1;transform:translateY(0)}}
@keyframes sp-sticker{0%{opacity:0;transform:rotate(-14deg) scale(.4)}100%{opacity:1;transform:rotate(-3deg) scale(1)}}

/* Abgang: der Screen ruckt 24 px weg; danach setzt SplashGate data-splash="weg". */
html[data-splash="ab"] #splash{display:block;animation:sp-ab 180ms cubic-bezier(.45,0,1,1) forwards}
@keyframes sp-ab{100%{transform:translateY(-24px)}}

/* Reduzierte Bewegung: EIN Standbild — die Basiszustände sind das Endbild. */
@media (prefers-reduced-motion:reduce){
  #splash *,html[data-splash="ab"] #splash{animation:none!important}
}
`;
