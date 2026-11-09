---
name: ui-style
description: >-
  Verbindliches Design-System dieser Fitness-PWA. MUSS bei JEDER UI-Arbeit
  geladen werden: React/Next.js-Komponenten, Seiten, Tailwind-Klassen, Layouts,
  Farben, Fonts, Buttons, Cards, Inputs, Focus-States, Animationen. EIN Design:
  „Regionen“ — Krafttraining in Scheibenfarben: warmes Hell und warmes Dunkel,
  jede Körperregion hat eine Farbe (Beine Rot, Druck Blau, Zug Gelb, Rumpf Grün
  wie die Wettkampf-Hantelscheiben), die durch Liste, Training, Fortschritt und
  Muskelkarte läuft; Archivo (breit für Titel, normal für Text, Tabellenziffern);
  Hauptaktionen in Tinte; Radius 20/14/Pille; keine Schatten; Kontrast Text
  ≥ 4,5:1, Bedienelemente ≥ 3:1; Bediensprache schlichtes Alltagsdeutsch.
  Enthält die echten Tokens, Rezepte, Regeln und Test-Anker. Werte hier
  nachschlagen statt erfinden.
---

# UI-Style — Design-System „Regionen“

Stack: **Next.js 14 App Router · React 18 · TypeScript strict · Tailwind 3.4 ·
Framer Motion 11 · lucide-react · `cn()` (clsx + tailwind-merge)**. Mobile-first
PWA, Container `max-w-md`, Touch-/Press-zentriert.

Die App heißt weiter **Platte 311**, der Coach **ATLAS**. Der Look heißt
„Regionen“ (Nutzer-Entscheid Nov 2026, Look C aus drei Entwürfen; vorher
„Platte 311 / Muybridge“).

## These

- **Farbe bedeutet etwas: die Körperregion einer Übung.** Beine, Druck, Zug,
  Rumpf haben je eine Farbe; dieselbe Farbe steht in der Übungsliste, im
  Übungskopf des Trainings, an der Satzkarte, im Fortschritt und in der
  Muskelkarte. Die Farben folgen den Wettkampf-Hantelscheiben (Rot 25 kg,
  Blau 20 kg, Gelb 15 kg, Grün 10 kg).
- **Alles andere ist Tinte auf warmem Papier** (hell) bzw. helle Tinte auf
  warmem Dunkel. Hauptaktionen sind Tinte-Flächen, keine Akzentfarbe.
- **Zwei Modi, eine Palette:** Hell ist Grundzustand, Dunkel über
  `data-theme="dark"`; Wahl in `settings.theme` (Hell/Dunkel/Auto),
  Laufzeit `applyTheme` (`lib/theme.ts`), Pre-Paint in `app/layout.tsx`.
  **Das Training folgt der Einstellung** — kein erzwungenes Dunkel mehr.
- **Immer Tokens, nie rohe Hex/feste Radien im JSX.** Ausnahmen: Bild-Routen
  (Icon, Startbilder), Startbild-CSS und `global-error.tsx` lesen keine
  CSS-Variablen und nehmen die Werte aus `lib/grundfarben.ts`.

## Farben — Tokens (hell / dunkel)

| Tailwind | CSS-Var | Hell | Dunkel | Zweck |
|---|---|---|---|---|
| `surface-0` | `--base` | `#F6F4EF` | `#13120F` | Grund |
| `surface-1` | `--card` | `#FFFFFF` | `#1D1B17` | Karten, Sheets, Zeilen |
| `surface-2` | `--surface-2` | `#ECE8E0` | `#2A2722` | eingelassen: Segment-Spur, Stepper, Chips |
| `line` | `--line` | `#DCD6CA` | `#34302A` | Linie auf dem Grund |
| `line-card` | `--line-card` | `#E8E3DA` | `#2E2A24` | Linie auf der Fläche |
| `fg` / `strong` | `--fg` / `--strong` | `#16140F` | `#F3F0E8` | Tinte: Text, Hauptaktion |
| `on-strong` | `--on-strong` | `#FFFFFF` | `#13120F` | Schrift auf Tinte-Fläche |
| `muted` | `--muted` | `#5A554B` | `#B8B1A2` | Nebentext (7,4:1 / 8,1:1 auf Fläche) |
| `faint` | `--faint` | `#6A6458` | `#A39C8D` | Hinweis, Meta (≥ 4,8:1) |
| `accent` | `--accent` | `#16140F` | `#F3F0E8` | Hauptaktion (= Tinte) |
| `accent-press` | `--accent-press` | `#2E2A22` | `#D9D4C8` | gedrückt |
| `on-accent` | `--on-accent` | `#FFFFFF` | `#13120F` | Schrift auf Hauptaktion |
| `accent-ink` | `--accent-ink` | `#16140F` | `#F3F0E8` | Aktiv-Markierung als Schrift |
| `info` | `--info` | `#2B5FB8` | `#7EA7F0` | Daten, Charts, Links |
| `fokus` | `--fokus` | `#2B5FB8` | `#7EA7F0` | Fokusring |
| `rekord` | `--rekord` | `#8A6100` | `#E3B341` | Rekorde, Bestwerte |
| `erfolg` | `--erfolg` | `#257A4C` | `#5CC28A` | erledigt, im Ziel |
| `warnung` | `--warnung` | `#A85500` | `#F0A04B` | über dem Ziel, Hinweis |
| `gefahr` | `--gefahr` | `#C7352B` | `#F07A6B` | Löschen, Fehler |
| `stufe-1..4` | `--stufe-1..4` | `#D9D2C3 #A99F8C #6E6656 #16140F` | `#3A362E #6E6656 #A99F8C #F3F0E8` | Muskel-Stufen I–IV |

