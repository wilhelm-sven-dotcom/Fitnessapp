---
name: ui-style
description: >-
  Verbindliches Design-System dieser Fitness-PWA. MUSS bei JEDER UI-Arbeit
  geladen werden: React/Next.js-Komponenten, Seiten, Tailwind-Klassen, Layouts,
  Farben, Fonts, Buttons, Cards, Inputs, Focus-States, Animationen. EIN Design:
  „Platte 311" — Muybridge-Bewegungslabor: Albumin-Papier hell („Archiv"),
  Kollodium-Dunkelkammer („Atelier", Fokus-Modus immer dunkel), Siegellack-
  Akzent, Cyanotypie & Messing, Old Standard TT (Kursive) + IBM Plex Mono
  (trägt Body), Radius 3/2/1 px, NULL Schatten, Filmtransport-Motion,
  Phasenfiguren & Phasenband, Marey-Spur als Icon, Startbild in drei
  Choreografien; Bediensprache ist schlichtes Alltagsdeutsch.
  Enthält die echten Tokens, Rezepte, Verbote und Smoke-Invarianten.
  Werte hier nachschlagen statt erfinden.
---

# UI-Style — Design-System „Platte 311" (echte Werte aus dem Code)

Stack: **Next.js 14 App Router · React 18 · TypeScript strict · Tailwind 3.4 ·
Framer Motion 11 · lucide-react · `cn()` (clsx + tailwind-merge)**. Mobile-first
PWA, Container `max-w-md`, Touch-/Press-zentriert (kein Hover-First).

## EIN Design: „Platte 311" — das Bewegungslabor

- **These:** 1887 zerlegte Muybridge den Gewichtheber in Einzelbilder; die App
  setzt die Reihe fort — als BILDSPRACHE: Phasenfiguren, Zoetrop, Raster,
  Kollodium und Kreide. Die Metapher steckt im Aussehen, NICHT in den Wörtern:
  die Bedienung sagt Einheit, Satz, Pause, Rekord (siehe „Sprache" unten).
- **Zwei Führungen:** „Archiv" = helles Albumin-Papier (Grundzustand),
  „Atelier" = Kollodium-Dunkelkammer (`data-theme="dark"`). Wahl in
  `settings.theme` (Segment Archiv/Atelier/Auto), Laufzeit `applyTheme`
  (`lib/theme.ts`), No-Flash pre-paint in `app/layout.tsx`.
- **Fokus-Modus IMMER Atelier:** `/workout` erzwingt Dunkel — pre-paint-Zweig
  im Layout-Skript UND `setThemeLock("dark")`-Effekt in `app/workout/page.tsx`
  (Cleanup restauriert). `applyTheme` konsultiert den Lock zuerst.
- **EINE Farbtafel:** Akzent-Override und Icon-Designer sind ENTFERNT. Ein
  Icon (Marey-Spur auf Kollodium, siehe Signatur-Elemente), eine Marke.
- **Immer Tokens nutzen, nie rohe Hex/feste Radien im JSX** (Ausnahmen:
  SVG-Strokes mit `var(--…)`; `global-error.tsx` eigenständig; die
  App-Icon-Replik im Onboarding trägt ihre fixen Icon-Hexes + 18px inline).

## Farben — Token-Tafel (hell „Archiv" / dunkel „Atelier")

| Tailwind             | CSS-Var        | Hell      | Dunkel    | Zweck |
|----------------------|----------------|-----------|-----------|-------|
| `surface-0`          | `--base`       | `#F2ECDD` | `#141210` | Grund: Albumin / Kollodium |
| `surface-1`          | `--card`       | `#FAF6EA` | `#1D1A16` | DIE Karten-/Plattenfläche |
| `surface-2`          | `--surface-2`  | `#E4DBC5` | `#342E24` | eingelassene Flächen |
| `line`               | `--line`       | `#D4C9B0` | `#2E2921` | Hairlines auf dem Grund |
| `line-card`          | `--line-card`  | `#E4DBC5` | `#342E24` | Hairlines/Raster AUF Karten |
| `fg` / `strong`      | `--fg`/`--strong` | `#221C14` | `#E9E1CE` | Tinte (Text, Füllungen) |
| `muted`/`faint`/`accent-2` | `--muted`… | `#C0B396` | `#57503F` | **Schleier** — EINE Sekundärstufe (hell 1,76:1 = bewusster Design-Entscheid, blasse Meta-Schrift) |
| `accent-sessions`    | `--accent`     | `#B23A1E` | `#E06A45` | **Siegellack** — CTAs, aktiver Kader, Live |
| `accent-press`       | `--accent-press` | `#9E3319` | `#C85A38` | Button-Down (8 % dunkler, hart) |
| `on-accent`/`on-color` | `--on-accent` | `#FAF6EA` | `#141210` | Tinte auf Siegellack |
| `cyanotypie`         | `--cyanotypie` | `#1F5C86` | `#6FA7CC` | Hypothesen, Charts, Fokus-Ringe, Register-Aktiv |
| `messing`            | `--messing`    | `#97711F` | `#D4A649` | Maxima/Rekorde, Plattenschilder |
| `stufe-1..4`         | `--stufe-1..4` | `#D8E4EE #A8C4DA #5F93B8 #1F5C86` | `#24313D #33526B #4F7FA3 #6FA7CC` | Myologie-Blaustufen (diskret!) |
| `iwf-rot/blau/gelb/gruen` | `--iwf-*` | `#C1332B #2B6390 #D2A32C #3A7D54` | modusgleich | IWF-Scheibenfarben (Phasenband-Basislinie) |
| `blaupause`/`kreide-blau` | `--blaupause`/`--kreide-blau` | `#1F5C86`/`#F4F9FC` | gleich | Poster-Cyanotypie |

- **Legacy-Aliasse** (Alt-Code läuft weiter): `--orange` & `--gruen` :=
  `var(--cyanotypie)`, `--gelb` := `var(--messing)`, `--rot` & `--live` :=
  `var(--accent)`. Neue Arbeit nutzt die echten Namen.
- `text-accent-ink` = Siegellack als Schriftfarbe (danger-Buttons, aktive Tabs).
- **Radius:** `rounded-card` **3px** · `rounded-pill` **2px** · `rounded-xs`
  **1px**. Nichts anderes. Eckig ist Programm.
- **Schatten: NULL.** `--panel-shadow(-lg)` = none, `.glass` ist opak.
  Trennung leisten Hairlines.

## Typographie (nur ZWEI Familien, via `next/font/google`)

- `font-display` (`--font-oldstandard`): **Old Standard TT** 400/700 +
  *italic*. Titel stehen IMMER in der Kursive (`font-display italic`),
  Buchsatz-Absätze (ATLAS-Protokoll, Briefings) in der Antiqua 15–16px/1.6.
  Nur 400/700 vorhanden — kein font-medium/semibold auf Display.
- `font-mono` = `font-sans` = Body (`--font-plexmono`): **IBM Plex Mono**
  400–700 — DER Werkstoff für Meta, Labels, Zahlen. `tabular-nums` bei Zahlen
  Pflicht. **Mono trägt den Body** — Fließtext ist die Ausnahme (Display).
- **Schriftgrade** (Tailwind fontSize): `text-5xs` 8px · `4xs` 9px · `3xs`
  10px · `2xs` 11px · `titel` 28px · `readout` 44px · `readout-lg` 56px.
- **Sperrung** (letterSpacing): `tracking-gesperrt` .14em · `gesperrt-2`
  .24em · `gesperrt-3` .28em (CTAs) · `gesperrt-4` .32em (große Kicker).
- Versalien via CSS `uppercase` — im DOM Normalschreibung (Screenreader!).
- Kicker-Muster: `font-mono text-3xs font-semibold uppercase tracking-gesperrt-2
  text-muted`; Karten-Titel: `font-display italic text-…`.

## Komponenten-Rezepte (`components/ui/`)

- **Button:** Versal-Mono `tracking-gesperrt-2`, `rounded-pill` (2px).
  `primary` Siegellack-Fläche + `active:bg-accent-press` (hart, kein Fade);
  `secondary` 1px `border-strong`, transparent; `ghost` Text Schleier;
  `danger` 1px Rand + Text `accent-ink` (kein roter Block). Kein Schatten.
- **Card:** `rounded-card border border-line-card bg-surface-1 p-3.5` —
  alle Varianten identisch, kein elevated/glass-Unterschied mehr.
- **Chip:** `rounded-pill border border-line`, `text-3xs uppercase
  tracking-gesperrt`; Ton = Schriftfarbe, aktiv Fläche Tinte/Text Grund.
- **Toggle:** 38×20, `rounded-pill`; Knopf 16px `rounded-xs` (eckig!);
  Wechsel HART ohne Gleiten; an = Siegellack/Knopf on-accent, aus =
  border-line/Knopf Schleier. `role="switch"` bleibt.
- **Input:** `rounded-pill border border-line bg-transparent px-3 …
  focus-visible:ring-2 focus-visible:ring-cyanotypie` (Fokus-Ringe sind
  Cyanotypie, nie Siegellack).
- **Sheet:** oben `rounded-card`, Grabber `h-1 w-9 bg-muted`; Titel
  `font-display italic`; Scrim HART `rgba(34,28,20,.4)` (keine Fade-Kurve);
  Einfahrt = RASTE (s. Motion). A11y/Drag-Verhalten unangetastet.
- **Toast** (`ToastItem`): Fläche Tinte (`bg-strong`), `text-2xs`; Eintritt
  120 ms transform, Abgang HART.
- **Skeleton:** `bg-muted rounded-xs`, Puls = `skel-blink` (1s step-end
  35↔14 %, reduced-motion: statisch 24 %) — kein Framer.
- **Pressable/PressableLink:** whileTap `scale .985` bei Dauer 0 (hart
  runter), Release `FILM.press` mit `TRANSPORT_EIN`; Fokus-Ring Cyanotypie.
- **PageHeader:** Kicker (gesperrt-2, Schleier) über Titel (`italic text-3xl`).
- **Focus/Touch:** `focus-visible:ring-2` (nie bloßes `focus:`), Ziele ≥
  44px (`-m-2 h-11 w-11`-Trick), `aria-pressed` auf Selected-States,
  `disabled:opacity-40/50`.

## Motion — „Filmtransport" (Apparat, kein Easing-Allerlei)

Konstanten in `lib/motion.ts`: `TRANSPORT_EIN` = cubic-bezier(.55,0,1,1),
`TRANSPORT_AUS` = cubic-bezier(.45,0,1,1) — nur `transform`/`opacity`.
`FILM` = { blitz .06, press .08, toast .12, liste .14, screen .16,
sheetZu .18, fuellung .24, sheetAuf .26 } (Sekunden). Sieger-Moment ~900 ms
ist DIE Ausnahme. `SPRING`/`EASE_OUT` sind Alt-Bestand (Welcome-Stagger,
Odometer) — nicht neu verwenden.

| Moment | Verhalten |
|---|---|
| Button-Press | down: hart (0 ms) `scale .985` + `accent-press`; release 80 ms TRANSPORT |
| Screenwechsel | `PageTransition`: 24px-Ruck, 160 ms TRANSPORT_EIN, KEIN Fade des alten Screens |
| Sheet auf | „RASTE": y 103 % → −6px @82 % (step-end) → 0, 260 ms (Framer-Keyframes `times`) |
| Sheet zu / Scrim | 180 ms TRANSPORT_AUS; Scrim erscheint/verschwindet HART |
| Toast | 12px, 120 ms rein; Abgang hart |
| Zahlen (kg, Countdown) | 0 ms — Zahlen springen wie ein Zählwerk |
| Verschlusszeit | 24 Striche fallen HART im Sekundentakt (opacity .14), letzte 3 Siegellack |
| Satz-Commit | BLITZ: 60 ms Kreide-Frame (steps), Füllung 240 ms, Silhouette hart |
| Sieger | Doppelblitz (2 Kreide-Frames, ~80 ms Abstand) + Stagger + Messing-scaleX |
| Skeleton | 1 s step-end 35↔14 % |
| Phasenband | füllt NUR im Commit (`FILM.fuellung`), nie beim Ansehen |
| Zoetrop | `.zp1/.zp2/.zp3` CSS step-end 0.5 s (8 B/s, Phasen 1-2-3-2) |
| Charts | statisch — keine Einzeichnung |

**Reduced motion:** Dauern → 0 (Zustände springen), Zoetrop zeigt die
Hauptphase, Skeleton statisch. `useReducedMotion()` + CSS-Gates vorhanden.
Frequenz-Regel bleibt: was 100×/Tag passiert, bewegt sich minimal.

## Signatur-Elemente

- **Phasenfiguren** (`lib/phasen/figuren.ts` + `components/phasen/PhasenFigur.tsx`):
  typisierte Primitive (torso w9 · limb Polyline w5 · head r3.5 · bar w2 +
  Scheiben r2.5 · strich · scheibe) auf 48er-Raster, Gelenke auf
  8er-Schnittpunkten. 12 `PATTERN_FIGUR` à 3 Phasen + `EXERCISE_FIGUR`-Overrides
  + `figurFor(ex)`. Modi: `freeze` (Endphase), `zoetrop` (CSS zp1-3;
  Doppel-Gate `settings.zoetrope !== false` UND reduced-motion), `marey`
  (Ghost-Phasen 0.22/0.4 versetzt, aktive voll). EINE Farbe (`color`-Prop),
  Outline/Kopf-Ring `var(--card)`, optional `raster` (0.5px line-card alle 8).
  Figuren werden NIE gemorpht — nur Phasen geschaltet. Max 2 Zoetrope
  gleichzeitig (Bühne + aktiver Hero-Kader).
- **Phasenband** (`lib/phasen/band.ts` + `components/ui/Phasenband.tsx`) —
  DAS Signature-Element: die Einheit als Filmstreifen. Kader-Breite =
  `widthReps` (clamp 3..15; Sek: /5; Cardio 8), Füllung = `fillRatio`
  (e1RM/Best via `bestForExercise`; ohne Rekord 0.62; Anzeige-Floor 0.12),
  Status offen (Raster + 3px-IWF-Basislinie 45 %) / aktiv (Siegellack-Rahmen +
  Zoetrop) / belichtet (Tintenfüllung + Card-Silhouette 56 %, nur hero).
  Größen: hero 64 · zeile 28 · mini 24 · live 14 (Vollbalken) · punkt 12;
  1px-Fugen, Gruppen-Trennung. Builder: bandOfPlanned/bandOfActive/bandOfLogged.
- **Myologie** (`lib/heat.ts`: `stufeFor`, `muskelStufen` + `MyologieFigur`):
  Wochenvolumen je Muskel → DISKRETE Stufen I–IV in `var(--stufe-n)`,
  untrainiert = line-card-Kontur. Immer mit „Schema, keine Anatomie".
- **Platten-Nummern** (`lib/platte.ts`): `plattenNummer(log)` = length+1,
  `plattenNummerOf`, `plattenNummern` (Map), `katalogNummern` +
  `fmtKatalogNr` („Nr. 311-07"), `fmtPlatteDatum` („SO 17. AUG") — IMMER
  abgeleitet, NIE persistiert (Löschen renummeriert, akzeptiert).
- **Icon & Marke — I1 „Marey-Spur"** (Nachtrag 2): Das App-Icon IST die
  Referenzfigur, dreimal überlagert — Phasen von `FIGUR_KNIEBEUGE` mit
  `translate(4 8)` / `(7.5 8)` / `(11 8)`, je `scale(.66)`, Opazität
  0,24 / 0,40 / 1,0, Kreide `#E9E1CE` auf Kollodium `#141210`. Kein Raster,
  keine Signatur, keine zweite Farbe; liegt komplett im Maskable-Kreis
  (r 19,2 um 24/24), deshalb dieselbe Zeichnung in JEDER Größe.
  **Eine Quelle:** `lib/phasen/figur-art.tsx` (`mareyArt` / `phaseArt`) —
  hookfrei und auf Satori-sicheres SVG beschränkt (nur `g`/`path`/`line`/
  `circle`, GENAU eine Transform-Ebene, kein `polyline`, kein `use`, Farbe
  als Argument statt CSS-Variable). Konsumenten: `lib/icon-art.tsx`
  (Icon-Routen 32/180/192/512), `components/brand/MareySpur.tsx` (volle Spur
  im DOM, Onboarding-Platte), `components/brand/LiftMark.tsx` (nur die
  Endphase, viewBox `8 11 36 36` — bei 17 px im Kopf würden Ghosts zu
  Grieß), `app/apple-splash/[spec]` (iOS-Startbild).
- **Poster** (`lib/share-card.ts`): Cyanotypie 1080×1350, FESTE Farben
  `#1F5C86/#F4F9FC/#D4A649` (ein Abzug kennt kein Theme — bewusst kein
  getComputedStyle für Farben), Kreide-Raster 0.5px alle 40 (Referenz 400×500),
  Phasenfigur-Endphase direkt auf Canvas, Titel-Breiteneinpassung, Varianten
  `kind: "maximum" | "studie"`. Teilen gibt es NUR im Sieger-Moment.
- **Navigation:** BottomNav = 4 TEXT-Register (HEUTE · KATALOG · FORTSCHRITT ·
  ATLAS), `text-4xs` gesperrt, aktiv `text-accent-ink` + 2px-Oberkante.
  Keine Icons, kein layoutId-Pill.
- **Startbild** (`components/start/`): drei Choreografien, das Pre-Paint-
  Skript in `app/layout.tsx` würfelt je Kaltstart eine aus und schreibt sie
  als `data-splash="v1|v2|v3"` auf `<html>`. **V1 „Belichtung"** Kader steht
  (= Icon) → Blitz 60 ms → Tintenfüllung 240 ms mit Raste bei 82 % →
  Silhouette invertiert hart bei 300 → Wortmarke bei 440. **V2 „Zoetrop"**
  12 Rasterfäden hart à 40 ms → ab 440 Zoetrop 8 B/s über Marey-Ghosts
  (Halte-Loop) → Wortmarke 520. **V3 „Walze"** drei Ziffernwalzen à 300 ms,
  Versatz 0/90/180, rasten mit 6 px Überschuss auf 3·1·1 → Messlinie scaleX →
  Wortmarke 500 hart. Abgang immer: 24-px-Ruck, 180 ms TRANSPORT_AUS.
  Drei Regeln, die nicht verhandelbar sind:
  1. **Immer Atelier** (`#141210`), unabhängig vom App-Modus — das Manifest
     kennt nur EINE `background_color`, modusgleich gäbe es an der Naht zum
     OS-Splash einen Farbsprung. `manifest.background_color` = Kollodium.
  2. **Das CSS ist kritisch und inline** (`splash-css.ts`, gerendert direkt
     vor dem Markup). NICHT nach globals.css verschieben: gemessen war die
     externe Datei beim ersten Paint noch nicht wirksam, und dann steht das
     Markup aller drei Varianten ungestylt untereinander im Bild. Aus
     demselben Grund hat der Splash eigene Zoetrop-Keyframes (`sp-zp1-3`,
     wertgleich zu `zp1-3` — bei Taktänderung BEIDE nachziehen).
  3. **Untergrenze 1200 ms** (`SplashGate`, gemessen ab Navigationsbeginn):
     Der Provider ist nach ~einem Frame fertig, weil localStorage faktisch
     synchron liest — ohne Untergrenze wäre das Startbild 16 ms sichtbar,
     ein Zucken statt eines Bildes. Die Untergrenze muss ÜBER dem Ende der
     Choreografie liegen (Wortmarke eingerastet: V1 600 · V2 680 · V3 500),
     sonst reißt der Abgang genau das Zielbild weg; obendrauf ein halber
     Moment Halt, damit es gelesen wird. Danach feuert der Abgang sofort.
     Notausgang nach 4 s liegt im Pre-Paint-Skript, damit er auch bei
     gescheiterter Hydration greift. Ohne `data-splash` bleibt alles
     unsichtbar (Fail-Safe für die Einstellung „aus").
  iOS baut den OS-Splash nicht aus dem Manifest — `apple-splash/[spec]`
  liefert dieselbe Marey-Spur, verlinkt über `appleWebApp.startupImage`.

## Sprache: Alltagsdeutsch in der Bedienung

**Die Laborsprache ist aus der Oberfläche entfernt** (Nutzer-Entscheid nach dem
Praxistest: „Studie beginnen" usw. las sich im Training zäh). Die Bedienung
spricht schlicht, das Design bleibt unverändert.

| In der Oberfläche steht | NICHT |
|---|---|
| Einheit · „Deine Einheit heute" · „Einheit 12" | Studie, Platte Nr. |
| Training starten / fortsetzen | Studie beginnen |
| Satz · „Satz 2" · „10 Sätze" · „Aufw." | Kader, Kalibr. |
| Pause | Verschlusszeit |
| Aufwärmen | Kalibrierung der Apparatur, Akt I, Apparat n |
| Übung 1/5 · „Übung läuft" | Bühne, Akt II, Zoetrop 8 B/s |
| Rekord · „Neuer Rekord" · „Persönlicher Rekord" | Maximum, Tafel des Maximums |
| erledigt · gespeichert | belichtet, archiviert |
| Abschluss · „Beenden & speichern" | Auswertung, Platte archivieren |
| Plan · „Basisplan (offline)" | Versuchsanordnung, Basisprotokoll |
| ATLAS · Coach | Studienleiter |
| Wochen-Rückblick | Wochen-Protokoll (Folio) |
| Hell / Dunkel | Archiv / Atelier |
| Muskeln | Myologie |
| Übungen · „114 Übungen" | Register |

**Was bleibt:** der Name „Platte 311" (App-Titel, Wortmarke, Onboarding,
Startbild, Poster-Kopf) und **ATLAS** als Name des Coaches. Beides sind
Eigennamen, keine Fachsprache.

**Der Code behält die Design-Sprache.** Bezeichner und Kommentare heißen
weiter `Kader`, `plattenNummer`, `belichtet`, `PhasenFigur`, `sp-buehne` —
das ist die Sprache des Systems, nicht der Oberfläche, und ein Umbenennen
wäre reine Churn. Wer eine UI-Zeichenkette ändert, prüft also nicht die
Bezeichner drumherum.

**ATLAS spricht ebenfalls normal.** Die Persona in `lib/atlas/prompts.ts`
verbietet ausdrücklich erfundene Fachsprache; die Chat-Protokollzeilen heißen
`Beobachtung:` / `Einschätzung:` / `Plan:` / `Anpassung:` / `Hinweis:` — diese
fünf Präfixe müssen in `app/api/atlas/chat/route.ts` und im Regex von
`components/coach/ProtokollBubble.tsx` deckungsgleich bleiben, sonst rendert
der Parser nichts mehr.

DOM in Normalschreibung, Versalien via CSS.

## HARTE Regeln (nicht verhandelbar)

- **Keine** Tailwind-Arbitrary-Values `[...]` (kein `w-[327px]`, kein
  `bg-[#123456]`); benannte Transition-Properties (`transition-[width]`) ok.
- **Keine** Slash-Opacity (`bg-black/50`) — Token oder `rgba(...)` via `style`.
- **KEIN Schatten, KEIN Verlauf, kein Glow, kein Parallax, kein Blur.**
  (Raster via `repeating-linear-gradient` ist Linienwerk, kein Verlauf — ok.)
- **Keine neuen Easings** — nur TRANSPORT_EIN/AUS, steps(), linear.
  Kein `animate-*` außer den definierten Keyframes (zp1-3, skel-blink).
- Dynamische Werte → inline `style`, SVG (`var(--…)`), Framer Motion.
- Eine Komponente pro Datei, `cn()` fürs Klassen-Merging, TS strict.
- UI-Texte **Deutsch**, deutsche Anführungszeichen „…" (react/no-unescaped-entities).
- Zahlen-Readouts in Plex Mono bold + `tabular-nums`; Zahlen animieren NIE.
- lucide nur als Werkzeug-Icon (16–22, ein Strichgewicht), nie als Deko;
  Piktogramme sind IMMER Phasenfiguren/FigurePanel.

## Plattform-Basics (gelten weiter)

`-webkit-tap-highlight-color: transparent`, `touch-action: manipulation`,
`overscroll-behavior-y: none`, Formularschrift ≥1rem gegen iOS-Zoom
(`text-base` an Feldern), Sheets `overscroll-contain`, Safe-Area-Paddings
inline. **STICKY-FALLE:** Horizontal-Clip NUR auf `body { overflow-x:hidden }`
— nie auf `html` oder innere Wrapper (tötet `position:sticky`).
z-Ordnung: Sticky-Kopf 20 < Dock 30 < Sheets 50.

## Smoke-Invarianten (`scripts/smoke.mjs`, Port 3199, prod build)

Diese Strings/Anker klickt der Smoke — Änderung NUR mit Ko-Evolution von
smoke.mjs im selben Commit:

- Heute: „Deine Einheit heute" · „Training starten" · „Einheit bearbeiten" ·
  „Übung wählen" · „… tauschen" (Regex-Ende) · „Bearbeiten"
- Check-in: „Tagesform" · „Überspringen"
- Aufwärmen: aria-label „Aufwärmen beenden"
- Übungsansicht: `data-testid="stage-order"` (ExerciseStage-section) ·
  `.set-active` mit 2 Inputs
- Pause: „Pause" (exact:false)
- Abschluss: aria „Training beenden" · „Zum Abschluss" · „Wie fühlt sich dein
  unterer Rücken an?" + „Gut" (exact) · „Beenden & speichern"
- Fortschritt: „Verlauf" (exact) — Alt-Session „Ganzkörper A" muss rendern
- Katalog: „Eigene Übung anlegen" · „z. B. Landmine Press" · „Übung anlegen" ·
  „1 eigene" (Substring)
- Settings: „Geräte" · „ATLAS"
- Seed migriert `theme:"dark"` → hell (M72-Migration bleibt); /workout läuft
  im erzwungenen Atelier.
- Seed setzt `splash: "aus"` — die Durchlauf-Checks sollen nicht ~2,4 s auf
  die Choreografie warten. Schritt 11 „startbild" prüft sie dafür gezielt:
  `#splash` wird sichtbar und muss danach `hidden` sein (nicht bloß
  transparent), dann steht „Deine Einheit heute".
