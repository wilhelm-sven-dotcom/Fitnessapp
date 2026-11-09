---
name: ui-style
description: >-
  Verbindliches Design-System dieser Fitness-PWA. MUSS bei JEDER UI-Arbeit
  geladen werden: React/Next.js-Komponenten, Seiten, Tailwind-Klassen, Layouts,
  Farben, Fonts, Buttons, Cards, Inputs, Focus-States, Animationen. EIN Design:
  „spotter“ — der Kumpel an der Bank: Weiß und Tinte, Elektroblau für Aktionen
  und Daten, Signalorange für Rekorde, Sonnengelb für Sticker; Karten und
  Knöpfe mit dickem Tinte-Rand (2,5 px) und hartem Versatz-Schatten; Regionen
  als kleine Kacheln (Beine Orange, Druck Blau, Zug Sonne, Rumpf Weiß); ATLAS
  in Sprechblasen; Bricolage Grotesque (Titel, Zahlen, Knöpfe) + Onest (Text);
  Kontrast Text ≥ 4,5:1, Bedienelemente ≥ 3:1; Bediensprache schlichtes,
  freundliches Alltagsdeutsch. Enthält die echten Tokens, Rezepte, Regeln und
  Test-Anker. Werte hier nachschlagen statt erfinden.
---

# UI-Style — Design-System „spotter“

Stack: **Next.js 14 App Router · React 18 · TypeScript strict · Tailwind 3.4 ·
Framer Motion 11 · lucide-react · `cn()` (clsx + tailwind-merge)**. Mobile-first
PWA, Container `max-w-md`, Touch-/Press-zentriert.

Die App heißt **Kumpel** (`lib/marke.ts`: `APP_NAME`, `APP_SLUG`, `CLAIM`
„Ich hab dich.“ — Name nur dort ändern), der Coach **ATLAS**. Der Look heißt
„spotter“ (Nutzer-Entscheid Nov 2026, eine von vier Richtungen; vorher
„Regionen“ und davor „Platte 311“).

## These

- **Der Kumpel an der Bank:** laut, direkt, gut gelaunt. Die App redet wie ein
  Trainingspartner, nicht wie ein Messgerät.
- **Weiß und Tinte tragen alles.** Elektroblau ist die Aktion (und Daten),
  Signalorange gehört dem Rekord, Sonnengelb den Stickern.
- **Dicker Rand statt Fläche-auf-Fläche:** Karten, Knöpfe, Chips, Kacheln und
  Sticker tragen 2,5 px Tinte-Rand. Die EINE wichtige Karte eines Bildschirms
  und die Hauptaktion tragen dazu den harten Versatz-Schatten (4 px).
- **Regionen als Kachel:** Beine Orange, Druck Blau, Zug Sonne, Rumpf Weiß,
  Cardio Grau — immer als Kachel mit Tinte-Rand (Nummer, Quadrat), nie als
  Schrift oder randloser Balken. Die Region steht zusätzlich als Wort da.
- **Zwei Modi, eine Palette:** Hell ist Grundzustand, Dunkel über
  `data-theme="dark"`; Wahl in `settings.theme` (Hell/Dunkel/Auto), Laufzeit
  `applyTheme` (`lib/theme.ts`), Pre-Paint in `app/layout.tsx`. Das Training
  folgt der Einstellung.
- **Immer Tokens, nie rohe Hex/feste Radien im JSX.** Ausnahmen: Bild-Routen
  (Icon, Startbilder), Startbild-CSS, `global-error.tsx` und das Teilen-Bild
  lesen keine CSS-Variablen und nehmen die Werte aus `lib/grundfarben.ts`.

## Farben — Tokens (hell / dunkel)

