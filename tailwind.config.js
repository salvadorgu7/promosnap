/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        surface: {
          50: "#f8f9fc",
          100: "#f1f3f8",
          200: "#e4e8f0",
          300: "#cdd3e0",
          400: "#9ca3b8",
          500: "#6b7280",
          600: "#4b5563",
          700: "#374151",
          800: "#1f2937",
          900: "#111827",
        },
        accent: {
          blue: "#2962ff",
          purple: "#7c4dff",
          green: "#00c853",
          red: "#ff1744",
          orange: "#ff9100",
          yellow: "#ffd600",
          cyan: "#00b8d4",
        },
        brand: {
          50: "#e8eaf6",
          100: "#c5cae9",
          200: "#9fa8da",
          300: "#7986cb",
          400: "#5c6bc0",
          500: "#7c4dff",
          600: "#651fff",
          700: "#6200ea",
          800: "#5600d1",
          900: "#4a00b0",
        },
      },
      fontFamily: {
        display: ['"Plus Jakarta Sans"', "system-ui", "sans-serif"],
        body: ['"Inter"', "system-ui", "sans-serif"],
        mono: ['"JetBrains Mono"', "monospace"],
      },
      animation: {
        "fade-in": "fadeIn 0.4s ease-out",
        "slide-up": "slideUp 0.4s ease-out",
        "slide-right": "slideRight 0.4s ease-out",
        "pulse-glow": "pulseGlow 2s ease-in-out infinite",
        shimmer: "shimmer 2s linear infinite",
        float: "float 3s ease-in-out infinite",
        "stagger-1": "slideUp 0.4s ease-out 0.05s both",
        "stagger-2": "slideUp 0.4s ease-out 0.1s both",
        "stagger-3": "slideUp 0.4s ease-out 0.15s both",
        "stagger-4": "slideUp 0.4s ease-out 0.2s both",
        "stagger-5": "slideUp 0.4s ease-out 0.25s both",
        "stagger-6": "slideUp 0.4s ease-out 0.3s both",
        "stagger-7": "slideUp 0.4s ease-out 0.35s both",
        "stagger-8": "slideUp 0.4s ease-out 0.4s both",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        slideRight: {
          "0%": { opacity: "0", transform: "translateX(-12px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        pulseGlow: {
          "0%, 100%": { boxShadow: "0 0 10px rgba(41,98,255,0.15)" },
          "50%": { boxShadow: "0 0 25px rgba(41,98,255,0.3)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-6px)" },
        },
      },
      boxShadow: {
        card: "0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)",
        "card-hover": "0 10px 25px rgba(0,0,0,0.08), 0 4px 10px rgba(0,0,0,0.04)",
        "glow-blue": "0 0 20px rgba(41,98,255,0.15)",
        "glow-green": "0 0 20px rgba(0,200,83,0.15)",
        "glow-purple": "0 0 20px rgba(124,77,255,0.15)",
        "glow-red": "0 0 20px rgba(255,23,68,0.15)",
        glow: "0 0 20px rgba(41,98,255,0.15)",
      },
    },
  },
  plugins: [require("@tailwindcss/typography")],
};
