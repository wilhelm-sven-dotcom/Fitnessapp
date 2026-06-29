import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        // Body face — driven by the active skin (--font-body): Archivo (blueprint)
        // or Sora (tactile). Falls back to the system stack.
        sans: [
          "var(--font-body)",
          "-apple-system",
          "BlinkMacSystemFont",
          "SF Pro Display",
          "SF Pro Text",
          "Segoe UI",
          "system-ui",
          "sans-serif",
        ],
        // Mono face for labels / data / readouts — JetBrains Mono in both skins.
        mono: [
          "var(--font-mono)",
          "ui-monospace",
          "SFMono-Regular",
          "SF Mono",
          "Menlo",
          "Monaco",
          "monospace",
        ],
        // Display face for big numbers / headings / wordmark (skin --font-display).
        display: [
          "var(--font-display)",
          "-apple-system",
          "BlinkMacSystemFont",
          "system-ui",
          "sans-serif",
        ],
      },
      colors: {
        // Apple-Fitness multicolor accents. `sessions` is the skin brand accent
        // (CSS var); volume/coverage stay fixed = ring semantics.
        accent: { sessions: "var(--accent)", volume: "#30d158", coverage: "#0a84ff" },
        // Skin identity tokens: secondary/structural tint + the "today" highlight.
        "accent-2": "var(--accent-2)",
        live: "var(--live)",
        // Semantic status (volume bars, coach banners, readiness)
        status: { under: "#0a84ff", in: "#30d158", over: "#ff9f0a", danger: "#ff375f" },
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
      },
      // Corner radius is a skin token (blueprint = sharp, tactile = rounded).
      borderRadius: {
        card: "var(--radius-card)",
        pill: "var(--radius-pill)",
      },
      // Panel elevation is skin-driven (blueprint = flat hairline, tactile = raised).
      boxShadow: {
        card: "var(--panel-shadow)",
        "card-lg": "var(--panel-shadow-lg)",
        "glow-sessions": "0 0 18px -3px rgba(255,55,95,.5)",
        "glow-volume": "0 0 18px -3px rgba(48,209,88,.5)",
        "glow-coverage": "0 0 18px -3px rgba(10,132,255,.5)",
      },
      // Reusable gradients exposed as real utilities (no arbitrary values at call sites).
      backgroundImage: {
        panel: "var(--panel-bg)",
        "hero-sheen": "var(--hero-sheen)",
        "hero-accent":
          "radial-gradient(125% 90% at 100% 0%, rgba(255,55,95,.12), rgba(255,55,95,0) 60%)",
      },
    },
  },
  plugins: [],
};

export default config;