| Tailwind | CSS-Var | Hell | Dunkel | Zweck |
|---|---|---|---|---|
| `surface-0` | `--base` | `#EEF0F4` | `#0F1015` | Grund |
| `surface-1` | `--card` | `#FFFFFF` | `#1A1C24` | Karten, Sheets, Zeilen |
| `surface-2` | `--surface-2` | `#E2E5EC` | `#252833` | eingelassen: Stepper, gedrückt |
| `rand` | `--rand` | `#0E0F14` | `#D9DCE4` | dicker Rand (2,5 px) |
| — | `--schatten` | `#0E0F14` | `#000000` | harter Versatz-Schatten |
| `line` | `--line` | `#C5CAD4` | `#343845` | feine Linie auf dem Grund |
| `line-card` | `--line-card` | `#D3D6DE` | `#2C2F3A` | Trenner in Karten (gestrichelt) |
| `fg` / `strong` | `--fg` / `--strong` | `#0E0F14` | `#F3F4F8` | Tinte: Text, Tinte-Fläche |
| `on-strong` | `--on-strong` | `#FFFFFF` | `#0F1015` | Schrift auf Tinte-Fläche |
| `muted` | `--muted` | `#535866` | `#A7ACBA` | Nebentext (7,1:1 / 7,5:1 auf Fläche) |
| `faint` | `--faint` | `#5A5F6D` | `#9CA2B1` | Hinweis, Meta (≥ 5,6:1) |
| `accent` | `--accent` | `#2F45FF` | `#4D5EFF` | Hauptaktion = Elektroblau |
| `accent-press` | `--accent-press` | `#2236E0` | `#3B4CF0` | gedrückt |
| `on-accent` | `--on-accent` | `#FFFFFF` | `#FFFFFF` | Schrift auf Blau (6,2:1 / 4,8:1) |
| `accent-ink` | `--accent-ink` | `#2F45FF` | `#8A96FF` | Aktiv-Markierung als Schrift |
| `info` / `fokus` | `--info` / `--fokus` | `#2F45FF` | `#8A96FF` | Daten, Charts, Links, Fokusring |
| `rekord` | `--rekord` | `#C2410C` | `#FF8A5C` | Rekord als Schrift |
| `rekord-flaeche` / `rekord-auf` | `--rekord-flaeche` / `--auf-rekord` | `#FF5A1F` / Tinte | `#FF6B33` / `#0F1015` | Rekord-Fläche, Schrift darauf |
| `sonne` / `sonne-auf` | `--sonne` / `--auf-sonne` | `#FFD43B` / Tinte | gleich | Sticker, Markierung |
| `erfolg` | `--erfolg` | `#17784A` | `#4CC38A` | erledigt, im Ziel |
| `warnung` | `--warnung` | `#94590A` | `#E8B04A` | über dem Ziel, Hinweis |
| `gefahr` | `--gefahr` | `#CC2B1D` | `#FF7A6B` | Löschen, Fehler |
| `stufe-1..4` | `--stufe-1..4` | `#DDE1FF #A9B3FF #6C7BFF #2F45FF` | `#262A4D #3946B5 #6C7BFF #C3CAFF` | Muskel-Stufen I–IV |

**Regionen** (`lib/phasen/band.ts`: `regionOf(ex)`, `REGION_VAR` =
`REGION_FLAECHE` = Kachel-Fläche, `REGION_AUF` = Schrift darauf):

| Region | Kachel hell / dunkel | Schrift auf Kachel |
|---|---|---|
| Beine (`unterkoerper`) | `#FF5A1F` / `#FF6B33` | Tinte |
| Druck (`push`) | `#2F45FF` / `#4D5EFF` | weiß |
| Zug (`pull`) | `#FFD43B` | Tinte |
| Rumpf (`core`) | `#FFFFFF` / `#F3F4F8` | Tinte |
| Cardio | `#D3D6DE` / `#3A3E4B` | Tinte / hell |

Kacheln IMMER mit `border-dick border-rand` (Sonne und Weiß hätten ohne Rand
keinen Kontrast). Die IWF-Tokens (`iwf-*`) bleiben die echten Scheibenfarben
(Rot, Blau, Gelb, Grün) für den Scheibenrechner.

- **Kontrast ist Regel, nicht Geschmack:** Text ≥ 4,5:1 auf Grund und Fläche
  (WCAG 2.1, 1.4.3), Bedienelemente und Grafik ≥ 3:1 (1.4.11).
  Orange `#FF5A1F` ist KEINE Schriftfarbe auf Weiß (3,1:1) — Rekord als Schrift
  nimmt `rekord`. `npm run kontrast -- --streng` muss grün sein.