**Regionen** (`lib/phasen/band.ts`: `regionOf(ex)`, `REGION_VAR`,
`REGION_FLAECHE`, `REGION_AUF`):

| Region | Marke/Schrift `region-*` | Fläche `region-*-flaeche` | Schrift auf Fläche |
|---|---|---|---|
| Beine (`unterkoerper`) | `#C7352B` / dunkel `#F07A6B` | `#C7352B` | weiß |
| Druck (`push`) | `#2B5FB8` / `#7EA7F0` | `#2B5FB8` | weiß |
| Zug (`pull`) | `#8F6700` / `#E3B341` | `#E3A600` | Tinte `#16140F` |
| Rumpf (`core`) | `#257A4C` / `#5CC28A` | `#257A4C` | weiß |
| Cardio | `faint` | `surface-2` | Tinte |

Marken (Balken 6 px, Punkt 8 px, Häkchen, Fortschrittsbalken) und farbige
Schrift nehmen `region-*`; große Flächen (Übungskopf) nehmen
`region-*-flaeche` mit `region-auf-*`. Die IWF-Tokens (`iwf-*`) zeigen auf
dieselben Scheibenfarben.

- **Kontrast ist Regel, nicht Geschmack:** Text ≥ 4,5:1 auf Grund und Fläche
  (WCAG 2.1, 1.4.3), Bedienelemente und Grafik ≥ 3:1 (1.4.11). Farbige Schrift
  nur auf Grund oder Fläche, nicht auf `surface-2` (hell 4,2–4,3:1).
  `npm run kontrast -- --streng` muss grün sein.
- Nicht gewählte Optionen sind voll lesbar (`fg` oder `muted`), nie blass;
  die Auswahl zeigt sich über Fläche (Tinte) oder Rand.

## Typografie

- **Eine Familie: Archivo** (`next/font/google`, variabel mit `wdth`-Achse),
  Variablen `--font-display`, `--font-body`, `--font-mono` zeigen alle darauf.
- `font-display` = Archivo **breit** (`font-stretch: 125%`, in globals.css),
  Gewicht 700/800, für Titel, Übungsköpfe, Restzeit, Wortmarke. **Nie kursiv.**
- Text: Archivo normal 400/500/600. Zahlen: `tabular-nums` (Pflicht bei
  Messwerten). `font-mono` bleibt als Klasse gültig und ist Archivo.
- Größen (Tailwind): `2xs` 12 px · `3xs` 12 px · `4xs` 11 px · `5xs` 10 px
  (nur Diagramm-Beschriftung) · `titel` 28 px · `readout` 44 px · `readout-lg` 64 px;
  dazu die Tailwind-Skala.
- **Labels/Kicker:** `text-3xs font-semibold uppercase tracking-label text-muted`
  (`tracking-label` = .08em). Versalien nur über CSS, DOM in Normalschreibung.
- **Knöpfe in Normalschreibung**, 700, ohne Sperrung.

## Form

- Radius: `rounded-card` **20 px** (Karten, Sheets, große Flächen),
  `rounded-inner` **14 px** (Zeilen, Stepper, Kacheln, Felder), `rounded-pill`
  (Knöpfe, Chips, Segmente, Schalter), `rounded-xs` **6 px** (Kleinteile,
  Balken-Segmente). Nichts anderes im JSX.
