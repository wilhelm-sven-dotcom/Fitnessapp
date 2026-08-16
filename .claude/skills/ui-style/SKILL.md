---
name: ui-style
description: >-
  Verbindliches Design-System dieser Fitness-PWA. MUSS bei JEDER UI-Arbeit
  geladen werden: React/Next.js-Komponenten, Seiten, Tailwind-Klassen, Layouts,
  Farben, Fonts, Buttons, Cards, Inputs, Focus-States, Animationen. EIN Design:
  „München ’72" — deutsches Sportsystemdesign nach Aicher: heller Silbergrund
  (Dunkel als Variante über `data-theme`), flache Farbfelder, 1px-Hairline-
  Raster, Farbcode je Bereich (Blau/Orange/Grün/Gelb/Rot), Archivo +
  JetBrains Mono, Radius 12. Enthält die echten Tokens, Material-/Motion-
  Regeln und Don'ts gegen generische AI-Optik. Werte hier nachschlagen statt
  erfinden.
---

# UI-Style — Design-System „München ’72" (echte Werte aus dem Code)

Stack: **Next.js 14 App Router · React 18 · TypeScript strict · Tailwind 3.4 ·
Framer Motion 11 · lucide-react · `cn()` (clsx + tailwind-merge)**. Mobile-first
PWA, Container `max-w-md`, Touch-/Press-zentriert (kein Hover-First).

## EIN Design: „München ’72"

- Deutsches Sportsystemdesign nach Otl Aicher: **heller Silbergrund ist der
  Grundzustand**, flache satte Farbfelder statt Verläufen/Glows/Glas,
  1px-Hairlines (`--line`) tragen die Trennung. These: Training als System,
  nicht als Nachtclub.
- **Farbcode je Bereich (Wegleitsystem):** Blau = Heute/Session/Primär-CTA ·
  Orange = ATLAS/Coach/Live · Grün = Fortschritt/Erfolg/Volumen · Gelb =
  Warnung/über Ziel · Rot = Gefahr (sparsam). BottomNav-Tab, PageHeader-Quadrat
  und die Bereichsflächen tragen dieselbe Farbe.
- **`data-theme`** = `light` (Default) | `dark` (Anthrazit-Variante, gleiche
  Hues angehoben) auf `<html>`; pre-paint im No-Flash-Script (`app/layout.tsx`),
  Laufzeit über `applyTheme` (`lib/theme.ts`), Wahl in `settings.theme`.
- `settings.accentOverride` (hex) darf den Akzent app-weit ersetzen — der
  Provider setzt dann `--accent`/`--on-accent`/`--accent-ink` inline.
- **Immer Tokens nutzen, nie rohe Hex/feste Radien im JSX** (Ausnahme:
  SVG-Strokes dürfen `var(--…)` tragen; `global-error.tsx` ist eigenständig).

## Farben — Tokens (hell / dunkel), alle Paare WCAG-geprüft (≥ 4.5:1)

| Tailwind            | CSS-Var       | Hell      | Dunkel    | Zweck |
|---------------------|---------------|-----------|-----------|-------|
| `surface-0`         | `--base`      | `#f2f4f2` | `#14171a` | App-Hintergrund (Silber) |
| `surface-1`         | `--card`      | `#ffffff` | `#1b1f24` | DIE Panel-Fläche |
| `surface-2`         | `--surface-2` | `#e8ebe8` | `#22272c` | Inputs, Chips, eingelassen |
| `surface-3`/`line`  | `--line`      | `#d4d9d4` | `#2e343a` | Hairlines/Raster |
| `fg`                | `--fg`        | `#121619` | `#edf0f2` | Text |
| `muted`/`faint`     | `--muted`/`--faint` | `#4d5a5e`/`#5f6b73` | `#a3adb3`/`#808b92` | Sekundär/Tertiär |
| `strong`/`on-strong`| `--strong`/`--on-strong` | `#121619`/`#ffffff` | `#edf0f2`/`#14171a` | Mono-CTA / Text darauf |

## Bereichsfarben & Status

- `accent-sessions` = **`--accent`** Lichtblau `#0c6a99` / `#4aa9d9` — CTAs,
  Heute-Hero, DER Primärton.