- Nicht gewählte Optionen sind voll lesbar (`fg`), nie blass; die Auswahl
  zeigt sich über Fläche (Tinte oder Blau).

## Typografie

- **Bricolage Grotesque** (`next/font/google`, variabel mit optischer Größe)
  über `font-display`: Titel, Zahlen-Readouts, Knöpfe, Sticker, Kacheln,
  Wortmarke. Gewicht 800 (`font-extrabold`), eng gesetzt (−0,02em in
  globals.css). **Nie kursiv.**
- **Onest** für Text (`font-sans`/`font-body`, 400/500/600/700). `font-mono`
  bleibt als Klasse gültig und ist Onest. Zahlen: `tabular-nums` (Pflicht bei
  Messwerten).
- Größen (Tailwind): `2xs` 12 px · `3xs` 12 px · `4xs` 11 px · `5xs` 10 px
  (nur Diagramm-Beschriftung) · `titel` 28 px · `readout` 44 px · `readout-lg` 64 px;
  dazu die Tailwind-Skala.
- **Labels/Kicker:** Normalschreibung, fett, `text-muted` (`Kicker`: `text-sm
  font-bold`; kleine Labels `text-3xs font-bold`). **Keine Versalien,** keine
  Sperrung — der Kumpel spricht, er beschriftet nicht.
- **Knöpfe:** Bricolage 800, Normalschreibung.

## Form

- Radius: `rounded-card` **20 px** (Karten, Sheets, große Knöpfe),
  `rounded-inner` **14 px** (Zeilen, Felder), `rounded-kachel` **10 px**
  (Kacheln, Sticker), `rounded-pill` (Chips, kleine Knöpfe, Segmente,
  Schalter), `rounded-xs` **6 px** (Kleinteile, Blasen-Spitze).
- **Rand:** `border-dick border-rand` (2,5 px Tinte) an Karten, Knöpfen, Chips,
  Feldern, Kacheln, Stickern. Feine Trenner in Karten: `border-line-card`
  (gestrichelt, wo es um Listen geht).
- **Schatten:** NUR `shadow-hart` (4 px / 4 px, Tinte) bzw. `shadow-hart-sm`
  (3 px) — an der Hauptaktion und an der EINEN wichtigen Karte. Nie weich,
  kein Verlauf, kein Blur, kein Glow.

## Komponenten-Rezepte (`components/ui/`)

- **Button:** Bricolage 800, Normalschreibung, `border-dick border-rand`.
  `primary` Blau mit `shadow-hart`, gedrückt rutscht er in den Schatten
  (`translate-0.5`, `shadow-hart-sm`); `strong` Tinte-Fläche; `secondary` weiß
  mit Rand; `ghost` `text-muted`; `danger` Rand + Schrift `gefahr`. Größen
  `lg` (h-14, `rounded-card`, 20 px) und `sm` (min-h-11, Pille, 16 px).
- **Card:** `rounded-card border-dick border-rand bg-surface-1 p-4`;
  `variant="elevated"` + `shadow-hart` für die eine Hauptkarte.
- **Chip** (Hinweis): Pille mit Rand, `text-3xs font-bold`.
- **ChipToggle:** Pille mit Rand, Bricolage 800; aktiv `bg-strong
  text-on-strong`, inaktiv weiß; `aria-pressed`.
- **Segment** (genau eine Wahl): Pille mit Rand, aktives Segment Tinte-Fläche,
  inaktiv `text-fg`; `aria-pressed`; Knopfname = sichtbarer Text
  (Test-Anker Ortsumschalter).
- **Toggle:** Pille mit Rand, an Blau, aus Weiß; `role="switch"`.
- **Sticker** (`Sticker`): `rounded-kachel border-dick border-rand`, Bricolage
  800 14 px, Töne `sonne` (Standard), `orange` (nur Rekord), `blau`, `weiss`,
  statisch gedreht (−3° Standard, ±6° max). Kurze Etiketten, nie Fließtext.
- **Sprechblase** (`Sprechblase`): Avatar „A“ (Sonne mit Rand) + weiße Blase
  mit Rand, Ecke unten links spitz (`rounded-bl-xs`), 16 px halbfett. So
  spricht ATLAS überall.
