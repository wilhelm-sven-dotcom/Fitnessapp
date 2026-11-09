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
        // „spotter“: Bricolage Grotesque für Titel, Zahlen, Knöpfe und
        // Sticker (`font-display`), Onest für Text. `font-mono` bleibt als
        // Klasse gültig und ist Onest (Ziffern über `tabular-nums`).
        sans: ["var(--font-body)", "Onest", "system-ui", "sans-serif"],
        body: ["var(--font-body)", "Onest", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "Onest", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "Bricolage Grotesque", "system-ui", "sans-serif"],
      },
      // Lesbare Mindestgrößen: Labels 12 px, Meta 11 px, 10 px nur für
      // Diagramm-Beschriftung. Keine Arbitrary-Values im JSX.
      fontSize: {
        "2xs": ["12px", { lineHeight: "1.4" }],
        "3xs": ["12px", { lineHeight: "1.35" }],
        "4xs": ["11px", { lineHeight: "1.3" }],
        "5xs": ["10px", { lineHeight: "1.25" }],
        titel: ["28px", { lineHeight: "1.1" }],
        readout: ["44px", { lineHeight: "1" }],
        "readout-lg": ["64px", { lineHeight: "0.95" }],
      },
      // Eine Sperrung für Versal-Labels.
      letterSpacing: {
        label: "0.08em",
      },
      colors: {
        // Hauptaktion = Elektroblau (accent), gedrückt, Schrift darauf.
        accent: {
          DEFAULT: "var(--accent)",
          press: "var(--accent-press)",
          ink: "var(--accent-ink)",
        },
        // Funktionsrollen.
        info: "var(--info)",
        fokus: "var(--fokus)",
        // Rekord: als Schrift (DEFAULT), als Fläche, Schrift auf der Fläche.
        rekord: {
          DEFAULT: "var(--rekord)",
          flaeche: "var(--rekord-flaeche)",
          auf: "var(--auf-rekord)",
        },
        // Sonnengelb für Sticker und Markierungen, Schrift darauf.
        sonne: {
          DEFAULT: "var(--sonne)",
          auf: "var(--auf-sonne)",
        },
        // Dicker Rand an Karten, Knöpfen, Chips und Kacheln.
        rand: "var(--rand)",
        erfolg: "var(--erfolg)",
        warnung: "var(--warnung)",
        gefahr: "var(--gefahr)",
        // Muskel-Stufen I–IV (diskret, keine Verläufe).
        stufe: {
          1: "var(--stufe-1)",
          2: "var(--stufe-2)",
          3: "var(--stufe-3)",
          4: "var(--stufe-4)",
        },
        // Wettkampf-Scheibenfarben (Lastcodierung), modusgleich.
        iwf: {
          rot: "var(--iwf-rot)",
          blau: "var(--iwf-blau)",
          gelb: "var(--iwf-gelb)",
          gruen: "var(--iwf-gruen)",
        },
        // Status (Volumen-Balken, Coach-Hinweise, Tagesform).
        status: {
          under: "var(--accent)",
          in: "var(--erfolg)",
          over: "var(--warnung)",
          danger: "var(--gefahr)",
        },
        surface: {
          0: "var(--base)",
          1: "var(--card)",
          2: "var(--surface-2)",
          3: "var(--line)",
        },
        fg: "var(--fg)",
        muted: "var(--muted)",
        faint: "var(--faint)",
        line: "var(--line)",
        "line-card": "var(--line-card)",
        strong: "var(--strong)",
        "on-strong": "var(--on-strong)",
        "on-accent": "var(--on-accent)",
        "on-color": "var(--ink-on-color)",
      },
      borderRadius: {
        card: "var(--radius-card)",
        inner: "var(--radius-inner)",
        kachel: "var(--radius-kachel)",
        pill: "var(--radius-pill)",
        xs: "var(--radius-xs)",
      },
      // Der dicke Rand (2,5 px) — mit `border-rand` als Farbe.
      borderWidth: {
        dick: "2.5px",
      },
      // Der EINE erlaubte Schatten: hart versetzt, nie weich.
      boxShadow: {
        hart: "4px 4px 0 var(--schatten)",
        "hart-sm": "3px 3px 0 var(--schatten)",
      },
    },
  },
  plugins: [],
};

export default config;