- `coach` = **`--orange`** `#bc4708` / `#ff6a2a` — ATLAS-Bereich, Chat-Bubble,
  `live`-Marker („heute/empfohlen").
- `accent-volume` = **`--gruen`** `#0a7248` / `#33bf7f` — Fortschritt, Erfolg,
  Rekord-Badges, Charts.
- `accent-coverage` = `--orange` (Ring-/Abdeckungs-Semantik).
- **Status:** under `--accent` · in `--gruen` · over `--gelb` (`#956600`/`#f2b63c`)
  · danger `--rot` (`#bf2f1e`/`#ff5a47`).
- **Tinte auf Farbfeldern:** `text-on-accent` (Akzentfläche) bzw. `text-on-color`
  (Orange/Grün/Gelb/Rot-Fläche) — hell: Weiß, dunkel: Anthrazit. Nie `text-muted`
  auf farbigen Flächen.
- `accent-2` = neutrale Eyebrows/Labels (= muted).

## Fonts (via `next/font/google`, self-hosted — nur ZWEI Familien)

- `font-display` + `font-sans` (`--font-archivo`): **Archivo** (variable,
  Weiten-Achse) — Headings, Body, große Zahlen. Für Scoreboard-Ziffern
  (Countdown, Hero-Readouts) zusätzlich **`.stretch-display`** (font-stretch
  118 %) + `tabular-nums`.
- `font-mono` (`--font-jbmono`): **JetBrains Mono** — Eyebrows/Labels und
  Messwerte/Readouts (`tabular-nums` bei Zahlen Pflicht).
- Eyebrow-Muster: `font-mono text-xs uppercase tracking-widest text-accent-2`
  — im `PageHeader` mit vorangestelltem Bereichs-Quadrat (`h-2 w-2` +
  `backgroundColor: tone`). Headings `tracking-tight`.

## Material · Spacing · Radius · Schatten

- Tailwind-Default-Spacing (4px-Skala). Seiten-Container: `mx-auto max-w-md
  px-5 pt-5 pb-28`. Sektionsabstand `mb-4`/`mb-5`.
- **Radius = Token:** Karten/Buttons **`rounded-card`** (12px), Chips/Pills/
  Inputs **`rounded-pill`**, Icon-Buttons `rounded-full`, Mini-Marken
  (Streak-Quadrate, Badges) `rounded-sm`. Keine festen `rounded-2xl/3xl`.
- **DAS Panel-Rezept:** `rounded-card border border-line bg-surface-1
  shadow-card` — als `<Card>` (base/elevated/glass) oder identisch auf
  `<section>`, wo Semantik es verlangt. KEIN `bg-panel`/Verlauf mehr.
- Schatten: `shadow-card` (leiser Offset) / `shadow-card-lg` (schwebendes
  Chrome: Sheet, Toast). **Keine Glows, keine farbigen Halos, kein edge-top.**
- Farbfelder: `bg-accent-sessions text-on-accent` als Block (Heute-Hero);
  innere Zonen über `rgba(0,0,0,…)` via Inline-`style` abdunkeln.
- Browser-Oberflächen gehören zum Design: `::selection` und Caret tragen den
  Akzent (globals.css), Daten stehen in `tabular-nums`.

## Komponenten-Konventionen

- **Buttons: IMMER `components/ui/Button.tsx`** — Varianten `primary`
  (Blaufeld) / `strong` / `secondary` / `ghost` / `danger` (rote Schrift, kein
  roter Block); Größen `lg` (`rounded-card py-4 text-lg font-bold`, +
  `shadow-card-lg` bei primary/strong) / `sm` (`rounded-pill px-4 py-2.5
  text-sm font-medium`); `full` für Screen-CTAs. Basis ist `<Pressable>`
  (whileTap scale .97 + Fokus-Ring).
- **Card:** `components/ui/Card.tsx` statt Copy-Paste.
- **Input:** `rounded-pill bg-surface-2 px-3 py-2.5 text-sm text-fg
  placeholder:text-faint focus:outline-none focus-visible:ring-2
  focus-visible:ring-accent-sessions`.
- **Feedback:** `toast()` aus `lib/toast` (Erfolge transient; Fehler, die
  Kontext brauchen, inline). **Loading:** `<Skeleton>` statt Blank/Spinner
  (Puls nur bei echter Wartezeit). Wiederverwenden: `PageHeader` (mit `tone`),
  `EmptyState`, `Readout`, `Chip`, `Odometer`, `Sheet`, `Toaster`.
- **Focus:** `focus-visible:ring-2` (nie bloßes `focus:`). **Touch-Ziele ≥
  44px** — bei kleinen Icons `-m-2 h-11 w-11` (negative Margin frisst das
  Padding). Selected-States tragen `aria-pressed`. **Disabled:**
  `disabled:opacity-40`/`50`.
- Icons: lucide-react, `size={16..22}`, EIN Strichgewicht (CTA-Icon
  `strokeWidth={2.5}`); Muskel-Piktogramme aus `components/figures`.

## Motion — RUHE ist die Regel (Emil-Kowalski-Bar)

- **Navigation ist SOFORT:** keine Seiten-Übergänge (`PageTransition` bleibt
  Passthrough), keine Mount-Reveals/Stagger auf Seiten, keine Chart-Einzeichnung,
  keine Zähler beim Bloßen-Ansehen. Ausnahme: Welcome (einmalig) darf gestaffelt
  erscheinen.
- Animation NUR als Reaktion auf Nutzeraktion oder Datenänderung: Press-Scale,
  Satz-Abschluss, Rekord-Badge, Odometer, Listen-Mutation (AnimatePresence +
  Layout-FLIP), Sieger-Moment (Farbbalken-`Burst`).
- Dauer ≤ 200–300 ms; Enter/Exit `ease-out`; Fortschrittsbalken `linear`;
  **nie `transition-all`** — Properties benennen (`transition-[width]
  duration-1000 ease-linear`). Konstanten aus `lib/motion.ts` (`EASE_OUT`,
  `SPRING.press/panel/pop`) — nie lokal duplizieren.
- Nur `transform`/`opacity` animieren (GPU); Springs für Gesten (Sheet-Drag);
  Transitions statt Keyframes für alles schnell Auslösbare (Toasts!).
- **`prefers-reduced-motion` respektieren:** `useReducedMotion()` — Bewegung
  weg, Opacity darf bleiben; `initial={reduce ? false : …}`.

## HARTE Regeln (nicht verhandelbar)

- **Keine** Tailwind-Arbitrary-Values `[...]`-Werte (kein `w-[327px]`, kein
  `bg-[#123456]`); benannte Transition-Properties wie `transition-[width]`
  sind erlaubt.
- **Keine** Slash-Opacity (`bg-black/50`) — Token oder `rgba(...)` via `style`.
- **Kein** `animate-*` (Tailwind-Keyframes) — Bewegung über Framer Motion oder
  gezielte CSS-Transition bei Datenänderung.
- Dynamische Werte → inline `style`, SVG (`var(--…)` erlaubt), Framer Motion.
- Eine Komponente pro Datei, `cn()` fürs Klassen-Merging, TypeScript strict.
- UI-Texte **Deutsch**; deutsche Anführungszeichen „…" (kein rohes `"`/`'` im
  JSX-Text → react/no-unescaped-entities).