- **Kicker:** Label-Rezept oben. **PageHeader:** Kicker + Titel
  `font-display text-titel font-extrabold`.
- **Sheet:** `rounded-t-card border-dick border-b-0 border-rand bg-surface-1`,
  Griff `bg-rand`, Titel `font-display text-2xl font-extrabold`, Scrim
  `var(--scrim)`; A11y und Ziehen unverändert; Wurzel `div.fixed` mit
  `data-sheet="‹Titel›"`.
- **Felder:** `rounded-inner border-dick border-rand bg-surface-1 px-3`,
  `text-base`, Fokus `focus-visible:ring-2 focus-visible:ring-fokus`.
- **Pressable / PressableLink:** Druck `scale .985`, Fokusring `ring-fokus`.
- **Toast:** `bg-strong text-on-strong rounded-pill`. **Skeleton:** `bg-surface-2`.
- **Fokus & Ziele:** immer `focus-visible:`, Ziele ≥ 44 px, `aria-pressed`
  an Auswahl, `disabled:opacity-40`.

## Signatur-Elemente

- **Regions-Kachel:** 28 px Kachel mit Nummer (Listen) oder 16 px Quadrat
  (Zeilen), Fläche `REGION_FLAECHE`, Schrift `REGION_AUF`, immer mit Rand.
- **Sticker** an der Stelle, die zählt: Region im Übungskopf („Brust“), der
  laufende Satz („Satz 2“, Orange), Wochenstand („1 von 3“), Rekord („PR!“,
  „+2 kg“).
- **Sprechblase:** ATLAS-Sätze auf Heute, im Training, beim Rekord, im Chat.
- **Phasenfiguren** (`components/phasen/PhasenFigur.tsx`): die
  Übungs-Piktogramme, in Tinte (`var(--fg)`) bzw. Weiß auf blauer Übungskarte;
  **kein Raster**. Zoetrop nur im Training, Doppel-Gate
  `settings.zoetrope !== false` UND reduced-motion.
- **Navigation:** BottomNav mit 4 Reitern (Heute, Katalog, Fortschritt, ATLAS),
  je lucide-Symbol + Text 11 px; aktiv als blaue Pille.

## Motion

Funktional und kurz: nur `transform`/`opacity`, 120–260 ms, Kurven aus
`lib/motion.ts`. Zahlen springen (keine Zähl-Animation). EIN gefeierter
Moment: beim Rekord springt der PR-Sticker einmal auf (Feder). Sticker sind
sonst statisch gedreht. Reduced motion: Dauern 0, kein Sprung.

## Sprache: Alltagsdeutsch in der Bedienung

Einheit · Satz · Pause · Rekord · Aufwärmen · Übung · Abschluss · Plan ·
ATLAS · Sprungtest · Wochen-Rückblick · Hell/Dunkel · Muskeln · Übungen.
Freundlich und direkt, Du-Form, kurze Sätze („Los geht’s“, „Mittwoch. Brust ist
dran.“, „Noch einer. Ich hab dich.“). Keine Laborsprache (Studie, Kader,
Platte, belichtet, Verschlusszeit) in der Oberfläche; Code-Bezeichner dürfen sie
behalten. ATLAS-Protokollzeilen `Beobachtung:` / `Einschätzung:` / `Plan:` /
`Anpassung:` / `Hinweis:` müssen in `app/api/atlas/chat/route.ts` und
`components/coach/ProtokollBubble.tsx` deckungsgleich bleiben. Deutsche
Anführungszeichen „…“.

## Harte Regeln

- Keine Tailwind-Arbitrary-Values `[...]`; keine Slash-Opacity (`bg-black/50`).
- Einziger Schatten `shadow-hart` / `shadow-hart-sm`; kein Verlauf, kein Glow,
  kein Blur.
- Dynamische Werte → inline `style`, SVG `var(--…)`, Framer Motion.
- Eine Komponente pro Datei, `cn()`, TypeScript strict. **Jedes neue
  Größen-/Radius-/Rand-/Schatten-Token in `lib/utils.ts`
  (`extendTailwindMerge`) eintragen**, sonst verschluckt `cn()`
  Überschreibungen (`border-dick` steht dort als Randbreite).
