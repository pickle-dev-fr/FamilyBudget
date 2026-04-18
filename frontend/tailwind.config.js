/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Helvetica Neue', 'sans-serif'],
      },
      colors: {
        bg: "hsl(var(--b1) / <alpha-value>)",
        "bg-soft": "hsl(var(--b2) / <alpha-value>)",
        text: "hsl(var(--bc) / <alpha-value>)",
        accent: "hsl(var(--a) / <alpha-value>)",
        danger: "hsl(var(--er) / <alpha-value>)",
        orange: "hsl(var(--wa) / <alpha-value>)",
      },
    },
  },
  plugins: [require("daisyui")],
  daisyui: {
    themes: [
      {
        light: {
          "base-100": "#ffffff",
          "base-200": "#f4f6fa",
          "base-300": "#e8edf5",
          "base-content": "#1a2235",
          primary: "#6366f1",
          "primary-content": "#ffffff",
          secondary: "#64748b",
          "secondary-content": "#ffffff",
          accent: "#10b981",
          "accent-content": "#ffffff",
          neutral: "#1e293b",
          "neutral-content": "#f8fafc",
          info: "#0ea5e9",
          success: "#10b981",
          warning: "#f59e0b",
          error: "#ef4444",
        },
      },
      {
        dark: {
          "base-100": "#192132",
          "base-200": "#0f1824",
          "base-300": "#24334a",
          "base-content": "#dce6f5",
          primary: "#818cf8",
          "primary-content": "#1e1b4b",
          secondary: "#94a3b8",
          "secondary-content": "#0f172a",
          accent: "#34d399",
          "accent-content": "#064e3b",
          neutral: "#1e293b",
          "neutral-content": "#f1f5f9",
          info: "#38bdf8",
          success: "#34d399",
          warning: "#fbbf24",
          error: "#f87171",
        },
      },
    ],
  },
};