## Don'ts — gegen generische AI-Optik

- ❌ **Keine Glows, Verläufe, Glas-Deko, Neon** — das flache Farbfeld IST die
  Aussage. Keine Lila/Violett-Töne, keine Emojis als Icons (lucide nutzen).
- ❌ **Kein Inter / Roboto / „system default"** für Headings — Display = Archivo.
- ❌ Keine willkürlichen Schatten/Radien/Spacings — nur die definierten Tokens.
- ❌ Kein Zier-Theater: keine Splash-Screens, keine Load-Choreografie, keine
  Animationen „weil es geht". Jede Bewegung braucht einen Anlass (Frequenz-
  Regel: was 100×/Tag passiert, animiert nicht).
- ❌ Nicht Hover-zentriert denken (Touch-PWA); reduced-motion nie ignorieren.
- ✅ Leitbild: **ein Farbfeld mutig** (der blaue Heute-Hero, der Bereichscode),
  drumherum Silber, Hairlines und Disziplin — Systematik statt Stimmung.

## Interaktions-Konventionen Stufe 2 (Gym-Flow, Heatmap, Poster)

- **Stepper statt Tastatur** im Satz-Logbuch: −/+ als `Pressable` 44 px
  (`h-11 w-11 rounded-card bg-surface-2`), Gewicht in `settings.weightStep`,
  Wiederholungen ±1; Ticks lokal puffern, Provider-Commit debounct (350 ms);
  je Schritt Haptik `tick()`. Ein-Tap-Commit „Satz erledigt · X kg × Y" als
  `Button` full über den bestehenden `onReps`-Pfad (Erst-Commit-Semantik!).
