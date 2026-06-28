---
name: ui-style
description: >-
  Verbindliches Design-System dieser Fitness-PWA. MUSS bei JEDER UI-Arbeit geladen
  werden: React/Next.js-Komponenten, Seiten, Tailwind-Klassen, Layouts, Farben,
  Fonts, Buttons, Cards, Inputs, Hover-/Focus-States, Animationen. Enthält die
  echten Tokens (Graphit-Dark-Default, Apple-Rot-Akzent #ff375f, Amber #ff9f0a,
  Space Grotesk), Spacing-/Radius-/Shadow-Konventionen, Motion-Regeln und Don'ts
  gegen generische AI-Optik. Werte hier nachschlagen statt erfinden.
---

# UI-Style — Design-System (echte Werte aus dem Code)

Stack: **Next.js 14 App Router · React 18 · TypeScript strict · Tailwind 3.4 ·
Framer Motion 11 · lucide-react · `cn()` (clsx + tailwind-merge)**. Mobile-first
PWA, Container `max-w-md`, Touch-/Press-zentriert (kein Hover-First).

## Theme & Dark Mode
- **Dark ist Default.** `<html data-theme="dark">`, Umschaltung `dark | light | system`.
- Tokens als CSS-Variablen in `app/globals.css`, gemappt in `tailwind.config.ts`.
  **Immer Tokens nutzen, nie rohe Hex im JSX** (Ausnahme: SVG-Strokes / `lib/ring-colors.ts`).
- `--accent` ist nutzerwählbar: No-Flash-Inline-Script in `app/layout.tsx`,
  `applyTheme` + `ACCENTS` in `lib/theme.ts`.

## Farben — Graphit-Neutrals (dark / light)
| Tailwind            | CSS-Var       | Dark                 | Light                  | Zweck |
|---------------------|---------------|----------------------|------------------------|-------|
| `surface-0`         | `--base`      | `#0a0a0a`            | `#f4f4f6`              | App-Hintergrund |
| `surface-1`         | `--card`      | `#161618`            | `#ffffff`              | Karten |
| `surface-2`         | `--surface-2` | `#1f1f23`            | `#ececef`              | Inputs, Chips |
| `surface-3`/`line`  | `--line`      | `#2a2a30`            | `#e2e2e7`              | Hairlines |
| `fg`                | `--fg`        | `#f5f5f5`            | `#18181b`              | Text |
| `muted`             | `--muted`     | `#a1a1aa`            | `#52525b`              | Sekundärtext |
| `faint`             | `--faint`     | `#6b7280`            | `#9ca3af`              | Tertiär/Labels |
| `strong`            | `--strong`    | `#f5f5f5`            | `#18181b`              | Primär-CTA-Fläche |
| `on-strong`         | `--on-strong` | `#0a0a0a`            | `#ffffff`              | Text auf strong/Akzent |
| `glass` (`.glass`)  | `--glass`     | `rgba(22,22,24,.72)` | `rgba(255,255,255,.72)`| Frosted Chrome |

## Akzente & Status (Apple-Fitness-Multicolor)
- **Brand-Akzent (Default): Apple-Rot `#ff375f`** = `--accent` = `accent-sessions`
  (nutzerwählbar: rot · orange `#ff9f0a` · grün `#30d158` · blau `#0a84ff` · violett `#bf5af2` · pink `#ff2d92`).
- Feste Metrik-Farben: `accent-volume` `#30d158` (grün), `accent-coverage` `#0a84ff` (blau).
- **Status:** under `#0a84ff` · in `#30d158` · **over/Warnung `#ff9f0a` (Amber)** · danger `#ff375f`.
  → Das ist „Amber": Über-Ziel/Warn-Status (und als Akzent „orange" wählbar). **Default-Brand ist Rot, nicht Amber.**
- SVG-Strokes (Rings/Charts): rohe Hex aus `lib/ring-colors.ts` erlaubt (`RING.move/exercise/stand`, Track `#2a2a30`).

## Fonts (Pairing — kein Inter!)
- `font-sans` (Body/Default): **Apple-System-Stack** — `-apple-system, BlinkMacSystemFont, SF Pro Display/Text, Segoe UI, system-ui`.
- `font-display` (Headings, große Zahlen, Wortmarke): **Space Grotesk** (self-hosted woff2, `var(--font-display)`, `app/fonts/`).
- `font-mono` (Eyebrows/Labels/Zahlen): SF Mono / Menlo / Monaco.
- Eyebrow-Muster: `font-mono text-xs uppercase tracking-widest text-muted`. Zahlen `tabular-nums`. Headings `tracking-tight`.