- Zahlen-Readouts `tabular-nums`; Gewichte in der Oberfläche über
  `fmtGewicht` (Komma), Eingabefelder bleiben `type="number"`.
- lucide nur als Werkzeug-/Nav-Symbol (16–22 px, ein Strichgewicht);
  Übungsbilder sind immer Phasenfiguren.

## Plattform

`-webkit-tap-highlight-color: transparent`, `touch-action: manipulation`,
`overscroll-behavior-y: none`, Formularschrift ≥ 1rem, Sheets
`overscroll-contain`, Safe-Area-Paddings inline. Horizontal-Clip NUR auf
`body` (sonst stirbt `position:sticky`). z-Ordnung: Sticky-Kopf 20 < Dock 30 <
Sheets 50.

## Heute

- **Aufbau von oben:** Kicker „Deine Einheit heute · Datum“ → Überschrift
  Bricolage 30 px: „Montag.“ und darunter der Fokus der Einheit (Teil des
  Namens nach „·“) in einer Sonnen-Markierung mit Rand, „… ist/sind dran.“;
  erledigt „Montag. Geschafft.“; vor der Ortswahl „Wo trainierst du heute?“ →
  Bestandszeile (`heute-bestand`) → **Wochenleiste** (Mo–So als Kreise mit
  Rand: trainiert blau mit Haken, heute oranger Ring; Sticker „1 von 3
  Einheiten“) → Ort-Segment → **Einheitskarte** (Rand + harter Schatten: Name
  der Einheit, Zeilen mit Nummer-Kachel in Regionsfarbe, Figur in Tinte, Name,
  „3 × 10–15 Wdh · Muskel“, Gewicht rechts; Trenner gestrichelt; unten die
  Plan-Quelle) → ATLAS-Begründung als Sprechblase → „Zuerst kommt das
  Aufwärmen.“ → Umbauen (Pillen mit Rand) und Wunschfeld → Hinweiskarten →
  Wochenraster.
- **Zeit und Start im Dock über der Tab-Leiste** (`StartDock` per Portal in den
  `NavSlot` der AppShell): Zeit-Pillen 20/30/45/60/90 und „frei“ (Rand,
  gewählt Tinte; „frei“ öffnet ein Blatt mit dem Feld — kein Eingabefeld im
  Dock), darunter der blaue Knopf „Los geht’s“. Nie während der Ortsfrage,
  nicht für eine erledigte Einheit; läuft eine Einheit, nur „Weiter geht’s“.
  Die AppShell misst Leiste + Dock und gibt dem Inhalt so viel Auslauf.
- Ortsfrage: zwei Kacheln (Zuhause/Studio) mit Rand und kleinem harten
  Schatten, Figur, Übungszahl, Geräte.

## Fortschritt und Übungsdetail

- **Übersicht:** Kopfzeile aus drei Kacheln (Bewegt gesamt · Level → LevelSheet ·
  Woche im Block → Blatt „Phase“), Volumen mit Segment „4 Wochen · 6 Monate ·
  1 Jahr“, Rekorde, Verläufe als Liste mit Mini-Kurve (`MiniKurve`) in Blau
  und Regions-Quadrat. Antippen öffnet das Übungsdetail im Reiter „Verlauf“. Große
  Kurven stehen nur im Übungsdetail.
- **Eine Quelle für Verläufe:** `lib/exercise-series.ts` (Art der Kennzahl über
  die ganze Historie wie bei den Rekorden). Gewichtswerte heißen immer
  „geschätztes 1RM“, mit dem gehobenen Satz daneben („1RM aus 25 kg × 8“).
- **Übungsdetail** (`GuideSheet`): oben Figur (Zoetrop) und Muskelkarte, Segment
  „Anleitung · Verlauf“; „Verlauf“ (`GuideVerlauf`) rechnet erst, wenn der
  Reiter offen ist: Bestwert, letzte drei Sätze, Kurve.
- **Muskeln:** Körperkarte, Sätze je Muskel mit Zielband und „Sätze/Ziel“,
  Muskel-Balance. Status-Farben immer mit Legende und Zahl.
