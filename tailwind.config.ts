import type { Config } from "tailwindcss";

const config: Config = {
  // Theme läuft über data-theme auf <html> (siehe lib/theme.ts) — dark: nur
  // über diesen Selector, nie über eine .dark-Klasse.
  darkMode: ["selector", '[data-theme="dark"]'],
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        // Platte 311: IBM Plex Mono trägt ALLE UI inkl. Body (Messgeräte-
        // Charakter); Old Standard TT nur für Benanntes (Titel, Buchsatz).
        sans: [
          "var(--font-body)",
          "IBM Plex Mono",
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "monospace",
        ],
        body: [
          "var(--font-body)",
          "IBM Plex Mono",
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "monospace",
        ],
        mono: [
          "var(--font-mono)",
          "IBM Plex Mono",
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "monospace",
        ],
        display: ["var(--font-display)", "Old Standard TT", "Georgia", "serif"],
      },
      // Beschriftungsgrade des Labors (Basis-Skala bleibt daneben gültig):
      // 2xs..5xs = Labels/Kicker/Nav/Kadernummern, titel = Karten-Titel
      // kursiv, readout(-lg) = große Messwerte. KEINE Arbitrary-Values im JSX.
      fontSize: {
        "2xs": ["11px", { lineHeight: "1.35" }],
        "3xs": ["10px", { lineHeight: "1.3" }],
        "4xs": ["9px", { lineHeight: "1.25" }],
        "5xs": ["8px", { lineHeight: "1.2" }],
        titel: ["28px", { lineHeight: "1.1" }],
        readout: ["44px", { lineHeight: "1" }],
        "readout-lg": ["56px", { lineHeight: "1" }],
      },
      // Gesperrte Versalien (typografisch „gesperrt") — vier Stufen statt
      // tracking-[.3em]-Arbitraries: Chips/Meta · Buttons/Labels · Kicker/
      // Katalogschilder · Stempel/Hero-Kicker (Werte aus dem Handoff).
      letterSpacing: {
        gesperrt: "0.14em",
        "gesperrt-2": "0.24em",
        "gesperrt-3": "0.28em",
        "gesperrt-4": "0.32em",
      },
      colors: {
        // Funktionsfarben Platte 311: Siegellack (accent) = Aktiv/CTA,
        // Cyanotypie = Daten/Hypothese, Messing = Rekord. Die Bereichs-
        // Aliasse (sessions/volume/coverage/coach/live) zeigen über die
        // CSS-Vars auf diese Funktionsfarben, bis alle Nutzstellen auf die
        // neuen Namen umgezogen sind.
        accent: {
          sessions: "var(--accent)",
          volume: "var(--gruen)",
          coverage: "var(--orange)",
        },
        coach: "var(--orange)",
        "accent-2": "var(--accent-2)",
        live: "var(--live)",
        cyanotypie: "var(--cyanotypie)",
        messing: "var(--messing)",
        // Button-Down-Fläche: Siegellack 8 % dunkler, harter Wechsel.
        "accent-press": "var(--accent-press)",
        blaupause: "var(--blaupause)",
        "kreide-blau": "var(--kreide-blau)",
        // Myologie-Quartile (diskrete Stufen I–IV, keine Verläufe).
        stufe: {
          1: "var(--stufe-1)",
          2: "var(--stufe-2)",
          3: "var(--stufe-3)",
          4: "var(--stufe-4)",
        },
        // IWF-Scheibenfarben — Lastcodierung, in beiden Modi identisch.
        iwf: {
          rot: "var(--iwf-rot)",
          blau: "var(--iwf-blau)",
          gelb: "var(--iwf-gelb)",
          gruen: "var(--iwf-gruen)",
        },
        // Semantic status (Volumen-Balken, Coach-Banner, Readiness)
        status: {
          under: "var(--accent)",
          in: "var(--gruen)",
          over: "var(--gelb)",
          danger: "var(--rot)",
        },
        // Material surfaces — theme-driven via CSS variables.
        surface: {
          0: "var(--base)",
          1: "var(--card)",
          2: "var(--surface-2)",
          3: "var(--line)",
        },
        // Semantic foreground/line tokens (flip with theme).
        fg: "var(--fg)",
        muted: "var(--muted)",
        faint: "var(--faint)",
        line: "var(--line)",
        // Faden AUF der Kartenfläche (Raster, Kader-Rahmen).
        "line-card": "var(--line-card)",
        strong: "var(--strong)",
        "on-strong": "var(--on-strong)",
        // Tinte auf akzentgefüllten Flächen (hell: Grund, dunkel: Kollodium).
        "on-accent": "var(--on-accent)",
        // Tinte auf JEDEM satten Farbfeld.
        "on-color": "var(--ink-on-color)",
        // Akzent als Vordergrund-Marke (Text/Icon) — lesbar auf dem Grund.
        "accent-ink": "var(--accent-ink)",
      },
      borderRadius: {
        card: "var(--radius-card)",
        pill: "var(--radius-pill)",
        xs: "var(--radius-xs)",
      },
      // Das Labor wirft keine Schatten — die Vars sind auf `none` gestellt;
      // die Utilities bleiben, bis alle Nutzstellen umgezogen sind.
      boxShadow: {
        card: "var(--panel-shadow)",
        "card-lg": "var(--panel-shadow-lg)",
      },
    },
  },
  plugins: [],
};

export default config;