## Spacing · Radius · Shadows · Gradients
- Tailwind-Default-Spacing (4px-Skala). Seiten-Container: `mx-auto max-w-md px-5 pt-5 pb-28`. Sektionsabstand `mb-4`/`mb-5`.
- Radius: Cards `rounded-2xl`, Hero `rounded-3xl`, Buttons/Inputs `rounded-xl`/`rounded-2xl`, Chips `rounded-lg`, Icon-Buttons/Pills `rounded-full`.
- Shadows (nur diese, nicht erfinden): `shadow-card`, `shadow-card-lg`, Glows `shadow-glow-sessions|volume|coverage`.
- Gradient-Utilities: `bg-hero-sheen` (weicher weißer Sheen), `bg-hero-accent` (rötlicher Radial-Glow). Weitere Verläufe via inline `style`.

## Komponenten-Konventionen
- **Primär-CTA:** `bg-strong text-on-strong rounded-2xl py-4 text-lg font-semibold shadow-card-lg` (klein: `rounded-xl py-2.5 text-sm font-medium`).
- **Sekundär:** `bg-surface-2 text-fg rounded-xl py-2.5 text-sm font-medium`.
- **Card:** `components/ui/Card.tsx` (Varianten `base` / `elevated` / `glass`) statt Copy-Paste; sonst `rounded-2xl border border-surface-3 bg-surface-1 shadow-card p-4`.
- **Input:** `rounded-xl bg-surface-2 px-3 py-2.5 text-sm text-fg placeholder:text-faint focus:outline-none focus:ring-2 focus:ring-accent-sessions`.
- **Button-Basis:** `components/ui/pressable.tsx` (`<Pressable>`, Framer-Motion `whileTap scale .97`, Spring 400/30).
- **Wiederverwenden:** `components/ui/PageHeader.tsx` (Eyebrow+Titel) und `components/ui/EmptyState.tsx` (leere Ansichten) für neue Seiten.
- **Focus:** `focus:outline-none focus:ring-2 focus:ring-accent-*`. **Hover:** dezent/optional (`transition-colors`) — Feedback primär über Press (Touch-PWA). **Disabled:** `disabled:opacity-40`/`50`.
- Icons: lucide-react, `size={16..22}`, Default-Strichstärke (Akzent-CTA-Icon `strokeWidth={2.5}`).

## Motion
- Konstanten aus `lib/motion.ts`: `EASE_OUT = [0.22,1,0.36,1]`, `SPRING.press/panel/pop`.
- Seitenwechsel über `PageTransition` (fade + y). Eintritte dezent (`opacity` + 8–12px `y`), gestaffelt mit kleinen `delay`-Schritten.
- **prefers-reduced-motion respektieren:** Framer-Motion `useReducedMotion()` (siehe `Splash`, `progress`) — bei reduce keine Auto-/Loop-Animationen.

## HARTE Regeln (nicht verhandelbar)
- **Keine** Tailwind-Arbitrary-Values `[...]` (kein `w-[327px]`, kein `bg-[#123456]`).
- **Keine** Slash-Opacity (`bg-black/50`) — Token oder `rgba(...)` via `style`.
- **Kein** `animate-*` (Tailwind-Keyframes) — Bewegung ausschließlich über Framer-Motion.
- Dynamische Werte → inline `style`, SVG (inkl. `<linearGradient>`/`<filter>`), Framer-Motion oder vordefinierte Utilities (`boxShadow`/`backgroundImage`).
- Eine Komponente pro Datei, `cn()` fürs Klassen-Merging, TypeScript strict (kein `any` ohne Grund).
- UI-Texte **Deutsch**; deutsche Anführungszeichen „…" (kein rohes `"`/`'` im JSX-Text → react/no-unescaped-entities).

## Don'ts — gegen generische AI-Optik
- ❌ **Keine Lila/Violett-Verläufe** als Default-Look (Purple-on-dark = AI-Klischee). Akzent ist Apple-Rot; Violett nur, wenn der Nutzer es als Akzent wählt.
- ❌ **Kein Inter / Roboto / „system default"** für Headings — Display = Space Grotesk, Body = Apple-System.
- ❌ Keine bunten Multi-Color-Gradient-Buttons; CTA ist `bg-strong` (mono), Akzent gezielt einsetzen.
- ❌ Kein Glas-/Neon-Overload, keine Emojis als Icons (lucide nutzen).
- ❌ Keine willkürlichen Schatten/Radien/Spacings — nur die definierten Tokens.
- ❌ Nicht Hover-zentriert denken (Touch-PWA); reduced-motion nie ignorieren.
- ✅ Leitbild: **„edel & dezent" (Apple-clean+)** — ruhige Graphit-Flächen, ein gezielter Akzent, große `font-display`-Zahlen, viel Ruhe.