- **Verlauf:** Karten mit Rand, das Mini-Band je Einheit in Blau (Daten),
  Titel zweizeilig (`line-clamp-2`), kein Papierkorb in der Karte;
  Löschen als `danger`-Knopf in der aufgeklappten Einheit, mit Rückfrage.
- Veränderungen über `fmtDelta` („−1,5 kg“, echtes Minus, Komma).

## Katalog, ATLAS, Einstellungen

- **Platz über der Tab-Leiste** (`NavSlot`): Heute (Zeit + Start) und ATLAS
  (Fragen als Chips + Eingabe) docken dort per Portal an. Bei offener
  iOS-Tastatur (`visualViewport`) hebt die Leiste den Platz über die Tastatur,
  wenn der Fokus darin liegt; sonst tritt sie zurück. Scroll-Ziele über dem
  Dock nutzen `scrollMarginBottom: var(--nav-h)`.
- **Katalog:** eine Filterzeile („Muster“ und „Muskel“ öffnen je ein Blatt,
  „Meine Geräte“ als ChipToggle), Figur einmal im Gruppenkopf, Zeilen mit
  Regionsbalken und „Muskel · Gerät“ (`geraetText`).
- **Geräte am Ort:** ChipToggle mit Haken, Ort-Segment „Studio · 10“.
- **Formularfelder** mit `text-base` (≥ 16 px, sonst zoomt iOS) und dem
  Feld-Rezept; Erfahrungsstufen tragen je einen erklärenden Satz.

## Fokus-Modus (Training)

- **Aufbau von oben:** Kopf (runder Schließen-Knopf mit Rand links, „Übung 2
  von 6“ in Bricolage, Restzeit; darunter ein dickes Segment je Übung —
  Pille mit Tinte-Rand, erledigte Sätze füllen Blau, die laufende Übung mit
  dickem Rand; Tipp = Übersicht) → **Übungskarte** blau mit Rand und hartem
  Schatten, Figur weiß 56 px, Name `font-display` 2xl (bei Wörtern > 12
  Zeichen xl), Unterzeile „Satz 1 von 3 · Ziel 10–15 Wdh“, Muskel als
  Sonnen-Sticker an der Kartenkante; wischen blättert → Pillen „Anleitung“ /
  „Tauschen“ (Rand, Bricolage) → Satzliste → ATLAS-Blase → „Danach ‹Übung›“
  (gestrichelt) → Blättern.
- **Satzliste:** eingetragen = Pille mit Rand und blauem Haken-Kreis, Rekord
  als oranger Mini-Sticker; kommend = gestrichelte Pille mit leerem Kreis.
  Die offene **Satzkarte** (`.set-active`: Rand + harter Schatten) trägt oben
  links den Sticker „Satz 2“ (Orange; Aufwärmen in Sonne), rechts „Ziel
  10–15 Wdh“ (Plan-Bereich), zwei Spalten Gewicht und Wiederholungen (Ziffern
  `font-display` 5xl, darunter runde Tasten − weiß / + Sonne), „Letztes Mal …
  · Rekord …“ und „Vorschlag … · Grund“. „Ziel“ = Plan, „Vorschlag“ =
  vorbelegte Werte; nie dasselbe Wort für beides.
- **Ein Dock, ein Wirt** (`SessionRunner`): unten fest, Inhalt ENTWEDER die
  Pause (`RestPanel`) ODER „Satz eintragen · 22,5 kg × 12“ (blauer Knopf mit
  Schatten, 18 px, kommt per `createPortal` aus der Satzkarte,
  `components/session/DockSlot.tsx`). Keine Eingabefelder im Dock. Solange ein
  Feld den Fokus hat, ist das Dock unsichtbar (iOS-Tastatur). Wird es eng,
  kürzt sich das Wort, nie die Werte.
- **Feste Abstände zu `fixed`-Docks sind verboten — Höhe MESSEN**
  (ResizeObserver am Wirt → `paddingBottom` an `session-root`). Gilt für jedes Dock.
- **Pause:** Blatt mit dickem Rand oben, Restzeit `font-display` readout,
  „von 1:30“, dicker blauer Balken mit Rand, „Als Nächstes“ gestrichelt
  (gleiche Übung: „Satz 2 · 22,5 kg × 12“, sonst nächste offene Übung, Cardio
  in Minuten, zuletzt „Abschluss“), −15 s / +15 s / „Pause beenden“ (bei 0
  blau), dann die EINE Frage „Wie schwer war Satz N?“ (Kacheln mit Rand,
  gewählt blau) mit Erklärzeile. `aria-live` sagt Start und Ende an.
