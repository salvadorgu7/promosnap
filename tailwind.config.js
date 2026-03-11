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
          950: "#0a0a14",
          900: "#12121e",
          850: "#161628",
          800: "#1a1a2e",
          750: "#1f1f38",
          700: "#252540",
          600: "#2f2f50",
          500: "#464670",
          400: "#5e5e88",
          300: "#7878a0",
          200: "#9898b8",
          100: "#c0c0d8",
        },
        accent: {
          blue: "#2962ff",
          purple: "#7c4dff",
          green: "#00e676",
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
          "0%, 100%": { boxShadow: "0 0 10px rgba(41,98,255,0.2)" },
          "50%": { boxShadow: "0 0 25px rgba(41,98,255,0.4)" },
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
        card: "0 1px 3px rgba(0,0,0,0.3), 0 1px 2px rgba(0,0,0,0.2)",
        "card-hover": "0 10px 30px rgba(0,0,0,0.4), 0 4px 10px rgba(0,0,0,0.3)",
        "glow-blue": "0 0 20px rgba(41,98,255,0.3)",
        "glow-green": "0 0 20px rgba(0,230,118,0.3)",
        "glow-purple": "0 0 20px rgba(124,77,255,0.3)",
        "glow-red": "0 0 20px rgba(255,23,68,0.3)",
        glow: "0 0 20px rgba(41,98,255,0.25)",
      },
    },
  },
  plugins: [require("@tailwindcss/typography")],
};
