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
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          "SF Pro Display",
          "SF Pro Text",
          "Segoe UI",
          "system-ui",
          "sans-serif",
        ],
        mono: [
          "ui-monospace",
          "SFMono-Regular",
          "SF Mono",
          "Menlo",
          "Monaco",
          "monospace",
        ],
        // Display face for big numbers / headings / wordmark (self-hosted, see layout.tsx)
        display: [
          "var(--font-display)",
          "-apple-system",
          "BlinkMacSystemFont",
          "system-ui",
          "sans-serif",
        ],
      },
      colors: {
        // Apple-Fitness multicolor accents. `sessions` is the user-selectable
        // brand accent (CSS var); volume/coverage stay fixed = ring semantics.
        accent: { sessions: "var(--accent)", volume: "#30d158", coverage: "#0a84ff" },
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
      // Soft elevation + subtle accent glows (restrained, "edel & dezent").
      boxShadow: {
        card: "0 1px 2px rgba(0,0,0,.35), 0 10px 28px -16px rgba(0,0,0,.75)",
        "card-lg": "0 2px 6px rgba(0,0,0,.45), 0 22px 48px -22px rgba(0,0,0,.85)",
        "glow-sessions": "0 0 18px -3px rgba(255,55,95,.5)",
        "glow-volume": "0 0 18px -3px rgba(48,209,88,.5)",
        "glow-coverage": "0 0 18px -3px rgba(10,132,255,.5)",
      },
      // Reusable gradients exposed as real utilities (no arbitrary values at call sites).
      backgroundImage: {
        "hero-sheen":
          "linear-gradient(135deg, rgba(255,255,255,.06), rgba(255,255,255,0) 42%)",
        "hero-accent":
          "radial-gradient(125% 90% at 100% 0%, rgba(255,55,95,.12), rgba(255,55,95,0) 60%)",
      },
    },
  },
  plugins: [],
};

export default config;