- **ATLAS im Training:** Avatar „A“ + Blase mit kleiner Zeile „ATLAS“
  (Test-Anker); antreibende Sätze und eigene Ansagen in einer Sonnen-Blase,
  sonst weiß; stille Momente „…“.
- Der Abschluss einer Übung gehört in die Bühne („Nächste Übung · ‹Name›“
  bzw. „Zum Abschluss“ direkt unter der Satzliste); „Nächste Übung“ nennt die
  nächste OFFENE Übung (`nextOpenItemIndex`), genau dorthin springt „Weiter“.
- Abschluss vor dem Speichern: Dauer · Sätze · Bewegt und je Übung eine Zeile
  (Regions-Quadrat 16 px); danach der Moment nach dem Speichern: **mit Rekord**
  die ganze Fläche Orange (Schrift Tinte), die weiße PR-Karte (Rand, harter
  Schatten, „PR!“ blau, Übungsname, Figur) springt EINMAL gedreht auf (Feder;
  reduced motion steht sie still), Sonnen-Sticker „+7 kg“, darunter der Satz
  groß, Level-Balken (weiß mit Rand, Füllung blau), ATLAS als Sprechblase,
  „Teilen“ weiß und „Weiter“ Tinte; **ohne Rekord** Grund, Figur, blauer
  Sticker „Erledigt!“, Name, Level, Blase, „Weiter“ blau. Keine Zahl doppelt. Gewichtsrekorde zeigen den gehobenen Satz groß
  und „Geschätztes 1RM“ beschriftet darunter, nie eine nackte e1RM-Zahl.
- Check-in „Tagesform“: vorbelegt wie zuletzt (≤ 7 Tage), sonst mittlere Stufe;
  Knopf sofort aktiv; Rückenschonung nur über eine heute angetippte Wertung.
- Jede Hauptaktion des Ablaufs ist ein `Button`.

## ATLAS-Kontext und KI-Aufrufe

- Jede Zahl trägt ihre Einheit (`80 kg × 12 Wdh`, `45 s`, `3 Sätze à 8–12
  Wdh`); `×` nur zwischen Kilo und Wiederholungen. Prompt
  (`lib/atlas/live-tool.ts`) und Datenformat (`lib/atlas/transcript.ts`) ändern
  sich zusammen.
- Ein Auslöser, ein `AbortController`; Fehler mit Grund
  (`limit | zeit | netz | aus | abgebrochen`, `abgebrochen` zeigt nichts);
  während einer Anfrage nichts sperren; Timeouts 60 s.

## Trainingsort

Orte sind `GymProfile` mit eigener Geräteliste (`lib/orte.ts`): der aktive Ort
IST die Geräteliste; Migration in `loadAll` (`ensureOrte`, feste Ids
`gym_zuhause`/`gym_studio`, `orteM1`); erst wählen, dann komponieren (keine
ATLAS-Anfrage vor der Wahl); die Einheit trägt ihre Ort-Signatur; Einstellungen
wählen nur den BEARBEITETEN Ort.

## Marke

- **Name:** `APP_NAME` = „Kumpel“, `APP_SLUG` = „kumpel“, `CLAIM` = „Ich hab
  dich.“, `BESCHREIBUNG` — alles in `lib/marke.ts`, nirgends sonst als Text.
- **Zeichen:** weiße Sprechblase (Spitze unten links) mit einer Hantel,
  Tinte-Rand 4 im 64er-Feld (`MARKE_VIEWBOX`), eine Zeichnung für alles:
  `lib/marke-art.tsx` (`markeArt({ blase, rand, scheibe })`, Satori-tauglich,
  feste Hexwerte aus `lib/grundfarben.ts`), im DOM `components/brand/Marke.tsx`
  (Scheiben Blau).
