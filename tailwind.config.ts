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
      },
      colors: {
        // Apple-Fitness multicolor accents (domain metrics)
        accent: { sessions: "#ff375f", volume: "#30d158", coverage: "#0a84ff" },
        // Semantic status (volume bars, coach banners, readiness)
        status: { under: "#0a84ff", in: "#30d158", over: "#ff9f0a", danger: "#ff375f" },
        // Material/elevation surfaces
        surface: { 0: "#0a0a0a", 1: "#161618", 2: "#1f1f23", 3: "#2a2a30" },
      },
    },
  },
  plugins: [],
};

export default config;
