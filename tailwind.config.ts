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
        // „Regionen“: Archivo trägt alles. `font-display` setzt zusätzlich
        // die breite Schnittbreite (globals.css), `font-mono` ist Archivo.
        sans: ["var(--font-body)", "Archivo", "system-ui", "sans-serif"],
        body: ["var(--font-body)", "Archivo", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "Archivo", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "Archivo", "system-ui", "sans-serif"],
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
        // Hauptaktion = Tinte (accent), gedrückt, Schrift darauf.
        accent: {
          DEFAULT: "var(--accent)",
          press: "var(--accent-press)",
          ink: "var(--accent-ink)",
        },
        // Funktionsrollen.
        info: "var(--info)",
        fokus: "var(--fokus)",
        rekord: "var(--rekord)",
        erfolg: "var(--erfolg)",
        warnung: "var(--warnung)",
        gefahr: "var(--gefahr)",
        // Körperregionen: Marke/Schrift, Fläche, Schrift auf Fläche.
        region: {
          beine: "var(--beine)",
          druck: "var(--druck)",
          zug: "var(--zug)",
          rumpf: "var(--rumpf)",
          cardio: "var(--cardio)",
          "beine-flaeche": "var(--beine-flaeche)",
          "druck-flaeche": "var(--druck-flaeche)",
          "zug-flaeche": "var(--zug-flaeche)",
          "rumpf-flaeche": "var(--rumpf-flaeche)",
          "cardio-flaeche": "var(--cardio-flaeche)",
          "auf-beine": "var(--auf-beine)",
          "auf-druck": "var(--auf-druck)",
          "auf-zug": "var(--auf-zug)",
          "auf-rumpf": "var(--auf-rumpf)",
          "auf-cardio": "var(--auf-cardio)",
        },
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
        pill: "var(--radius-pill)",
        xs: "var(--radius-xs)",
      },
    },
  },
  plugins: [],
};

export default config;