- **Keine Schatten, keine Verläufe, kein Blur.** Trennung über Flächen-Ton und
  Linien.

## Komponenten-Rezepte (`components/ui/`)

- **Button:** Pille, `font-bold`, Normalschreibung. `primary` Tinte-Fläche
  (`bg-accent text-on-accent`, `active:bg-accent-press`), `secondary` Rand
  `border-line` + `text-fg`, `ghost` `text-muted`, `danger` Rand + Schrift
  `gefahr`. Größen `lg` (h-14, 17 px) und `sm` (min-h-11, 15 px).
- **Card:** `rounded-card bg-surface-1 p-4`, ohne Rand und Schatten.
- **Chip** (Hinweis): Pille mit Rand `border-line`, `text-3xs`.
- **ChipToggle** (Mehrfachauswahl): Pille; aktiv `bg-strong text-on-strong`,
  inaktiv Rand `border-line` + `text-fg`; `aria-pressed`.
- **Segment** (genau eine Wahl): Spur `bg-surface-2 p-1`, Segment aktiv
  `bg-strong text-on-strong`, inaktiv `text-muted`; `aria-pressed`;
  Knopfname = sichtbarer Text (Test-Anker Ortsumschalter).
- **Toggle:** an `bg-strong`, aus `bg-surface-2`; `role="switch"`.
- **Kicker:** Label-Rezept oben. **PageHeader:** Kicker + Titel
  `font-display text-titel font-extrabold`.
- **Sheet:** `rounded-t-card bg-surface-1`, Griff `bg-line`, Titel
  `font-display text-2xl font-bold`, Scrim `var(--scrim)`; A11y und Ziehen
  unverändert; Wurzel `div.fixed` mit `data-sheet="‹Titel›"`.
- **Felder:** `rounded-inner border border-line bg-surface-1 px-3`,
  `text-base`, Fokus `focus-visible:ring-2 focus-visible:ring-fokus`.
- **Pressable / PressableLink:** Druck `scale .985`, Fokusring `ring-fokus`.
- **Toast:** `bg-strong text-on-strong rounded-pill`. **Skeleton:** `bg-surface-2`.
- **Fokus & Ziele:** immer `focus-visible:`, Ziele ≥ 44 px, `aria-pressed`
  an Auswahl, `disabled:opacity-40`.

## Signatur-Elemente

- **Regionsmarke:** Balken 6 × 44 px (Listen) oder Punkt 8 px (Zeilen,
  Unterzeilen) in `region-*`. Erledigt-Häkchen im Training als gefüllter Kreis
  in der Regionsfarbe.
- **Übungskopf im Training:** Fläche `region-*-flaeche`, Schrift
  `region-auf-*`, Figur in der Schriftfarbe, Titel `font-display font-extrabold`.
- **Phasenfiguren** (`components/phasen/PhasenFigur.tsx`): die
  Übungs-Piktogramme. Farbe = Region (Listen) oder Schrift auf Fläche
  (Übungskopf); **kein Raster**. Zoetrop nur im Training, Doppel-Gate
  `settings.zoetrope !== false` UND reduced-motion.
- **Phasenband:** Segmente je Satz in der Regionsfarbe, erledigt gefüllt,
  offen als Rand; Nummern nur ab Mindestbreite.
- **Navigation:** BottomNav mit 4 Reitern (Heute, Katalog, Fortschritt, ATLAS),
  je lucide-Symbol + Text 11 px; aktiv `text-fg`, inaktiv `text-faint`.

## Motion

Funktional und kurz: nur `transform`/`opacity`, 120–260 ms, Kurven aus
`lib/motion.ts` (`TRANSPORT_EIN`/`TRANSPORT_AUS`, `FILM`-Dauern). Zahlen springen
(keine Zähl-Animation). Reduced motion: Dauern 0. Was 100×/Tag passiert,
bewegt sich minimal.

## Sprache: Alltagsdeutsch in der Bedienung

Einheit · Satz · Pause · Rekord · Aufwärmen · Übung · Abschluss · Plan ·
ATLAS · Sprungtest · Wochen-Rückblick · Hell/Dunkel · Muskeln · Übungen. Keine
Laborsprache (Studie, Kader, Platte, belichtet, Verschlusszeit) in der
Oberfläche; Code-Bezeichner dürfen sie behalten. ATLAS-Protokollzeilen
`Beobachtung:` / `Einschätzung:` / `Plan:` / `Anpassung:` / `Hinweis:` müssen in
`app/api/atlas/chat/route.ts` und `components/coach/ProtokollBubble.tsx`
deckungsgleich bleiben. Deutsche Anführungszeichen „…“.

