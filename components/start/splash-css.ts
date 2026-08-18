/**
 * Das CSS des Startbilds — bewusst NICHT in globals.css, sondern als
 * kritisches Inline-Stylesheet direkt vor dem Markup (siehe Splash.tsx).
 *
 * Grund: Der Splash existiert, um genau die Lücke zu decken, in der noch
 * nichts geladen ist. Messung am gebauten Server: beim ersten Paint war die
 * externe Stylesheet-Datei noch nicht wirksam — das Markup aller drei
 * Varianten stand ungestylt untereinander im Bild. Ein Overlay, das den
 * ersten Frame trägt, darf auf keine zweite Datei warten.
 *
 * Deshalb hier auch eigene Zoetrop-Keyframes statt der globalen zp1-3: Die
 * Werte sind identisch (8 B/s, Folge 1-2-3-2), aber globals.css ist in
 * diesem Moment eben noch nicht da. Ändert sich der Takt, muss er hier UND
 * in globals.css nachgezogen werden.
 *
 * Grundsätze, die jede Regel befolgt:
 * · Der Splash liegt IMMER im Atelier (Kollodium), unabhängig vom App-Modus.
 * · Nur transform und opacity — plus `color` beim Invertieren der Silhouette.
 * · Kurven ausschließlich TRANSPORT ein (.55,0,1,1) / aus (.45,0,1,1),
 *   steps(1,end) für Blitze, step-end für Rasten. Kein Fade, kein Ease.
 * · Basiszustand = ENDBILD, alle Animationen additiv: so bleibt bei
 *   prefers-reduced-motion nach dem Abschalten ein sauberes Standbild übrig.
 * · Ohne data-splash auf <html> bleibt alles unsichtbar (Fail-Safe).
 */
