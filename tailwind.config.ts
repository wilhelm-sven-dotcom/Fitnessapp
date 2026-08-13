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
        // Eine Familie fürs System: Archivo (variable, mit Weiten-Achse für
        // Scoreboard-Ziffern via .stretch-display). Fallback: System-Grotesk.
        sans: [
          "var(--font-body)",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "system-ui",
          "sans-serif",
        ],
        body: [
          "var(--font-body)",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "system-ui",
          "sans-serif",
        ],
        // Mono ausschließlich für Messwerte/Readouts — JetBrains Mono.
        mono: [
          "var(--font-mono)",
          "ui-monospace",
          "SFMono-Regular",
          "SF Mono",
          "Menlo",
          "Monaco",
          "monospace",
        ],
        display: [
          "var(--font-display)",
          "-apple-system",
          "BlinkMacSystemFont",
          "system-ui",
          "sans-serif",
        ],
      },
      colors: {
        // Bereichs-Farbcode (Wegleitsystem München ’72): sessions = Blau,
        // volume = Grün, coverage = Orange. Alles CSS-Vars → themefähig.
        accent: {
          sessions: "var(--accent)",
          volume: "var(--gruen)",
          coverage: "var(--orange)",
        },
        // ATLAS/Coach-Bereich = Orange (gleiches Feld wie coverage/live).
        coach: "var(--orange)",
        "accent-2": "var(--accent-2)",
        live: "var(--live)",
        // Semantic status (Volumen-Balken, Coach-Banner, Readiness)
        status: {
          under: "var(--accent)",
          in: "var(--gruen)",
          over: "var(--gelb)",
          danger: "var(--rot)",
        },
        // Material/elevation surfaces — theme-driven via CSS variables.
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
        strong: "var(--strong)",
        "on-strong": "var(--on-strong)",
        // Tinte auf akzentgefüllten Flächen (hell: Weiß, dunkel: Anthrazit).
        "on-accent": "var(--on-accent)",
        // Tinte auf JEDEM satten Farbfeld (Orange/Grün/Gelb/Rot-Flächen).
        "on-color": "var(--ink-on-color)",
        // Akzent als Vordergrund-Marke (Text/Icon) — lesbar auf dem Grund.
        "accent-ink": "var(--accent-ink)",
      },
      borderRadius: {
        card: "var(--radius-card)",
        pill: "var(--radius-pill)",
      },
      // Flaches Modul: Hairline trägt die Trennung, Schatten bleibt leise.
      boxShadow: {
        card: "var(--panel-shadow)",
        "card-lg": "var(--panel-shadow-lg)",
      },
      backgroundImage: {
        panel: "var(--panel-bg)",
      },
    },
  },
  plugins: [],
};

export default config;