## Harte Regeln

- Keine Tailwind-Arbitrary-Values `[...]`; keine Slash-Opacity (`bg-black/50`).
- Kein Schatten, kein Verlauf, kein Glow, kein Blur.
- Dynamische Werte → inline `style`, SVG `var(--…)`, Framer Motion.
- Eine Komponente pro Datei, `cn()`, TypeScript strict. **Jedes neue
  Größen-/Radius-/Sperrungs-Token in `lib/utils.ts` (`extendTailwindMerge`)
  eintragen**, sonst verschluckt `cn()` Überschreibungen.
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

- **Aufbau von oben:** Kicker „Deine Einheit heute · Datum“ → Titel (Name der
  Einheit oder „Wo trainierst du heute?“) → Bestandszeile (`heute-bestand`) →
  **Wochenleiste** (Mo–So, trainierte Tage als Tinte-Kreis mit Haken, heute mit
  Rand, „2 von 3 Einheiten“) → Ort-Segment → Karte (Phasenband, Begründung,
  Plan-Quelle) → Übungszeilen (Regionsbalken 4 px, Figur 32 px, Name, „3 × 10–15
  Wdh · Muskel“ in der Regionsfarbe, Gewicht rechts) → Umbauen (Pillen) und
  Wunschfeld → Hinweiskarten → Wochenraster.
- **Zeit und Start im Dock über der Tab-Leiste** (`StartDock` per Portal in den
  `NavSlot` der AppShell): Stufen 20/30/45/60/90 und „frei“ (öffnet ein Blatt mit
  dem Feld — kein Eingabefeld im Dock), darunter „Training starten“. Nie während
  der Ortsfrage, nicht für eine erledigte Einheit; läuft eine Einheit, nur
  „Training fortsetzen“. Die AppShell misst Leiste + Dock und gibt dem Inhalt so
  viel Auslauf.
- Phasenband-Nummern nur, wenn der schmalste Kader ≥ 20 px breit ist (gemessen).

## Fortschritt und Übungsdetail

- **Übersicht:** Kopfzeile aus drei Kacheln (Bewegt gesamt · Level → LevelSheet ·
  Woche im Block → Blatt „Phase“), Volumen mit Segment „4 Wochen · 6 Monate ·
  1 Jahr“, Rekorde, Verläufe als Liste mit Mini-Kurve (`MiniKurve`) in der
  Regionsfarbe. Antippen öffnet das Übungsdetail im Reiter „Verlauf“. Große
  Kurven stehen nur im Übungsdetail.
- **Eine Quelle für Verläufe:** `lib/exercise-series.ts` (Art der Kennzahl über
  die ganze Historie wie bei den Rekorden). Gewichtswerte heißen immer
  „geschätztes 1RM“, mit dem gehobenen Satz daneben („1RM aus 25 kg × 8“).
- **Übungsdetail** (`GuideSheet`): oben Figur (Zoetrop) und Muskelkarte, Segment
  „Anleitung · Verlauf“; „Verlauf“ (`GuideVerlauf`) rechnet erst, wenn der
  Reiter offen ist: Bestwert, letzte drei Sätze, Kurve.
- **Muskeln:** Körperkarte, Sätze je Muskel mit Zielband und „Sätze/Ziel“,
  Muskel-Balance. Status-Farben immer mit Legende und Zahl.
- **Verlauf:** Titel zweizeilig (`line-clamp-2`), kein Papierkorb in der Karte;
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

- **Aufbau von oben:** Kopf (Schließen links, „Übung 2 von 6“, Restzeit; darunter
  das Phasenband in Regionsfarben, Tipp = Übersicht) → Übungskopf als Fläche
  `REGION_FLAECHE` mit Schrift `REGION_AUF` (Figur 56 px, Name `font-display`
  2xl, bei Wörtern > 12 Zeichen xl, Unterzeile „Muskel · Satz 1 von 3“; wischen
  blättert) → Pillen „Anleitung“ / „Tauschen“ → Satzliste → ATLAS → Blättern.
