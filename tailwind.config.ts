import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Surfaces
        surface: "#131313",
        "surface-dim": "#131313",
        "surface-bright": "#3a3939",
        "surface-lowest": "#0e0e0e",
        "surface-low": "#1c1b1b",
        "surface-container": "#201f1f",
        "surface-high": "#2a2a2a",
        "surface-highest": "#353534",
        // On-surface
        "on-surface": "#e5e2e1",
        "on-surface-variant": "#c4c7c8",
        "inverse-surface": "#e5e2e1",
        "inverse-on-surface": "#313030",
        // Outline
        outline: "#8e9192",
        "outline-variant": "#444748",
        // Primary
        primary: "#ffffff",
        "on-primary": "#2f3131",
        "primary-container": "#e2e2e2",
        "on-primary-container": "#636565",
        // Secondary (blue accent)
        secondary: "#adc6ff",
        "on-secondary": "#002e6a",
        "secondary-container": "#0566d9",
        "on-secondary-container": "#e6ecff",
        // Tertiary (green accent)
        tertiary: "#ffffff",
        "on-tertiary": "#003824",
        "tertiary-container": "#6ffbbe",
        "on-tertiary-container": "#00734e",
        // Semantic
        error: "#ffb4ab",
        "on-error": "#690005",
        "error-container": "#93000a",
        "on-error-container": "#ffdad6",
        // Background
        background: "#131313",
        "on-background": "#e5e2e1",
        // Design system shortcuts
        brand: "#0566d9",
        success: "#10B981",
        warning: "#F59E0B",
        danger: "#EF4444",
        // Card/border
        card: "#1c1b1b",
        border: "#2a2a2a",
      },
      fontFamily: {
        sans: ["Inter", "sans-serif"],
        mono: ["Geist Mono", "monospace"],
        geist: ["Geist", "sans-serif"],
      },
      fontSize: {
        "display-lg": ["48px", { lineHeight: "56px", letterSpacing: "-0.02em", fontWeight: "700" }],
        "headline-lg": ["32px", { lineHeight: "40px", letterSpacing: "-0.01em", fontWeight: "600" }],
        "headline-md": ["24px", { lineHeight: "32px", fontWeight: "600" }],
        "body-lg": ["18px", { lineHeight: "28px", fontWeight: "400" }],
        "body-md": ["16px", { lineHeight: "24px", fontWeight: "400" }],
        "label-md": ["14px", { lineHeight: "20px", letterSpacing: "0.01em", fontWeight: "500" }],
        "label-sm": ["12px", { lineHeight: "16px", letterSpacing: "0.02em", fontWeight: "500" }],
        "mono-data": ["14px", { lineHeight: "20px", fontWeight: "400" }],
      },
      borderRadius: {
        sm: "6px",
        DEFAULT: "8px",
        md: "10px",
        lg: "12px",
        xl: "16px",
        "2xl": "20px",
        full: "9999px",
      },
      spacing: {
        xs: "4px",
        sm: "8px",
        md: "16px",
        lg: "24px",
        xl: "32px",
      },
      boxShadow: {
        card: "0px 1px 3px rgba(0, 0, 0, 0.4)",
        modal: "0px 10px 30px rgba(0, 0, 0, 0.5)",
        glow: "0 0 0 1px rgba(255,255,255,0.08)",
      },
      backdropBlur: {
        glass: "12px",
      },
      keyframes: {
        "fade-in": {
          from: { opacity: "0", transform: "translateY(4px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "slide-in": {
          from: { opacity: "0", transform: "translateX(-8px)" },
          to: { opacity: "1", transform: "translateX(0)" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.2s ease-out",
        "slide-in": "slide-in 0.2s ease-out",
      },
    },
  },
  plugins: [],
};
export default config;