- **Pausen-Dock**: die Satzpause ist ein FESTES Dock am unteren Rand
  (`fixed inset-x-0 bottom-0 z-30`, innen `mx-auto max-w-md px-5` +
  Safe-Area-`paddingBottom` inline), Panel-Rezept mit `shadow-card-lg`.
  Letzte 5 s: Zahl+Balken wechseln per Token auf `var(--gelb)`
  (`transition-colors`, Datenänderung = erlaubter Anlass); bei 0 EIN Puls
  (`scale [1, 1.04, 1]`, ≤200 ms, reduced-motion-gesichert) und der Zustand
  „Pause vorbei / Los" bleibt stehen — kein Auto-Unmount. Akustik wie im
  Aufwärmen: `beep()` ≤3 s, `beepEnd()` bei 0, ungated (cueVolume regelt);
  nur Sprache hängt an `voiceCues`. Container hinter dem Dock bekommt
  `pb-36`, solange die Pause lebt.
- **Layout-Ruhe auf der Bühne**: Zustands-Slots behalten ihre Höhe — der
  „Jetzt"-Block zeigt nach dem letzten Satz „Übung geschafft / Fertig",
  das ATLAS-Panel zeigt still „…" statt zu verschwinden (nur Cardio bleibt
  ohne Panel).
- **Muskel-Heatmap** (`MuscleHeatmapCard`): die EINE Heat-Wahrheit lebt in
  **`lib/heat.ts`** — `MUSCLE_BONES_HEAT`, `HEAT_STEPS` {35, 55, 78, 100},
  `heatStepFor` (Quartile auf `sets / volumeTargetFor(m).max`),
  `boneHeatSteps` (Kombi-Segmente = MAX, 0 = untrainiert) und `mixHex`
  (RGB-Lerp für Canvas). Die Card macht daraus `color-mix(in srgb,
  var(--gruen) X%, var(--surface-2))`; `CSS.supports`-Fallback binär
  (volles Grün), erst nach Mount aktivieren (SSR-stabil). Untrainiert =
  `var(--surface-2)`. IMMER mit der Fußnote „Schema, keine Anatomie".
  Spine wird unter `boneTint` zur Hairline; `boneWidth` lebt in figureData
  (Poster zeichnet mit denselben Stärken).
- **Share-Card** (`lib/share-card.ts`): 1080×1350 (4:5), Farben zur Laufzeit
  aus den Tokens (`getComputedStyle` → respektiert Theme + accentOverride),
  Schriften aus `--font-archivo`/`--font-jbmono` (`document.fonts.load`,
  System-Fallback ok), Zahlen de-DE, rounded-rect via arcTo (kein
  `ctx.roundRect` — altes iOS). Blob VORAB im Effekt rendern; Klick nutzt
  `navigator.canShare({files})` → Share-Sheet, sonst PNG-Download. Teilen
  gibt es NUR im Sieger-Moment (Frequenz-Regel).
- **PressableLink** ist die Navigations-Schwester von `Pressable`
  (motion(next/link), whileTap 0.97, `SPRING.press`) — für Tabs und
  Header-Icons; Icon-Ziele grundsätzlich 44 px (`h-11 w-11` bzw.
  `-m-2 h-11 w-11`, wenn das Raster kompakt bleiben soll).
- **Plattform-Basis** (globals.css): `-webkit-tap-highlight-color: transparent`,
  `touch-action: manipulation` auf Bedienelementen, `overscroll-behavior-y:
  none` am Dokument (Pull-to-Refresh bewusst geopfert), Formularschrift
  1rem gegen iOS-Zoom (an Feldern explizit `text-base`), `scroll-margin`
  für fokussierte Felder, Sheets `overscroll-contain`. Theme-Wechsel läuft
  als View-Transition-Crossfade in `applyTheme` (nur bei echtem Wechsel,
  reduced-motion-gesichert); `theme-color` wird pre-paint im No-Flash-Script
  gesetzt.