- **Satzliste:** Zeilen `rounded-inner bg-surface-1`, erledigt = gefüllter Kreis
  (`REGION_FLAECHE` + Haken `REGION_AUF`), kommend = leerer Kreis `border-line`.
  Die offene **Satzkarte** (`.set-active`, Ring 2 px in `REGION_VAR`) hat die
  Satz-Marke als Pille, rechts „Ziel 10–15 Wdh“ (Plan-Bereich), zwei Kacheln
  `bg-surface-2` für Gewicht und Wiederholungen (Ziffern `font-display` 4xl,
  − / + darunter), „Letztes Mal … · Rekord …“ und „Vorschlag … · Grund“.
  „Ziel“ = Plan, „Vorschlag“ = vorbelegte Werte; nie dasselbe Wort für beides.
- **Ein Dock, ein Wirt** (`SessionRunner`): unten fest, Inhalt ENTWEDER die
  Pause (`RestPanel`) ODER „Satz eintragen · 22,5 kg × 12“ (kommt per
  `createPortal` aus der Satzkarte, `components/session/DockSlot.tsx`). Keine
  Eingabefelder im Dock. Solange ein Feld den Fokus hat, ist das Dock
  unsichtbar (iOS-Tastatur). Wird es eng, kürzt sich das Wort, nie die Werte.
- **Feste Abstände zu `fixed`-Docks sind verboten — Höhe MESSEN**
  (ResizeObserver am Wirt → `paddingBottom` an `session-root`). Gilt für jedes Dock.
- **Pause:** Restzeit `font-display` readout, „von 1:30“, Balken in der
  Regionsfarbe, „Als Nächstes“ (gleiche Übung: „Satz 2 · 22,5 kg × 12“, sonst
  nächste offene Übung, Cardio in Minuten, zuletzt „Abschluss“), −15 s / +15 s /
  „Pause beenden“, dann die EINE Frage „Wie schwer war Satz N?“ mit Erklärzeile.
  `aria-live` sagt Start und Ende an, nicht jede Sekunde.
- Der Abschluss einer Übung gehört in die Bühne („Nächste Übung · ‹Name›“
  bzw. „Zum Abschluss“ direkt unter der Satzliste); „Nächste Übung“ nennt die
  nächste OFFENE Übung (`nextOpenItemIndex`), genau dorthin springt „Weiter“.
- Abschluss vor dem Speichern: Dauer · Sätze · Bewegt und je Übung eine Zeile;
  danach zeigt der Sieger-Moment Rekord, Level und ATLAS (keine Zahlen doppelt).
  Gewichtsrekorde zeigen den gehobenen Satz groß und „Geschätztes 1RM“
  beschriftet darunter, nie eine nackte e1RM-Zahl.
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

- **Zeichen:** vier Hantelscheiben (Rot, Blau, Gelb, Grün = die Regionen) auf
  heller Stange, eine Zeichnung für alles: `lib/marke-art.tsx` (Satori-tauglich:
  nur `<g>`/`<line>`, feste Hexwerte aus `lib/grundfarben.ts`), im DOM
  `components/brand/Marke.tsx` (Stange in `currentColor`).
- **Icon:** `lib/icon-art.tsx` auf `GRUND_DUNKEL`, komplett im
  Maskable-Kreis. Bei JEDER Änderung `ICON_VERSION` hochzählen und
  „ICON-FASSUNG N“ in `app/icon.tsx` und `app/apple-icon.tsx` mitziehen,
  dazu `CACHE` in `public/sw.js`.
- **Startbild:** eine Choreografie (Stange, vier Scheiben rasten ein,
  Wortmarke), kritisches Inline-CSS in `components/start/splash-css.ts`,
  Zeichen genau mittig bei 45 vw wie im iOS-Startbild
  (`app/apple-splash/[spec]`), Mindestzeit `MIN_MS` in `SplashGate`,
  Notausgang 4 s im Pre-Paint-Skript, reduzierte Bewegung = Standbild.
  Gespeicherte Werte v1/v2/v3/zufall zeigen alle dieses Startbild, „aus“ keins.
- **Teilen-Poster** (`lib/share-card.ts`): warmes Dunkel, Karte in der
  Regionsfarbe der Übung mit Figur, darunter der gehobene Satz groß und
  „Geschätztes 1RM … kg“ beschriftet.

## Test-Anker (`scripts/*.mjs`, Port 3199, Produktions-Build)

Änderung NUR zusammen mit dem Skript im selben Commit:

- Texte: „Deine Einheit heute“ · „Wo trainierst du heute?“ (Orts-Kacheln als
  Button, Name beginnt mit dem Ort) · „Training starten“ · „Bearbeiten“ ·
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