- **Icon:** `lib/icon-art.tsx` auf Elektroblau, Scheiben Orange, Blase im
  Maskable-Kreis. Bei JEDER Änderung `ICON_VERSION` hochzählen und
  „ICON-FASSUNG N“ in `app/icon.tsx` und `app/apple-icon.tsx` mitziehen, dazu
  `CACHE` in `public/sw.js`.
- **Startbild:** Elektroblau, Blase genau mittig bei 45 vw wie im
  iOS-Startbild (`app/apple-splash/[spec]`), die Blase nickt, die Scheiben
  pumpen, dann Wortmarke (Bricolage 52 px weiß) und Sticker „Ich hab dich.“;
  kritisches Inline-CSS in `components/start/splash-css.ts`, Mindestzeit
  `MIN_MS` in `SplashGate`, Notausgang 4 s im Pre-Paint-Skript, reduzierte
  Bewegung = Standbild. Gespeicherte Werte v1/v2/v3/zufall zeigen alle dieses
  Startbild, „aus“ keins. Manifest `background_color` = Blau.
- **Teilen-Poster** (`lib/share-card.ts`): Rekord auf Orange (Tinte-Schrift),
  Training auf Blau (weiße Schrift); weiße gedrehte Karte mit Rand und hartem
  Schatten („PR!“ / „Erledigt!“, Figur, Name), Sonnen-Sticker („+2 kg“ bzw.
  Dauer), darunter der gehobene Satz groß und „Geschätztes 1RM … kg“.
  Dateiname `‹APP_SLUG›-‹Einheit›-‹Datum›.png`.

## Test-Anker (`scripts/*.mjs`, Port 3199, Produktions-Build)

Änderung NUR zusammen mit dem Skript im selben Commit:

- Texte: „Deine Einheit heute“ · „Wo trainierst du heute?“ (Orts-Kacheln als
  Button, Name beginnt mit dem Ort) · „Los geht’s“ (Tests suchen „Los geht“) ·
  „Bearbeiten“ ·
  „Einheit bearbeiten“ · „Übung wählen“ · „‹Name› tauschen“ · „Tagesform“ ·
  „Überspringen“ · „Pause“ · „Zum Abschluss“ · „Wie fühlt sich dein unterer
  Rücken an?“ · „Gut“ · „Beenden & speichern“ · „Verlauf“ · „Orte & Geräte“ ·
  genau ein Knopf „Kraftgeräte“ · „Neu ansetzen“ · „angepasst“ · „stellt
  gerade um“ · „ausgelastet“ (nie „nicht erreichbar“ bei 429) · „Für ‹Ort› neu
  zusammenstellen“ · „z. B. Landmine Press“ · „Übung anlegen“ · „N eigene“ ·
  „ATLAS“ sichtbar in Training und Einstellungen.
- aria-labels: „Aufwärmen beenden“ · „Training beenden“ · „Eigene Übung
  anlegen“ · „Zeitbudget N Minuten“.
- Test-IDs: `start`, `heute-bestand`, `session-root`, `satz-aktiv`,
  `satz-protokollieren`, `stage-order`, `edit-row-name`, `picker-row-name`,
  `data-exercise-id`, `[data-sheet="‹Titel›"]`.
- Struktur: Pausen-Dock `section[aria-label="Satzpause"]`, `.set-active
  input` (kg, Wdh; Enter trägt ein), Segment-Knopfname = Ortsname,
  `aria-pressed` an Auswahl, `#splash` mit `data-splash` (sichtbar → danach
  `display:none`). `lib/exercises.ts` nicht umformatieren (`pruefe-ort` liest
  `id` und `req` je Zeile).
- Übungsnamen auf Heute nicht in Versalien (`pruefe-zeit` vergleicht sichtbaren
  Text). Text-Prüfungen lesen `innerText`.
- Gespeicherte Werte kompatibel: `settings.theme` light/dark/system,
  `settings.splash` v1/v2/v3/zufall/aus, `zoetrope`, alle
  `wilhelm-training-*`-Keys.

## Prüfen

`npm run lint && npx tsc --noEmit && npm run build && npm run pruefe`, dazu
`npm run kontrast -- --streng` und `npm run pruefe:tokens -- --streng`.
Bildschirmfotos: `npm run fotos -- --klein`, Lage der Hauptaktionen:
`npm run messen`.
