/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        bg: "#1e1e1e",
        "bg-soft": "#2a2a2a",
        text: "#ffffff",
        accent: "#4caf50",
        danger: "#e53935",
        orange: "#fb8c00",
      },
    },
  },
  plugins: [require("daisyui")],
  daisyui: {
    themes: ["dark", "light"],
  },
};
