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
 * · Der Splash liegt IMMER im Dunkel, unabhängig vom App-Modus.
 * · Nur transform und opacity; Kurven TRANSPORT ein (.55,0,1,1) / aus
 *   (.45,0,1,1), step-end für das Einrasten.
 * · Basiszustand = ENDBILD, alle Animationen additiv: bei
 *   prefers-reduced-motion bleibt nach dem Abschalten ein Standbild übrig.
 * · Ohne data-splash auf <html> bleibt alles unsichtbar (Fail-Safe).
 *
 * Ablauf (ab Einfügen): 80–280 ms Stange · 280 ms Verschluss · ab 300 ms
 * die vier Scheiben im 90-ms-Takt (je 220 ms mit Raste) · 760–920 ms
 * Wortmarke. Fertig bei ~920 ms; SplashGate hält bis MIN_MS.
 */
import { GRUND_DUNKEL, NEBEN_DUNKEL, TINTE_DUNKEL } from "@/lib/grundfarben";

export const SPLASH_CSS = `
#splash{display:none;position:fixed;inset:0;z-index:100;background:${GRUND_DUNKEL};color:${TINTE_DUNKEL};
  font-family:var(--font-body),system-ui,sans-serif}
html[data-splash="v1"] #splash,html[data-splash="v2"] #splash,html[data-splash="v3"] #splash{display:block}
html[data-splash="weg"] #splash{display:none}

/* Das Zeichen steht genau in der Mitte — wie im iOS-Startbild davor (dort
   0,45 der Breite), damit es an der Naht nicht springt. Die Wortmarke hängt
   darunter, ohne die Mitte zu verschieben. */
.sp-buehne{position:absolute;inset:0}
.sp-marke{position:absolute;left:50%;top:50%;display:block;width:45vw;max-width:220px;height:auto;
  aspect-ratio:1;transform:translate(-50%,-50%);overflow:visible}

.sp-stange{transform-box:fill-box;transform-origin:left center;
  animation:sp-stange 200ms cubic-bezier(.55,0,1,1) 80ms both}
@keyframes sp-stange{0%{transform:scaleX(0)}100%{transform:scaleX(1)}}
.sp-verschluss{animation:sp-auf 1ms steps(1,end) 280ms both}
.sp-scheibe{animation:sp-scheibe 220ms both}
.sp-scheibe[data-i="0"]{animation-delay:300ms}
.sp-scheibe[data-i="1"]{animation-delay:390ms}
.sp-scheibe[data-i="2"]{animation-delay:480ms}
.sp-scheibe[data-i="3"]{animation-delay:570ms}
@keyframes sp-scheibe{
  0%{opacity:0;transform:translateX(14px);animation-timing-function:cubic-bezier(.55,0,1,1)}
  1%{opacity:1}
  82%{opacity:1;transform:translateX(-1px);animation-timing-function:step-end}
  100%{opacity:1;transform:translateX(0)}}

.sp-wort{position:absolute;left:0;right:0;top:calc(50% + min(22.5vw,110px) + 20px);text-align:center;
  animation:sp-auf 1ms steps(1,end) 760ms both,sp-ruck 160ms cubic-bezier(.55,0,1,1) 760ms both}
.sp-kicker{font-size:11px;font-weight:600;letter-spacing:.24em;text-transform:uppercase;color:${NEBEN_DUNKEL}}
.sp-titel{margin-top:6px;font-family:var(--font-display),system-ui,sans-serif;font-stretch:125%;font-weight:800;
  font-size:34px;line-height:1.1;color:${TINTE_DUNKEL}}
@keyframes sp-auf{0%{opacity:0}100%{opacity:1}}
@keyframes sp-ruck{0%{transform:translateY(16px)}100%{transform:translateY(0)}}

/* Abgang: der Screen ruckt 24 px weg; danach setzt SplashGate data-splash="weg". */
html[data-splash="ab"] #splash{display:block;animation:sp-ab 180ms cubic-bezier(.45,0,1,1) forwards}
@keyframes sp-ab{100%{transform:translateY(-24px)}}

/* Reduzierte Bewegung: EIN Standbild — die Basiszustände sind das Endbild. */
@media (prefers-reduced-motion:reduce){
  #splash *,html[data-splash="ab"] #splash{animation:none!important}
}
`;