- **STICKY-FALLE:** Der Horizontal-Clip liegt NUR auf `body { overflow-x:
  hidden }` (propagiert zum Viewport, body bleibt scrollfrei). NIE
  `overflow-x-hidden` auf `html` oder einen inneren Wrapper legen — das
  macht den Wrapper zum toten Scrollport und entwaffnet jede
  `position:sticky`-Leiste stumm (App-Header, Trainings-Kopf).

## Interaktions-Konventionen Folgestufe (Trends, Sheets, Sticky, Poster)

- **TrendChart v2**: `points`-API (`{date?, value, label?}`) statt nackter
  Werte — mit lückenlosen Daten wird die x-Achse ZEITproportional
  (Trainingslücken ehrlich sichtbar), sonst Index-Fallback. Scrubbing nach
  BeforeAfter-Muster (setPointerCapture, `e.buttons > 0`), Wrapper
  `touch-pan-y select-none` (NIE `touch-none` — die Seite muss vertikal
  scrollbar bleiben); Auswahl = nächstliegender Punkt; Marker = leise
  Senkrechte + Ring; **Readout-Slot mit fester Höhe ÜBER dem SVG**
  (kein Layout-Sprung unterm Finger). Keine Animationen (Frequenz-Regel).
- **Aufklappen & springen**: Listen klappen per bedingtem Rendern auf
  (kein Höhen-Theater), Toggle trägt `aria-expanded`. Sprung zu einer
  Karte: Ref-Map + `pendingJump`-State — der Effekt scrollt NACH dem
  Commit (Ziel ist gemountet), `scroll-mt-20` gegen Sticky-Chrome,
  Highlight = `ring-2 ring-accent-volume` + `transition-shadow` für ~1,2 s
  (Nutzeraktion als Anlass), reduced motion scrollt `auto`.
- **Level-Sheet**: XP-Herleitung aus `trainingXpParts` (lib/achievements) —
  `trainingLevel` summiert intern DIESELBEN Teile (Single Source, kein
  Drift). Abzeichen aus `evaluateAchievements` als Hairline-Liste; Tier als
  Mono-Text-Chip (KEINE Metallfarben ins Token-System), gesperrt =
  `text-faint` + `h-1`-Progress in `bg-accent-volume`. Lazy rechnen
  (`open` in den useMemo-Deps).
- **Sticky-Trainings-Kopf** (SessionRunner): 1-px-Sentinel (`-mb-3 h-px`)
  + Wrapper `sticky top-0 z-20 -mx-5 px-5 pb-2` mit Safe-Area-paddingTop
  inline; IntersectionObserver auf dem Sentinel schaltet `glass border-b
  border-line` NUR im kondensierten Zustand (Rezept = App-Header). Der
  Observer-Effekt braucht `active?.phase` in den Deps — der Sentinel
  existiert erst im Übungs-Baum. z-Ordnung: 20 < Dock 30 < Sheets 50.
- **Listen-Gleiten**: Zeilen in `motion.div layout={reduce ? false :
  "position"}` (SPRING.panel) — NUR Translation. NIE `layoutId`-Morph über
  Zeilen ungleicher Höhe (Framer skaliert — Ring/Inputs verzerren).
- **Signalton-Rezept** (`lib/beep.ts`, API-stabil: beep/beepEnd/beepStart):
  Triangle-Oszillator + Lowpass (3·f, Q 0.8), Grundton 1568 Hz, Tick =
  Doppel-Puls (2 × 40 ms); Basis-Gains 0.22/0.30, Kappe 0.9, lazy
  DynamicsCompressor als Master-Bus. Beeps bleiben ungated (cueVolume regelt),
  nur Sprache hängt an voiceCues. Keine neuen Töne erfinden — transponieren.
