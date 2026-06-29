---
name: ui-style
description: >-
  Verbindliches Design-System dieser Fitness-PWA. MUSS bei JEDER UI-Arbeit geladen
  werden: React/Next.js-Komponenten, Seiten, Tailwind-Klassen, Layouts, Farben,
  Fonts, Buttons, Cards, Inputs, Hover-/Focus-States, Animationen. Drei umschaltbare
  Skins (Blueprint = Stahl/Rot/Archivo/scharf · Tactile = Bernstein/Sora/rund/Tiefe (Default)
  · Editorial = Knochen/Rot/Anton+Serif/Magazin) über `data-skin`. Enthält die echten Tokens, Spacing-/Radius-/Shadow-Konventionen,
  Motion-Regeln und Don'ts gegen generische AI-Optik. Werte hier nachschlagen statt erfinden.
---

# UI-Style — Design-System (echte Werte aus dem Code)

Stack: **Next.js 14 App Router · React 18 · TypeScript strict · Tailwind 3.4 ·
Framer Motion 11 · lucide-react · `cn()` (clsx + tailwind-merge)**. Mobile-first
PWA, Container `max-w-md`, Touch-/Press-zentriert (kein Hover-First).

## Drei Skins + Theme (zwei orthogonale Achsen auf `<html>`)
- **`data-skin`** = `blueprint` | `tactile` (Default) | `editorial`. **`data-theme`** = `dark` (Default) | `light`.
  Beide pre-paint im No-Flash-Script (`app/layout.tsx`) gesetzt; Laufzeit über
  `applySkin` / `applyTheme` + `SKINS` in `lib/theme.ts`; Wahl in `settings.skin`/`.theme`.
- **Der Skin besitzt den Akzent** (kein nutzerwählbarer Farbpicker mehr). Jeder Skin
  definiert in `app/globals.css` den **vollen Token-Satz**: Neutrals, `--accent`/`--accent-2`/
  `--live`, Fonts, `--radius-card`/`-pill`, `--panel-bg`/`--panel-shadow`, Seiten-Hintergrund.
- **Blueprint** — Werkstatt/Messgerät: Mess-Raster-Hintergrund, Haarlinien, **scharfe Ecken
  (`--radius-card` 4px)**, flache Panels, Stahl `--accent-2 #6e90be` + Rot `--accent #ff375f`,
  Display **Archivo**.
- **Tactile** (Default) — geschliffenes Instrument: radialer Hintergrund, **runde Ecken (16px)**,
  erhabene Panels (Verlauf + Schatten), Bernstein `--accent #ff9f0a`, neutrales `--accent-2`, Display **Sora**.
- **Editorial** — Magazin: ruhiger near-black BG, **fast scharf (`--radius-card` 2px)**, flache
  Panels (Haarlinien), Knochen `--fg #e8e2d6` + Rot `--accent #ff375f`, Display **Anton**, Body
  **Newsreader** (Serif), Labels/Zahlen **Inter** (`--font-mono`).
- **Immer Tokens nutzen, nie rohe Hex/feste Radien im JSX** (Ausnahme: SVG-Strokes /
  `lib/ring-colors.ts`) — nur so folgen alle drei Skins automatisch.
- **Skin-Signatur:** Komponente rendert alle Varianten, eingeblendet per `.only-blueprint`/
  `.only-tactile`/`.only-editorial` (siehe `VolumeGauge`).

## Farben — Tokens (Werte je Skin, dark)
| Tailwind            | CSS-Var       | Blueprint            | Tactile               | Zweck |
|---------------------|---------------|----------------------|-----------------------|-------|
| `surface-0`         | `--base`      | `#0c0e12`            | `#0e0f12`             | App-Hintergrund |
| `surface-1`         | `--card`      | `#11141a`            | `#16181d`             | flache Fläche |
| `surface-2`         | `--surface-2` | `#171b22`            | `#1b1e24`             | Inputs, Chips |
| `surface-3`/`line`  | `--line`      | `#222b38`            | `#262a33`             | Hairlines/Border |
| `fg`                | `--fg`        | `#e8ecf2`            | `#eceef2`             | Text |
| `muted`/`faint`     | `--muted`/`--faint` | `#8a93a3`/`#566173` | `#9aa1ac`/`#5e626b` | Sekundär/Tertiär |
| `strong`/`on-strong`| `--strong`/`--on-strong` | `#e8ecf2`/`#0c0e12` | `#eceef2`/`#0e0f12` | Mono-CTA / Text darauf |

> `[data-theme="light"]` überschreibt **nur** die Neutrals (Identität — Akzent/Fonts/Radius/Panel —
> bleibt vom Skin). Token-Namen sind in beiden Skins gleich; nur die Werte wechseln.

