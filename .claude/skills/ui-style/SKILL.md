---
name: ui-style
description: >-
  Verbindliches Design-System dieser Fitness-PWA. MUSS bei JEDER UI-Arbeit
  geladen werden: React/Next.js-Komponenten, Seiten, Tailwind-Klassen, Layouts,
  Farben, Fonts, Buttons, Cards, Inputs, Focus-States, Animationen. EIN Design:
  „Ruhig & fokussiert" — dunkles, geschliffenes Instrument in Bernstein
  (#ff9f0a), Sora + JetBrains Mono, Radius 16, erhabene ruhige Panels;
  Hell-Modus über `data-theme`. Enthält die echten Tokens, Spacing-/Radius-/
  Shadow-Konventionen, Motion-Regeln und Don'ts gegen generische AI-Optik.
  Werte hier nachschlagen statt erfinden.
---

# UI-Style — Design-System (echte Werte aus dem Code)

Stack: **Next.js 14 App Router · React 18 · TypeScript strict · Tailwind 3.4 ·
Framer Motion 11 · lucide-react · `cn()` (clsx + tailwind-merge)**. Mobile-first
PWA, Container `max-w-md`, Touch-/Press-zentriert (kein Hover-First).

## EIN Design: „Ruhig & fokussiert"

- Dunkles, geschliffenes Instrument: radialer Seiten-Hintergrund, runde Ecken
  (`--radius-card` 16px), erhabene Panels (Verlauf + Schatten), EIN Akzent
  **Bernstein `--accent #ff9f0a`**, Display **Sora**, Labels/Daten
  **JetBrains Mono**. Keine Skins mehr — `data-skin` existiert nicht.
- **`data-theme`** = `dark` (Default) | `light` auf `<html>`; pre-paint im
  No-Flash-Script (`app/layout.tsx`), Laufzeit über `applyTheme` (`lib/theme.ts`),
  Wahl in `settings.theme`. Light überschreibt NUR Neutrals (Identität bleibt).
- `settings.accentOverride` (hex) darf den Akzent app-weit ersetzen — der
  Provider setzt dann `--accent`/`--on-accent`/`--accent-ink` inline.
- **Immer Tokens nutzen, nie rohe Hex/feste Radien im JSX** (Ausnahme:
  SVG-Strokes / `lib/ring-colors.ts`).

## Farben — Tokens (dark / light)

| Tailwind            | CSS-Var       | Dark      | Light     | Zweck |
|---------------------|---------------|-----------|-----------|-------|
| `surface-0`         | `--base`      | `#0e0f12` | `#f2f3f5` | App-Hintergrund |
| `surface-1`         | `--card`      | `#16181d` | `#ffffff` | flache Fläche |
| `surface-2`         | `--surface-2` | `#1b1e24` | `#e9ebef` | Inputs, Chips |
| `surface-3`/`line`  | `--line`      | `#262a33` | `#d8dce3` | Hairlines/Border |
| `fg`                | `--fg`        | `#eceef2` | `#14171c` | Text |
| `muted`/`faint`     | `--muted`/`--faint` | `#9aa1ac`/`#5e626b` | `#54606e`/`#6b7280` | Sekundär/Tertiär |
| `strong`/`on-strong`| `--strong`/`--on-strong` | `#eceef2`/`#0e0f12` | `#14171c`/`#ffffff` | Mono-CTA / Text darauf |

## Akzente & Status

- `accent-sessions` = **`--accent` `#ff9f0a`** (Bernstein) — CTAs, Signatur, der
  EINE kräftige Moment pro Screen.
- `accent-2` = **`--accent-2`** = neutral (`#9aa1ac`) — Eyebrows/Labels bleiben ruhig.
- `live` = **`--live` `#ff375f`** = „heute/empfohlen"-Marker (sparsam!).
- `accent-ink` = Akzent als Vordergrund-Marke; im Light-Modus vertieft
  (`#b3700a`), damit er auf Hell lesbar bleibt. `on-accent` = dunkle Tinte auf
  Bernstein.
- Feste Metrik-Farben (Ring-/Status-Semantik): `accent-volume #30d158` (grün) ·
  `accent-coverage #0a84ff` (blau). **Status:** under `#0a84ff` · in `#30d158` ·
  over `#ff9f0a` · danger `#ff375f`.
- SVG-Strokes (Rings/Charts): rohe Hex aus `lib/ring-colors.ts` erlaubt;
  akzent-adaptive SVGs nutzen `var(--accent)` etc.

## Fonts (via `next/font/google`, self-hosted — nur ZWEI Familien)

- `font-display` + `font-sans` (`--font-sora`): **Sora** — Headings, große
  Zahlen, Body.
- `font-mono` (`--font-jbmono`): **JetBrains Mono** — Eyebrows, Labels,
  Daten/Readouts.
- Eyebrow-Muster: `font-mono text-xs uppercase tracking-widest text-accent-2`
  (oder `text-faint`/`text-muted`). Zahlen `tabular-nums`. Headings `tracking-tight`.

## Spacing · Radius · Shadows · Gradients

- Tailwind-Default-Spacing (4px-Skala). Seiten-Container: `mx-auto max-w-md px-5 pt-5 pb-28`. Sektionsabstand `mb-4`/`mb-5`.
- **Radius = Token**: Cards/Hero/Buttons **`rounded-card`** (16px), Chips/Pills/
  Inputs **`rounded-pill`** (999px), Icon-Buttons `rounded-full`. Keine festen
  `rounded-2xl/3xl/xl` für Flächen.
- Panels = **`bg-panel`** (Verlauf) + **`shadow-card`**/**`shadow-card-lg`**
  (erhaben). Glows `shadow-glow-sessions|volume|coverage`, `.glow-accent`
  (Akzent-Glow), `.edge-top` (Material-Oberkante).
- Gradient-Utilities: `bg-hero-sheen`, `bg-hero-accent`. Seiten-Hintergrund
  (Radial) kommt aus `body` via `--page-bg` — nicht pro Seite setzen.
- `.set-active` (globals.css) hebt den aktiven Satz als geschliffenen Chip.

## Komponenten-Konventionen

- **Primär-CTA (eine kräftige Stelle):** `bg-accent-sessions text-on-accent rounded-card py-4 text-lg font-bold shadow-card-lg` (klein: `rounded-pill py-2.5 text-sm font-medium`). Mono-Alternative: `bg-strong text-on-strong`.
- **Sekundär:** `bg-surface-2 text-fg rounded-pill py-2.5 text-sm font-medium`.
- **Card:** `components/ui/Card.tsx` (`base` / `elevated` / `glass`) statt Copy-Paste; sonst `rounded-card border border-line bg-panel shadow-card p-4`.
- **Input:** `rounded-pill bg-surface-2 px-3 py-2.5 text-sm text-fg placeholder:text-faint focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-sessions`.
- **Button-Basis:** `components/ui/pressable.tsx` (`<Pressable>`, Framer-Motion `whileTap scale .97`).
- **Wiederverwenden:** `PageHeader` (Eyebrow+Titel), `EmptyState`, `Readout`, `Chip`, `Odometer`, `Sheet`.
- **Focus:** `focus-visible:ring-2 focus-visible:ring-accent-sessions`. **Hover:** dezent (`transition-colors`) — Feedback primär über Press. **Disabled:** `disabled:opacity-40`/`50`.
- Icons: lucide-react, `size={16..22}` (Akzent-CTA-Icon `strokeWidth={2.5}`).

## Motion — RUHE ist die Regel

- **Navigation ist SOFORT**: keine Seiten-Übergangsanimationen, keine
  Stagger-Reveals beim Mounten, kein Typewriter, keine Zähler, die bei jedem
  Besuch hochrollen. `PageTransition` ist ein Passthrough — so bleibt es.
- Animation NUR als Reaktion auf Nutzeraktion oder Datenänderung: Satz
  abgeschlossen (Ring-Pop, Flash), Rekord (Badge), Wert geändert (Odometer
  rollt zur neuen Zahl), Sieger-Moment nach dem Speichern.
- Dauer ≤ 200 ms für Micro-Feedback (Ausnahme: bewusste Feier-Momente wie
  SessionComplete). Konstanten aus `lib/motion.ts`: `EASE_OUT`, `SPRING.press/panel/pop`.
- **prefers-reduced-motion respektieren:** Framer `useReducedMotion()` — bei
  reduce keine Auto-/Loop-Animationen, Endzustand sofort.

## HARTE Regeln (nicht verhandelbar)

- **Keine** Tailwind-Arbitrary-Values `[...]` (kein `w-[327px]`, kein `bg-[#123456]`, kein `text-[0.7rem]`).
- **Keine** Slash-Opacity (`bg-black/50`) — Token oder `rgba(...)` via `style`.
- **Kein** `animate-*` (Tailwind-Keyframes) — Bewegung ausschließlich über Framer-Motion (oder gezielte CSS-Transition bei Datenänderung).
- Dynamische Werte → inline `style`, SVG (inkl. `<linearGradient>`/`<filter>`), Framer-Motion oder vordefinierte Utilities (`boxShadow`/`backgroundImage`).
- Eine Komponente pro Datei, `cn()` fürs Klassen-Merging, TypeScript strict (kein `any` ohne Grund).
- UI-Texte **Deutsch**; deutsche Anführungszeichen „…" (kein rohes `"`/`'` im JSX-Text → react/no-unescaped-entities).

## Don'ts — gegen generische AI-Optik

- ❌ **Keine Lila/Violett-Verläufe**, kein Glas-/Neon-Overload, keine Emojis als Icons (lucide nutzen).
- ❌ **Kein Inter / Roboto / „system default"** für Headings — Display = Sora.
- ❌ Keine willkürlichen Schatten/Radien/Spacings — nur die definierten Tokens.
- ❌ Kein Zier-Theater: keine Splash-Screens, keine künstlichen Wartezeiten,
  keine Animationen „weil es geht". Jede Bewegung braucht einen Anlass.
- ❌ Nicht Hover-zentriert denken (Touch-PWA); reduced-motion nie ignorieren.
- ✅ Leitbild: **eine Signatur mutig** (der Bernstein-Tacho), drumherum ruhig &
  diszipliniert — ein gezielter Akzent, große `font-display`-Zahlen, viel Ruhe.
