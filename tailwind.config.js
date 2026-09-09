/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#09090b",
        surface: "#121215",
        surfaceBorder: "#27272a",
        yesGreen: "#10b981",
        noRed: "#f43f5e"
      }
    },
  },
  plugins: [],
};