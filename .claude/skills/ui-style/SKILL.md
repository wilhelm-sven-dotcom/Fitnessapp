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
