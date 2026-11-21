import type { Config } from "tailwindcss";

// Tokens mirror design/project/Kit.dc.html. Values live in CSS variables
// (globals.css) so the .dark theme can swap them.
const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        pink: { 500: "#FF8FB8", 700: "var(--pink-700)" },
        lilac: { 400: "#C9B6FF" },
        sky: { 300: "#A8D8FF" },
        cream: { 50: "var(--cream-50)" },
        ink: { 900: "var(--ink-900)", 500: "var(--ink-500)" },
        surface: "var(--surface)",
        line: "var(--line)",
      },
      fontFamily: {
        disp: ["var(--font-fredoka)", "ui-rounded", "system-ui", "sans-serif"],
        sans: ["var(--font-plex-kr)", "system-ui", "sans-serif"],
        sig: ["var(--font-caveat)", "cursive"],
      },
      borderRadius: { card: "24px", tile: "16px" },
      boxShadow: {
        pink: "var(--shadow)",
        glow: "var(--glow)",
      },
      transitionTimingFunction: { spring: "cubic-bezier(.34,1.56,.64,1)" },
    },
  },
  plugins: [],
};

export default config;