- **Spotify-Ducking** (`useSpotifyDuck`): NUR in Countdown-Momenten
  (`duckFor(ms)` bei Pause left===5 bzw. Warmup-Drill 5 s/Wechsel 3 s über die
  WarmupPlayer-Prop `onCountdown` — der Player bleibt Spotify-frei). 40 % vom
  Ist-Wert, Floor 20; restore-once + Epoch + Unmount-Cleanup; Fehler → stiller
  5-min-Backoff. Setting `duckSpotify` (Default an, inert ohne Verbindung).
- **Aufwärmen = RAMP** (`lib/warmup.ts`): Katalog-Drills tragen `phase`
  (raise/mobilise/activate — Badge: Puls blau, Mobilität orange, Aktivierung
  grün), `patterns`, `priority`, `backLoad` (safe/neutral/deep), `equipment`.
  `warmupFor(items, lib, opts)` ist pur und deterministisch (FNV-Seed =
  Datum aus startedAt, am Call-Site memoisiert — NIE Math.random): Budget je
  Tagesform (450/360/270 s), Abdeckungsgarantie je Session-Muster, Core
  immer, Rücken-Ampel entfernt „deep" und ergänzt „safe". KEINE gehaltenen
  statischen Dehnungen in den Katalog aufnehmen (Simic 2013; McGowan 2015).
  Player-Dots werden ab >8 Drills kompakt.
- **Wochen-Poster** (share-card): mit `muscleVolumes` zeichnet
  `drawFigure` die zwei Heat-Figuren (FigurePanel-Rezept: Outline
  boneWidth+6 in Grundfarbe → Fill in `mixHex`-Tint → Spine → Kopf, round
  caps, Frame A, ohne Boden/Gerät); Tints aus `lib/heat`, Farben zur
  Laufzeit via cssVar. Die PR-Textzeile entfällt im Figuren-Layout (die
  grüne REKORDE-Spalte sagt es schon); ohne `muscleVolumes` bleibt das
  kompakte Alt-Layout (Rückwärtskompatibilität).

## Interaktions-Konventionen Video-Ära (Übungs-Guide, Warmup-Medien)

- **Übungs-Guide = Video statt Figuren**: Die Ausführungs-Strichfiguren sind
  BEWUSST entfernt (Nutzer-Urteil: zu ungenau) — der Guide zeigt das eigene
  YouTube-Video (exerciseVideos, default) und sonst Schritte-first plus die
  Einladungs-Karte („Video-Anleitung" / „YouTube-Link hinzufügen"). KEINE
  neuen Ausführungs-Figuren anlegen. Link-UI = geteilte Komponente
  `VideoLinkEditor` ({url, offline, prominent?, onChange}, parent setzt
  `key` auf die Id); Offline-Status via `useOffline()` (lib/use-offline).
- **Figuren-System nur noch**: Warmup-Player + WarmupDrillSheet (animiert)
  und Muskel-Heatmap/Poster (`FIG.squat_bw` frozen, Frame A byte-stabil!).
  FigurePanel-Props: `periodMs?` (Tempo je Drill, Default 2600) und
  `FigureDef.cycle` (Sägezahn-Kreisloop, z. B. Pedaltritt/Schulterkreisen —
  Sequenz wird intern [..frames, frames[0]]). Autoren-Regeln: Frame 0 = die
  charakteristische Pose (reduced motion friert dort ein), identisches
  Punkt-Key-Set je Frame, A/B = frames[0]/[last]. figFor/FIGURE_ALIAS/
  PATTERN_FIGURE/muscleBones existieren nicht mehr.
- **Warmup-Drill-Videos**: `warmupVideos` (KEYS.warmupVideos, Spiegel von
  exerciseVideos: byKey-LOCAL-wins-Merge, sanitizeVideoMap, Export additiv).
  Verwaltung NUR auf /uebungen (WarmupCatalogSection → WarmupDrillSheet),
  nie im laufenden Player. Player: Media-Card mit EIGENEM
  `key={showing.id}` VOR dem phasen-keyed Block — `showing` ist im Wechsel
  schon der nächste Drill, das muted iframe buffert im 5-s-Fenster und
  remountet beim Drill-Start nicht. `youtubeEmbedUrl(raw, {autoplay, loop})`
  bleibt ohne opts byte-identisch; mute=1 immer (Beeps + Ducking hörbar).