export const SPLASH_CSS = `
#splash{display:none;position:fixed;inset:0;z-index:100;background:#141210;color:#e9e1ce;
  font-family:var(--font-plexmono),ui-monospace,monospace;font-variant-numeric:tabular-nums}
html[data-splash="v1"] #splash,html[data-splash="v2"] #splash,html[data-splash="v3"] #splash{display:block}
html[data-splash="weg"] #splash{display:none}

.sp-buehne{display:none;position:absolute;inset:0;flex-direction:column;align-items:center;
  justify-content:center;padding-top:env(safe-area-inset-top);padding-bottom:env(safe-area-inset-bottom)}
html[data-splash="v1"] .sp-buehne[data-v="1"],
html[data-splash="v2"] .sp-buehne[data-v="2"],
html[data-splash="v3"] .sp-buehne[data-v="3"]{display:flex}

.sp-wort{text-align:center}
.sp-kicker{font-size:10px;font-weight:600;letter-spacing:.32em;text-transform:uppercase;color:#57503f}
.sp-titel{margin-top:6px;font-family:var(--font-oldstandard),Georgia,serif;font-style:italic;
  font-size:34px;line-height:1.1;color:#e9e1ce}
@keyframes sp-auf{0%{opacity:0}100%{opacity:1}}
@keyframes sp-ruck{0%{transform:translateY(24px)}100%{transform:translateY(0)}}

/* V1 „Belichtung": Standbild → Blitz → Füllung mit Raste → Silhouette
   invertiert → Wortmarke; Halte-Loop sind drei Belichtungsstriche. */
.sp1-tafel{display:block;width:190px}
.sp1-fuell{transform-box:fill-box;transform-origin:center bottom;animation:sp1-fuell 240ms 180ms both}
@keyframes sp1-fuell{
  0%{transform:scaleY(0);animation-timing-function:cubic-bezier(.55,0,1,1)}
  82%{transform:scaleY(1.07);animation-timing-function:step-end}
  100%{transform:scaleY(1)}}
.sp1-figur{color:#141210;animation:sp1-invert 1ms steps(1,end) 300ms both}
@keyframes sp1-invert{0%{color:#e9e1ce}100%{color:#141210}}
.sp1-blitz{opacity:0;animation:sp1-blitz 60ms steps(1,end) 120ms}
@keyframes sp1-blitz{0%{opacity:1}100%{opacity:0}}
.sp-buehne[data-v="1"] .sp-wort{margin-top:30px;
  animation:sp-auf 1ms steps(1,end) 440ms both,sp-ruck 160ms cubic-bezier(.55,0,1,1) 440ms both}
.sp1-striche{display:flex;gap:6px;margin-top:36px}
.sp1-striche i{width:18px;height:4px;background:#e9e1ce;opacity:.24;animation:sp-blink 1s step-end infinite}
.sp1-striche i:nth-child(2){animation-delay:.33s}
.sp1-striche i:nth-child(3){animation-delay:.66s}
@keyframes sp-blink{0%,49%{opacity:.35}50%,100%{opacity:.14}}

/* V2 „Zoetrop": das Messraster zeichnet sich strichweise (12 × 40 ms),
   dann dreht die Trommel an — 8 B/s über den Marey-Nachbildern. */
.sp2-tafel{display:block;width:230px}
.sp2-faden{animation:sp-auf 1ms steps(1,end) both}
.sp2-faden[data-i="0"]{animation-delay:0ms}
.sp2-faden[data-i="1"]{animation-delay:40ms}
.sp2-faden[data-i="2"]{animation-delay:80ms}
.sp2-faden[data-i="3"]{animation-delay:120ms}
.sp2-faden[data-i="4"]{animation-delay:160ms}
.sp2-faden[data-i="5"]{animation-delay:200ms}
.sp2-faden[data-i="6"]{animation-delay:240ms}
.sp2-faden[data-i="7"]{animation-delay:280ms}
.sp2-faden[data-i="8"]{animation-delay:320ms}
.sp2-faden[data-i="9"]{animation-delay:360ms}
.sp2-faden[data-i="10"]{animation-delay:400ms}
.sp2-faden[data-i="11"]{animation-delay:440ms}
.sp2-ghost-1{opacity:.24;animation:sp2-g1 1ms steps(1,end) 440ms both}
.sp2-ghost-2{opacity:.4;animation:sp2-g2 1ms steps(1,end) 440ms both}
@keyframes sp2-g1{0%{opacity:0}100%{opacity:.24}}
@keyframes sp2-g2{0%{opacity:0}100%{opacity:.4}}
.sp2-zp1{opacity:0;animation:sp-zp1 .5s step-end 440ms infinite both}
.sp2-zp2{opacity:0;animation:sp-zp2 .5s step-end 440ms infinite both}
.sp2-zp3{opacity:1;animation:sp-zp3 .5s step-end 440ms infinite both}
@keyframes sp-zp1{0%,24%{opacity:1}25%,100%{opacity:0}}
@keyframes sp-zp2{0%,24%{opacity:0}25%,49%{opacity:1}50%,74%{opacity:0}75%,100%{opacity:1}}
@keyframes sp-zp3{0%,49%{opacity:0}50%,74%{opacity:1}75%,100%{opacity:0}}
.sp-buehne[data-v="2"] .sp-wort{margin-top:26px;
  animation:sp-auf 1ms steps(1,end) 520ms both,sp-ruck 160ms cubic-bezier(.55,0,1,1) 520ms both}

/* V3 „Walze": drei Ziffernwalzen laufen je 300 ms durch vier Ziffern und
   rasten mit 6 px Überschuss auf 3 · 1 · 1; darunter zieht die Messlinie. */
.sp3-kicker{font-size:10px;font-weight:600;letter-spacing:.32em;text-transform:uppercase;color:#57503f}
.sp3-walzen{display:flex;gap:8px;margin-top:14px}
.sp3-fenster{width:66px;height:110px;overflow:hidden}
.sp3-walze{display:flex;flex-direction:column;transform:translateY(-330px);animation:sp3-walze 300ms both}
.sp3-walze[data-w="1"]{animation-delay:90ms}
.sp3-walze[data-w="2"]{animation-delay:180ms}
.sp3-walze span{font-size:92px;font-weight:700;line-height:110px;text-align:center;color:#e9e1ce}
@keyframes sp3-walze{
  0%{transform:translateY(0);animation-timing-function:cubic-bezier(.55,0,1,1)}
  82%{transform:translateY(-336px);animation-timing-function:step-end}
  100%{transform:translateY(-330px)}}
.sp3-linie{width:214px;height:2px;margin-top:10px;background:#e9e1ce;transform-origin:left center;
  animation:sp3-linie 160ms cubic-bezier(.55,0,1,1) both}
@keyframes sp3-linie{0%{transform:scaleX(0)}100%{transform:scaleX(1)}}
.sp-buehne[data-v="3"] .sp-wort{margin-top:26px;animation:sp-auf 1ms steps(1,end) 500ms both}
.sp-buehne[data-v="3"] .sp-titel{font-size:26px}
.sp3-punkt{width:8px;height:8px;margin-top:32px;background:#e9e1ce;opacity:.24;
  animation:sp-blink 1s step-end .7s infinite}

/* Abgang: der Screen ruckt 24 px weg, bei V3 drehen die Walzen zusätzlich
   aus dem Bild. Danach setzt SplashGate data-splash="weg". */
html[data-splash="ab"] #splash{display:block;animation:sp-ab 180ms cubic-bezier(.45,0,1,1) forwards}
html[data-splash="ab"] .sp-buehne[data-v="1"],
html[data-splash="ab"] .sp-buehne[data-v="2"],
html[data-splash="ab"] .sp-buehne[data-v="3"]{display:flex}
@keyframes sp-ab{100%{transform:translateY(-24px)}}
html[data-splash="ab"] .sp3-walze{animation:sp3-aus 160ms cubic-bezier(.45,0,1,1) forwards}
html[data-splash="ab"] .sp3-walze[data-w="1"]{animation-delay:20ms}
html[data-splash="ab"] .sp3-walze[data-w="2"]{animation-delay:40ms}
@keyframes sp3-aus{0%{transform:translateY(-330px)}100%{transform:translateY(-660px)}}

/* Reduzierte Bewegung: EIN Standbild, null Bewegung. Die Basiszustände sind
   bereits das Endbild, deshalb genügt das Abschalten. */
@media (prefers-reduced-motion:reduce){
  #splash *,html[data-splash="ab"] #splash{animation:none!important}
  .sp1-striche i,.sp3-punkt{opacity:.24}
}
`;
