/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
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
          "base-100": "#f7f8fa",
          "base-200": "#eef1f4",
          "base-300": "#e2e7ee",
          "base-content": "#1f2937",
          primary: "#3b82f6",
          "primary-content": "#0b1220",
          secondary: "#64748b",
          "secondary-content": "#0b1220",
          accent: "#4caf50",
          "accent-content": "#0c1a0f",
          neutral: "#2b3038",
          "neutral-content": "#f7f8fa",
          info: "#0ea5e9",
          success: "#22c55e",
          warning: "#fb8c00",
          error: "#e53935",
        },
      },
      {
        dark: {
          "base-100": "#121417",
          "base-200": "#1a1f24",
          "base-300": "#232b34",
          "base-content": "#e5e7eb",
          primary: "#60a5fa",
          "primary-content": "#0b1220",
          secondary: "#94a3b8",
          "secondary-content": "#0b1220",
          accent: "#4caf50",
          "accent-content": "#0c1a0f",
          neutral: "#2a313a",
          "neutral-content": "#f7f8fa",
          info: "#38bdf8",
          success: "#4ade80",
          warning: "#fb8c00",
          error: "#e53935",
        },
      },
    ],
  },
};