## Akzente & Status
- `accent-sessions` = **`--accent`** = Skin-Akzent (Blueprint **Rot #ff375f** · Tactile **Bernstein #ff9f0a**) — CTAs, Signatur.
- `accent-2` = **`--accent-2`** = Sekundär/Struktur (Blueprint **Stahl #6e90be** für Labels/Ticks · Tactile neutral).
- `live` = **`--live` `#ff375f`** in beiden = „heute/empfohlen"-Highlight (Eyebrow + Marker).
- Feste Metrik-Farben (skin-unabhängig, Ring-/Status-Semantik): `accent-volume #30d158` (grün) ·
  `accent-coverage #0a84ff` (blau). **Status:** under `#0a84ff` · in `#30d158` · over `#ff9f0a` · danger `#ff375f`.
- SVG-Strokes (Rings/Charts): rohe Hex aus `lib/ring-colors.ts` erlaubt; skin-adaptive SVGs nutzen `var(--accent)` etc.

## Fonts (Pairing — kein Inter!) — via `next/font/google`, self-hosted
- `font-display` (`--font-display`): **Archivo** (Blueprint) / **Sora** (Tactile) — Headings, große Zahlen, Wortmarke.
- `font-sans` (`--font-body`): wie Display je Skin (Archivo/Sora), dann Apple-System-Fallback.
- `font-mono` (`--font-mono`): **JetBrains Mono** (beide Skins) — Eyebrows, Labels, Daten/Readouts.
- Eyebrow-Muster: `font-mono text-xs uppercase tracking-widest text-accent-2` (oder `text-faint`/`text-muted`). Zahlen `tabular-nums`. Headings `tracking-tight`.

## Spacing · Radius · Shadows · Gradients
- Tailwind-Default-Spacing (4px-Skala). Seiten-Container: `mx-auto max-w-md px-5 pt-5 pb-28`. Sektionsabstand `mb-4`/`mb-5`.
- **Radius = Token** (Skin entscheidet scharf vs. rund): Cards/Hero/Buttons **`rounded-card`**, Chips/Pills/Inputs **`rounded-pill`**, Icon-Buttons `rounded-full`. **Keine festen `rounded-2xl/3xl/xl` mehr für Skin-Flächen.**
- Panels = **`bg-panel`** (`--panel-bg`: flach Blueprint / Verlauf Tactile) + **`shadow-card`**/**`shadow-card-lg`** (skin-getrieben: Haarlinie vs. erhaben). Glows `shadow-glow-sessions|volume|coverage`, `.glow-accent` (Akzent-Glow), `.edge-top` (Material-Oberkante).
- Gradient-Utilities: `bg-hero-sheen` (skin-Sheen), `bg-hero-accent`. Seiten-Hintergrund (Raster/Radial) kommt aus `body` via `--page-bg` — nicht pro Seite setzen.

## Komponenten-Konventionen
- **Primär-CTA (eine kräftige Stelle):** `bg-accent-sessions text-on-strong rounded-card py-4 text-lg font-bold shadow-card-lg` (klein: `rounded-pill py-2.5 text-sm font-medium`). Mono-Alternative: `bg-strong text-on-strong`.
- **Sekundär:** `bg-surface-2 text-fg rounded-pill py-2.5 text-sm font-medium`.
- **Card:** `components/ui/Card.tsx` (`base` / `elevated` / `glass`) statt Copy-Paste; sonst `rounded-card border border-line bg-panel shadow-card p-4`.
- **Input:** `rounded-pill bg-surface-2 px-3 py-2.5 text-sm text-fg placeholder:text-faint focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-sessions`.
- **Button-Basis:** `components/ui/pressable.tsx` (`<Pressable>`, Framer-Motion `whileTap scale .97`).
- **Wiederverwenden:** `PageHeader` (Eyebrow+Titel), `EmptyState`, `Readout`, `Chip`, `Reveal`.
- **Skin-spezifische UI (Signatur):** beide Varianten rendern und per **`.only-blueprint` / `.only-tactile`** einblenden (CSS, `data-skin`, SSR-sicher, kein JS-Branch) — siehe `components/home/VolumeGauge.tsx`.
- **Focus:** `focus-visible:ring-2 focus-visible:ring-accent-sessions`. **Hover:** dezent (`transition-colors`) — Feedback primär über Press. **Disabled:** `disabled:opacity-40`/`50`.
- Icons: lucide-react, `size={16..22}` (Akzent-CTA-Icon `strokeWidth={2.5}`).

## Motion
- Konstanten aus `lib/motion.ts`: `EASE_OUT = [0.22,1,0.36,1]`, `SPRING.press/panel/pop`.
- Seitenwechsel über `PageTransition` (fade + y). Eintritte dezent (`opacity` + 8–12px `y`), gestaffelt mit kleinen `delay`-Schritten.
- **prefers-reduced-motion respektieren:** Framer-Motion `useReducedMotion()` — bei reduce keine Auto-/Loop-Animationen.

## HARTE Regeln (nicht verhandelbar)
- **Keine** Tailwind-Arbitrary-Values `[...]` (kein `w-[327px]`, kein `bg-[#123456]`, kein `text-[0.7rem]`).
- **Keine** Slash-Opacity (`bg-black/50`) — Token oder `rgba(...)` via `style`.
- **Kein** `animate-*` (Tailwind-Keyframes) — Bewegung ausschließlich über Framer-Motion.
- Dynamische Werte → inline `style`, SVG (inkl. `<linearGradient>`/`<filter>`), Framer-Motion oder vordefinierte Utilities (`boxShadow`/`backgroundImage`).
- Eine Komponente pro Datei, `cn()` fürs Klassen-Merging, TypeScript strict (kein `any` ohne Grund).
- UI-Texte **Deutsch**; deutsche Anführungszeichen „…" (kein rohes `"`/`'` im JSX-Text → react/no-unescaped-entities).

## Don'ts — gegen generische AI-Optik
- ❌ **Keine Lila/Violett-Verläufe**, kein Glas-/Neon-Overload, keine Emojis als Icons (lucide nutzen).
- ❌ **Kein Inter / Roboto / „system default"** für Headings — Display = Archivo (Blueprint) / Sora (Tactile).
- ❌ Keine festen Radien/Farben/Fonts im JSX, die einen Skin „einfrieren" — immer Tokens, damit beide Skins folgen.
- ❌ Keine willkürlichen Schatten/Radien/Spacings — nur die definierten Tokens.
- ❌ Nicht Hover-zentriert denken (Touch-PWA); reduced-motion nie ignorieren.
- ✅ Leitbild: **eine Signatur mutig** (Blueprint-Messgerät / Tactile-Tacho), drumherum ruhig & diszipliniert — ein gezielter Akzent, große `font-display`-Zahlen, viel Ruhe.
